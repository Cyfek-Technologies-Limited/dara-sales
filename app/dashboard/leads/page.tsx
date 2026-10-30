import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import LeadsContent, { type DailyLead } from './leads-content'

export default async function LeadsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const member = (await pool.query(
    `SELECT m."organizationId", m."jobTitle", o."name" AS "organizationName"
     FROM "OrganizationMember" m JOIN "Organization" o ON o."id" = m."organizationId"
     WHERE m."authUserId" = $1 AND m."role" = 'STAFF' AND m."status" = 'ACTIVE'
     ORDER BY m."joinedAt" DESC LIMIT 1`,
    [session.user.id],
  )).rows[0]
  if (!member) redirect('/sign-in')

  const [leadResult, outreachResult] = await Promise.all([
    pool.query(
      `WITH today_logs AS (
         SELECT "leadId", COUNT(*)::int AS "todayTouches", MAX("occurredAt") AS "lastOutreachAt",
                (ARRAY_AGG("channel" ORDER BY "occurredAt" DESC))[1] AS "lastChannel",
                (ARRAY_AGG("platform" ORDER BY "occurredAt" DESC))[1] AS "lastPlatform",
                (ARRAY_AGG("note" ORDER BY "occurredAt" DESC))[1] AS "lastNote"
         FROM "SalesOutreach"
         WHERE "organizationId" = $1 AND "ownerId" = $2
           AND "occurredAt" >= (DATE_TRUNC('day', NOW() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')
           AND "occurredAt" < ((DATE_TRUNC('day', NOW() AT TIME ZONE 'Africa/Lagos') + INTERVAL '1 day') AT TIME ZONE 'Africa/Lagos')
         GROUP BY "leadId"
       )
       SELECT l."id", l."businessName", l."contactName", l."email", l."phone", l."industry", l."website", l."stage", l."advertiserSpend"::text AS "advertiserSpend",
              t."todayTouches", t."lastOutreachAt", t."lastChannel", t."lastPlatform", t."lastNote"
       FROM today_logs t JOIN "SalesLead" l ON l."id" = t."leadId"
       WHERE l."organizationId" = $1 AND l."ownerId" = $2
       ORDER BY t."lastOutreachAt" DESC`,
      [member.organizationId, session.user.id],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM "SalesOutreach"
       WHERE "organizationId" = $1 AND "ownerId" = $2
         AND "occurredAt" >= (DATE_TRUNC('day', NOW() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')
         AND "occurredAt" < ((DATE_TRUNC('day', NOW() AT TIME ZONE 'Africa/Lagos') + INTERVAL '1 day') AT TIME ZONE 'Africa/Lagos')`,
      [member.organizationId, session.user.id],
    ),
  ])

  const leads: DailyLead[] = leadResult.rows.map((lead) => ({
    id: lead.id,
    businessName: lead.businessName,
    contactName: lead.contactName || '',
    email: lead.email || '',
    phone: lead.phone || '',
    industry: lead.industry || '',
    website: lead.website || '',
    stage: lead.stage,
    advertiserSpend: Number(lead.advertiserSpend),
    todayTouches: Number(lead.todayTouches),
    lastOutreachAt: lead.lastOutreachAt.toISOString(),
    lastChannel: lead.lastChannel,
    lastPlatform: lead.lastPlatform || '',
    lastNote: lead.lastNote || '',
  }))

  return <LeadsContent user={{ name: session.user.name || session.user.email, email: session.user.email, jobTitle: member.jobTitle || 'Sales team member', organizationName: member.organizationName }} leads={leads} outreachToday={Number(outreachResult.rows[0].count)} dailyTarget={20} />
}
