import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { getOrCreateMonthlyPlan, initializePaystackTransaction } from '@/lib/paystack'

function getPlan(count: number) {
  if (count < 10) return { plan: 'FREE' as const, amount: 0 }
  if (count <= 30) return { plan: 'STARTER' as const, amount: 500000 }
  if (count <= 100) return { plan: 'GROWTH' as const, amount: 700000 }
  return { plan: 'CUSTOM' as const, amount: 0 }
}

function getAppUrl(request: Request) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : null)

  if (configuredUrl) return configuredUrl.replace(/\/$/, '')
  if (process.env.NODE_ENV !== 'production') return request.headers.get('origin') || 'http://localhost:3000'
  throw new Error('Set NEXT_PUBLIC_APP_URL to your production site URL.')
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Sign in before setting up your workspace.' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const companyName = String(body.companyName || '').trim()
    const industry = String(body.industry || '').trim()
    const staffCount = Number(body.staffCount)
    if (!companyName || !industry || !Number.isInteger(staffCount) || staffCount < 1) {
      return NextResponse.json({ error: 'Enter your company, industry, and a valid staff count.' }, { status: 400 })
    }

    const selected = getPlan(staffCount)
    const primaryGoal = String(body.goal || '').trim()
    const monthlyProjection = String(body.projection || '').trim()
    const slug = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`
    const organizationId = crypto.randomUUID()
    const now = new Date()
    const monthLater = new Date(now)
    monthLater.setMonth(monthLater.getMonth() + 1)
    const isFree = selected.plan === 'FREE'
    const isCustom = selected.plan === 'CUSTOM'
    const status = isFree ? 'ACTIVE' : 'PENDING'

    let checkoutUrl: string | undefined
    if (!isFree && !isCustom) {
      const planCode = await getOrCreateMonthlyPlan(selected.plan, selected.amount)
      const reference = `DARA-${crypto.randomUUID()}`
      const appUrl = getAppUrl(request)
      const checkout = await initializePaystackTransaction({
        email: session.user.email,
        planCode,
        reference,
        callbackUrl: `${appUrl}/api/payments/paystack/callback`,
        metadata: {
          organizationId,
          userId: session.user.id,
          plan: selected.plan,
          companyName,
        },
      })
      checkoutUrl = checkout.authorization_url
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        'INSERT INTO "Organization" ("id", "name", "slug", "contactEmail", "industry", "size", "staffCount", "primaryGoal", "monthlyProjection", "status", "plan") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [organizationId, companyName, slug, session.user.email, industry, String(staffCount), staffCount, primaryGoal, monthlyProjection, status, selected.plan],
      )
      await client.query(
        'INSERT INTO "OrganizationMember" ("id", "organizationId", "authUserId", "role", "status") VALUES ($1,$2,$3,$4,$5)',
        [crypto.randomUUID(), organizationId, session.user.id, 'ADMIN', status],
      )
      if (!isFree && !isCustom) {
        await client.query(
          'INSERT INTO "Subscription" ("id", "organizationId", "plan", "billingInterval", "amountMinor", "currency", "status", "trialStartedAt", "trialEndsAt", "currentPeriodStart", "currentPeriodEnd", "provider", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$8,$9,$10,$8,$8)',
          [crypto.randomUUID(), organizationId, selected.plan, 'MONTHLY', selected.amount, 'NGN', 'PENDING', now, monthLater, 'paystack'],
        )
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    if (checkoutUrl) return NextResponse.json({ checkoutUrl })
    return NextResponse.json({ ok: true, plan: selected.plan, organizationId, contactSales: isCustom })
  } catch (error) {
    console.error('[onboarding] Could not create workspace:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'We could not create your workspace.' },
      { status: 500 },
    )
  }
}
