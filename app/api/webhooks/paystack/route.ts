import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { parsePaystackMetadata } from '@/lib/paystack'

type PaystackEvent = {
  event?: string
  data?: {
    metadata?: unknown
    customer?: { customer_code?: string }
    amount?: number
    currency?: string
    subscription_code?: string
    subscription?: { subscription_code?: string }
  }
}

function isValidSignature(body: string, signature: string, secret: string) {
  const expected = createHmac('sha512', secret).update(body).digest()
  let received: Buffer
  try {
    received = Buffer.from(signature, 'hex')
  } catch {
    return false
  }
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  const signature = request.headers.get('x-paystack-signature') || ''
  const body = await request.text()
  if (!secret || !signature || !isValidSignature(body, signature, secret)) {
    return NextResponse.json({ error: 'Invalid Paystack signature.' }, { status: 401 })
  }

  let event: PaystackEvent
  try {
    event = JSON.parse(body) as PaystackEvent
  } catch {
    return NextResponse.json({ error: 'Invalid event payload.' }, { status: 400 })
  }

  const data = event.data || {}
  const metadata = parsePaystackMetadata(data.metadata)
  const organizationId = typeof metadata.organizationId === 'string' ? metadata.organizationId : ''
  const userId = typeof metadata.userId === 'string' ? metadata.userId : ''
  const customerCode = data.customer?.customer_code || null
  const subscriptionCode = data.subscription_code || data.subscription?.subscription_code || null

  try {
    if (event.event === 'charge.success') {
      if (organizationId && userId) {
        const updated = await pool.query(
          'UPDATE "Subscription" SET "status" = $1, "provider" = $2, "providerCustomerId" = COALESCE($3, "providerCustomerId"), "updatedAt" = NOW() WHERE "organizationId" = $4 AND "amountMinor" = $5 AND "currency" = $6',
          ['ACTIVE', 'paystack', customerCode, organizationId, data.amount, data.currency],
        )
        if (updated.rowCount === 0) return NextResponse.json({ error: 'Matching subscription is not registered yet.' }, { status: 500 })
        await pool.query('UPDATE "Organization" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2', ['ACTIVE', organizationId])
        await pool.query('UPDATE "OrganizationMember" SET "status" = $1 WHERE "organizationId" = $2 AND "authUserId" = $3 AND "role" = $4', ['ACTIVE', organizationId, userId, 'ADMIN'])
      } else if (customerCode) {
        await pool.query(
          'UPDATE "Subscription" SET "status" = $1, "updatedAt" = NOW() WHERE "provider" = $2 AND "providerCustomerId" = $3',
          ['ACTIVE', 'paystack', customerCode],
        )
      }
    } else if (event.event === 'subscription.create' && subscriptionCode && customerCode) {
      const updated = await pool.query(
        'UPDATE "Subscription" s SET "providerSubscriptionId" = $1, "providerCustomerId" = $2, "status" = $3, "updatedAt" = NOW() WHERE s."provider" = $4 AND (s."providerCustomerId" = $2 OR s."organizationId" = $5)',
        [subscriptionCode, customerCode, 'ACTIVE', 'paystack', organizationId || null],
      )
      if (updated.rowCount === 0) return NextResponse.json({ error: 'Subscription is not registered yet.' }, { status: 500 })
    } else if (event.event === 'invoice.payment_failed' && subscriptionCode) {
      await pool.query(
        'UPDATE "Subscription" SET "status" = $1, "updatedAt" = NOW() WHERE "provider" = $2 AND "providerSubscriptionId" = $3',
        ['PAST_DUE', 'paystack', subscriptionCode],
      )
    } else if (event.event === 'subscription.disable' && subscriptionCode) {
      await pool.query(
        'UPDATE "Subscription" SET "status" = $1, "updatedAt" = NOW() WHERE "provider" = $2 AND "providerSubscriptionId" = $3',
        ['CANCELLED', 'paystack', subscriptionCode],
      )
    } else if (event.event === 'subscription.not_renew' && subscriptionCode) {
      await pool.query(
        'UPDATE "Subscription" SET "status" = $1, "updatedAt" = NOW() WHERE "provider" = $2 AND "providerSubscriptionId" = $3',
        ['NON_RENEWING', 'paystack', subscriptionCode],
      )
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[paystack] Webhook processing failed:', error)
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 })
  }
}
