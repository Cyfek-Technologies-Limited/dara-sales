import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

const plans = {
  TEAM: { amount: 500000, label: 'Sequoia Team' },
  GROWTH: { amount: 700000, label: 'Sequoia Growth' },
} as const

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: 'Sign in as an organization admin.' } }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const plan = body.plan as keyof typeof plans
  if (!plans[plan]) return NextResponse.json({ error: { code: 'INVALID_PLAN', message: 'Choose a valid upgrade plan.' } }, { status: 400 })

  const result = await pool.query(`SELECT o."id", o."name", o."plan", o."staffCount" FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId" = o."id" WHERE m."authUserId" = $1 AND m."role" = 'ADMIN' LIMIT 1`, [session.user.id])
  const organization = result.rows[0]
  if (!organization) return NextResponse.json({ error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Your admin account is not linked to an organization.' } }, { status: 404 })
  if (organization.plan === plan) return NextResponse.json({ error: { code: 'PLAN_ALREADY_ACTIVE', message: 'That plan is already active.' } }, { status: 409 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
  const origin = request.headers.get('origin') || process.env.V0_RUNTIME_URL || 'http://localhost:3000'
  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price_data: { currency: 'ngn', product_data: { name: plans[plan].label, description: `${plan === 'TEAM' ? '10–30' : '31–100'} staff seats` }, unit_amount: plans[plan].amount, recurring: { interval: 'month' } }, quantity: 1 }],
    success_url: `${origin}/admin?upgrade=success&plan=${plan}`,
    cancel_url: `${origin}/admin?upgrade=cancelled`,
    customer_email: session.user.email,
    metadata: { organizationId: organization.id, plan, userId: session.user.id },
  })
  return NextResponse.json({ url: checkout.url })
}
