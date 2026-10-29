import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { parsePaystackMetadata, verifyPaystackTransaction } from '@/lib/paystack'

function getAppUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : new URL(request.url).origin)
  ).replace(/\/$/, '')
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const reference = url.searchParams.get('reference') || url.searchParams.get('trxref')
  const appUrl = getAppUrl(request)
  const failureUrl = new URL('/onboarding?payment=failed', appUrl)
  if (!reference) return NextResponse.redirect(failureUrl)

  try {
    const transaction = await verifyPaystackTransaction(reference)
    const metadata = parsePaystackMetadata(transaction.metadata)
    const organizationId = typeof metadata.organizationId === 'string' ? metadata.organizationId : ''
    const userId = typeof metadata.userId === 'string' ? metadata.userId : ''
    const plan = metadata.plan
    const expectedAmount = plan === 'STARTER' ? 500000 : plan === 'GROWTH' ? 700000 : 0

    if (
      transaction.status !== 'success' ||
      transaction.reference !== reference ||
      transaction.currency !== 'NGN' ||
      transaction.amount !== expectedAmount ||
      !organizationId ||
      !userId
    ) {
      return NextResponse.redirect(failureUrl)
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const membership = await client.query(
        'SELECT o."id", o."plan", m."authUserId" FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId" = o."id" WHERE o."id" = $1 AND m."authUserId" = $2 AND m."role" = $3 FOR UPDATE OF o, m',
        [organizationId, userId, 'ADMIN'],
      )
      const organization = membership.rows[0]
      if (!organization || organization.plan !== plan) {
        await client.query('ROLLBACK')
        return NextResponse.redirect(failureUrl)
      }

      const subscription = await client.query(
        'UPDATE "Subscription" SET "status" = $1, "provider" = $2, "providerCustomerId" = COALESCE($3, "providerCustomerId"), "updatedAt" = NOW() WHERE "organizationId" = $4 AND "provider" = $2 AND "amountMinor" = $5',
        ['ACTIVE', 'paystack', transaction.customer?.customer_code || null, organizationId, expectedAmount],
      )
      if (subscription.rowCount !== 1) {
        await client.query('ROLLBACK')
        return NextResponse.redirect(failureUrl)
      }

      await client.query('UPDATE "Organization" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2', ['ACTIVE', organizationId])
      await client.query('UPDATE "OrganizationMember" SET "status" = $1 WHERE "organizationId" = $2 AND "authUserId" = $3', ['ACTIVE', organizationId, userId])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    return NextResponse.redirect(new URL('/admin?onboarding=success', appUrl))
  } catch (error) {
    console.error('[paystack] Payment verification failed:', error)
    return NextResponse.redirect(failureUrl)
  }
}
