import { headers } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function getContext() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { error: NextResponse.json({ code: 'AUTH_REQUIRED', message: 'Sign in to manage leads.' }, { status: 401 }) }
  const membership = await pool.query('SELECT "organizationId", "role" FROM "OrganizationMember" WHERE "authUserId" = $1 AND "status" = $2 LIMIT 1', [session.user.id, 'ACTIVE'])
  if (!membership.rows[0]) return { error: NextResponse.json({ code: 'MEMBERSHIP_NOT_FOUND', message: 'Your account is not linked to an organization.' }, { status: 403 }) }
  return { session, member: membership.rows[0] }
}

export async function GET() {
  const context = await getContext()
  if ('error' in context) return context.error
  const result = await pool.query('SELECT "id", "name", "company", "email", "stage", "value", "createdAt" FROM "Opportunity" WHERE "organizationId" = $1 AND "ownerId" = $2 ORDER BY "createdAt" DESC', [context.member.organizationId, context.session.user.id])
  return NextResponse.json({ leads: result.rows })
}

export async function POST(request: Request) {
  const context = await getContext()
  if ('error' in context) return context.error
  const body = await request.json()
  const name = String(body.name || '').trim()
  const company = String(body.company || '').trim()
  const email = String(body.email || '').trim()
  const value = Number(body.value || 0)
  if (!name || !company || !email || !Number.isFinite(value) || value < 0) return NextResponse.json({ code: 'INVALID_LEAD_INPUT', message: 'Name, company, email, and a valid value are required.' }, { status: 400 })
  const result = await pool.query('INSERT INTO "Opportunity" ("id", "organizationId", "name", "company", "email", "value", "ownerId") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "id", "name", "company", "email", "stage", "value"', [randomUUID(), context.member.organizationId, name, company, email, value, context.session.user.id])
  return NextResponse.json({ lead: result.rows[0] }, { status: 201 })
}
