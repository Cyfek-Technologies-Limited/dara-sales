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
  const result = await pool.query('SELECT "id", "name", "company", "email", "website", "companyAddress", "contactAddress", "phone", "stage", "createdAt" FROM "Opportunity" WHERE "organizationId" = $1 AND "ownerId" = $2 ORDER BY "createdAt" DESC', [context.member.organizationId, context.session.user.id])
  return NextResponse.json({ leads: result.rows })
}

export async function POST(request: Request) {
  const context = await getContext()
  if ('error' in context) return context.error
  const body = await request.json()
  const name = String(body.name || '').trim()
  const company = String(body.company || '').trim()
  const email = String(body.email || '').trim()
  const website = String(body.website || '').trim()
  const companyAddress = String(body.companyAddress || '').trim()
  const phone = String(body.phone || '').trim()
  if (!name || !company || !email || !phone || !website || !companyAddress) return NextResponse.json({ code: 'INVALID_LEAD_INPUT', message: 'Name, company, email, phone, website, and company address are required.' }, { status: 400 })
  if (!/^https?:\/\/\S+$/i.test(website)) return NextResponse.json({ code: 'INVALID_WEBSITE', message: 'Website must start with http:// or https://.' }, { status: 400 })
  if (!/^[+\d][\d\s().-]{7,}$/.test(phone)) return NextResponse.json({ code: 'INVALID_PHONE', message: 'Enter a valid phone number.' }, { status: 400 })
  const result = await pool.query('INSERT INTO "Opportunity" ("id", "organizationId", "name", "company", "email", "website", "companyAddress", "phone", "value", "ownerId", "stage") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING "id", "name", "company", "email", "website", "companyAddress", "contactAddress", "phone", "stage"', [randomUUID(), context.member.organizationId, name, company, email, website, companyAddress, phone, 0, context.session.user.id, 'LEAD'])
  return NextResponse.json({ lead: result.rows[0] }, { status: 201 })
}

export async function PATCH(request: Request) {
  const context = await getContext()
  if ('error' in context) return context.error
  const body = await request.json()
  const id = String(body.id || '')
  const stage = String(body.stage || '')
  if (!id || !['LEAD', 'PROSPECT', 'CLIENT'].includes(stage)) return NextResponse.json({ code: 'INVALID_STAGE', message: 'Choose Lead, Prospect, or Client.' }, { status: 400 })
  const result = await pool.query('UPDATE "Opportunity" SET "stage" = $1, "updatedAt" = NOW() WHERE "id" = $2 AND "organizationId" = $3 AND "ownerId" = $4 RETURNING "id", "stage"', [stage, id, context.member.organizationId, context.session.user.id])
  if (!result.rows[0]) return NextResponse.json({ code: 'LEAD_NOT_FOUND', message: 'That lead was not found in your pipeline.' }, { status: 404 })
  return NextResponse.json({ lead: result.rows[0] })
}
