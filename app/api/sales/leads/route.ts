import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

const channels = ['SOCIAL_MEDIA', 'WEBSITE', 'EMAIL', 'PHONE', 'IN_PERSON', 'OTHER']

async function getStaff() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const member = (await pool.query(
    `SELECT "organizationId" FROM "OrganizationMember"
     WHERE "authUserId" = $1 AND "role" = 'STAFF' AND "status" = 'ACTIVE'
     ORDER BY "joinedAt" DESC LIMIT 1`,
    [session.user.id],
  )).rows[0]
  return member ? { userId: session.user.id, organizationId: member.organizationId } : null
}

export async function GET() {
  const staff = await getStaff()
  if (!staff) return NextResponse.json({ error: 'Sign in with an active staff account.' }, { status: 401 })
  const [leads, count] = await Promise.all([
    pool.query(
      `SELECT l."id", l."businessName", l."contactName", l."email", l."phone", l."industry", l."website", l."stage", l."advertiserSpend"::text AS "advertiserSpend", l."campaignSuccessfulAt", l."notes", l."createdAt",
              COALESCE((SELECT COUNT(*)::int FROM "SalesOutreach" s WHERE s."leadId" = l."id"), 0) AS "outreachCount",
              (SELECT s."occurredAt" FROM "SalesOutreach" s WHERE s."leadId" = l."id" ORDER BY s."occurredAt" DESC LIMIT 1) AS "lastOutreachAt"
       FROM "SalesLead" l WHERE l."organizationId" = $1 AND l."ownerId" = $2
       ORDER BY l."updatedAt" DESC LIMIT 100`,
      [staff.organizationId, staff.userId],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM "SalesOutreach"
       WHERE "organizationId" = $1 AND "ownerId" = $2
         AND "occurredAt" >= (DATE_TRUNC('day', NOW() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')
         AND "occurredAt" < ((DATE_TRUNC('day', NOW() AT TIME ZONE 'Africa/Lagos') + INTERVAL '1 day') AT TIME ZONE 'Africa/Lagos')`,
      [staff.organizationId, staff.userId],
    ),
  ])
  return NextResponse.json({ leads: leads.rows, outreachToday: Number(count.rows[0].count), dailyTarget: 20 })
}

export async function POST(request: Request) {
  const staff = await getStaff()
  if (!staff) return NextResponse.json({ error: 'Sign in with an active staff account.' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : ''
  const channel = typeof body.channel === 'string' ? body.channel.toUpperCase() : ''
  if (!businessName || businessName.length > 160 || !channels.includes(channel)) {
    return NextResponse.json({ error: 'Enter a business name and choose how you reached out.' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const leadId = crypto.randomUUID()
    await client.query(
      `INSERT INTO "SalesLead" ("id", "organizationId", "ownerId", "businessName", "contactName", "email", "phone", "industry", "website", "source", "notes", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
      [leadId, staff.organizationId, staff.userId, businessName, body.contactName || null, body.email || null, body.phone || null, body.industry || null, body.website || null, body.source || null, body.note || null],
    )
    await client.query(
      `INSERT INTO "SalesOutreach" ("id", "organizationId", "leadId", "ownerId", "channel", "platform", "note") VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [crypto.randomUUID(), staff.organizationId, leadId, staff.userId, channel, body.platform || null, body.note || null],
    )
    await client.query('COMMIT')
    return NextResponse.json({ ok: true, id: leadId }, { status: 201 })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[sales] Lead creation failed:', error)
    return NextResponse.json({ error: 'Could not save this lead.' }, { status: 500 })
  } finally {
    client.release()
  }
}
