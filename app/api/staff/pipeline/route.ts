import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ code: 'AUTH_REQUIRED', message: 'Sign in to view your pipeline.' }, { status: 401 })
  const membership = await pool.query('SELECT "organizationId" FROM "OrganizationMember" WHERE "authUserId" = $1 AND "status" = $2 LIMIT 1', [session.user.id, 'ACTIVE'])
  if (!membership.rows[0]) return NextResponse.json({ code: 'MEMBERSHIP_NOT_FOUND', message: 'Your account is not linked to an organization.' }, { status: 403 })
  const result = await pool.query('SELECT "id", "name", "company", "email", "website", "companyAddress", "phone", "stage", "createdAt", "updatedAt" FROM "Opportunity" WHERE "organizationId" = $1 AND "ownerId" = $2 ORDER BY "createdAt" DESC', [membership.rows[0].organizationId, session.user.id])
  return NextResponse.json({ leads: result.rows })
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ code: 'AUTH_REQUIRED', message: 'Sign in to update your pipeline.' }, { status: 401 })
  const body = await request.json()
  const stage = String(body.stage || '')
  if (!body.id || !['LEAD', 'PROSPECT', 'CLIENT'].includes(stage)) return NextResponse.json({ code: 'INVALID_STAGE', message: 'Choose Lead, Prospect, or Client.' }, { status: 400 })
  const membership = await pool.query('SELECT "organizationId" FROM "OrganizationMember" WHERE "authUserId" = $1 AND "status" = $2 LIMIT 1', [session.user.id, 'ACTIVE'])
  const result = await pool.query('UPDATE "Opportunity" SET "stage" = $1, "updatedAt" = NOW() WHERE "id" = $2 AND "organizationId" = $3 AND "ownerId" = $4 RETURNING "id", "stage"', [stage, body.id, membership.rows[0]?.organizationId, session.user.id])
  if (!result.rows[0]) return NextResponse.json({ code: 'LEAD_NOT_FOUND', message: 'That record is not in your pipeline.' }, { status: 404 })
  return NextResponse.json({ lead: result.rows[0] })
}
