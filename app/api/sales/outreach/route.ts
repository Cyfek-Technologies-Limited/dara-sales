import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

const channels = ['SOCIAL_MEDIA', 'WEBSITE', 'EMAIL', 'PHONE', 'IN_PERSON', 'OTHER']

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const member = (await pool.query(
    `SELECT "organizationId" FROM "OrganizationMember" WHERE "authUserId" = $1 AND "role" = 'STAFF' AND "status" = 'ACTIVE' ORDER BY "joinedAt" DESC LIMIT 1`,
    [session.user.id],
  )).rows[0]
  if (!member) return NextResponse.json({ error: 'Active staff membership required.' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const channel = typeof body.channel === 'string' ? body.channel.toUpperCase() : ''
  if (typeof body.leadId !== 'string' || !channels.includes(channel)) {
    return NextResponse.json({ error: 'Choose a valid lead and outreach channel.' }, { status: 400 })
  }
  const lead = (await pool.query(
    `SELECT "id" FROM "SalesLead" WHERE "id" = $1 AND "organizationId" = $2 AND "ownerId" = $3`,
    [body.leadId, member.organizationId, session.user.id],
  )).rows[0]
  if (!lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
  await pool.query(
    `INSERT INTO "SalesOutreach" ("id", "organizationId", "leadId", "ownerId", "channel", "platform", "note", "outcome") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [crypto.randomUUID(), member.organizationId, lead.id, session.user.id, channel, body.platform || null, body.note || null, body.outcome || null],
  )
  await pool.query(`UPDATE "SalesLead" SET "updatedAt" = NOW() WHERE "id" = $1`, [lead.id])
  return NextResponse.json({ ok: true }, { status: 201 })
}
