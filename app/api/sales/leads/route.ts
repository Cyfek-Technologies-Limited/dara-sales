import { headers } from 'next/headers'
import { after, NextResponse } from 'next/server'
import { prepareEmailAutomation, processEmailQueue } from '@/lib/email-outreach'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export const maxDuration = 60

const channels = ['SOCIAL_MEDIA', 'WEBSITE', 'EMAIL', 'PHONE', 'IN_PERSON', 'OTHER']

async function getStaff() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const member = (await pool.query(
    `SELECT m."organizationId", m."industryId", m."industryIds", i."name" AS "industryName" FROM "OrganizationMember" m
     LEFT JOIN "Industry" i ON i."id" = m."industryId"
     WHERE m."authUserId" = $1 AND m."role" = 'STAFF' AND m."status" = 'ACTIVE'
     ORDER BY m."joinedAt" DESC LIMIT 1`,
    [session.user.id],
  )).rows[0]
  return member ? { userId: session.user.id, organizationId: member.organizationId, industryId: member.industryId as string | null, industryIds: (member.industryIds?.length ? member.industryIds : member.industryId ? [member.industryId] : []) as string[], industryName: member.industryName as string | null } : null
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
  if (!staff.industryIds.length) return NextResponse.json({ error: 'Your admin must assign an industry before you can add prospects.' }, { status: 409 })
  const body = await request.json().catch(() => ({}))
  const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : ''
  const channel = typeof body.channel === 'string' ? body.channel.toUpperCase() : ''
  const industryCategoryId = typeof body.industryCategoryId === 'string' ? body.industryCategoryId : ''
  if (!businessName || businessName.length > 160 || !channels.includes(channel) || !industryCategoryId) {
    return NextResponse.json({ error: 'Enter a business name, choose a subcategory, and choose how you reached out.' }, { status: 400 })
  }

  const category = (await pool.query(
    `SELECT c."id", i."name" AS "industryName" FROM "IndustryCategory" c
     JOIN "Industry" i ON i."id" = c."industryId"
     WHERE c."id" = $1 AND c."industryId" = ANY($2::text[]) AND i."organizationId" = $3`,
    [industryCategoryId, staff.industryIds, staff.organizationId],
  )).rows[0]
  if (!category) return NextResponse.json({ error: 'Choose a subcategory under your assigned industry.' }, { status: 400 })

  await prepareEmailAutomation(staff.organizationId).catch(() => console.error('[email] Could not prepare automation; scheduled worker will recover'))
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const leadId = crypto.randomUUID()
    await client.query(
      `INSERT INTO "SalesLead" ("id", "organizationId", "ownerId", "businessName", "contactName", "email", "phone", "industry", "industryCategoryId", "website", "source", "notes", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
      [leadId, staff.organizationId, staff.userId, businessName, body.contactName || null, body.email || null, body.phone || null, category.industryName, industryCategoryId, body.website || null, body.source || null, body.note || null],
    )
    await client.query(
      `INSERT INTO "SalesOutreach" ("id", "organizationId", "leadId", "ownerId", "channel", "platform", "note") VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [crypto.randomUUID(), staff.organizationId, leadId, staff.userId, channel, body.platform || null, body.note || null],
    )
    await client.query('COMMIT')
    after(() => processEmailQueue(staff.organizationId).then(() => {}).catch(() => console.error('[email] Background sync failed')))
    return NextResponse.json({ ok: true, id: leadId }, { status: 201 })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[sales] Prospect creation failed:', error)
    return NextResponse.json({ error: 'Could not save this prospect.' }, { status: 500 })
  } finally {
    client.release()
  }
}
