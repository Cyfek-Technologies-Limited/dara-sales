import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import DashboardContent, { type DashboardData } from './dashboard-content'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const membership = (await pool.query(
    `SELECT m."organizationId", m."jobTitle", i."name" AS "industryName", o."name" AS "organizationName"
     FROM "OrganizationMember" m JOIN "Organization" o ON o."id" = m."organizationId"
     LEFT JOIN "Industry" i ON i."id" = m."industryId"
     WHERE m."authUserId" = $1 AND m."role" = 'STAFF' AND m."status" = 'ACTIVE'
     ORDER BY m."joinedAt" DESC LIMIT 1`,
    [session.user.id],
  )).rows[0]
  if (!membership) redirect('/sign-in')

  const [metricsResult, outreachResult, monthlyResult, recentResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS "leadsCreated",
              COUNT(*) FILTER (WHERE "stage" = 'LEAD')::int AS "leadCount",
              COUNT(*) FILTER (WHERE "stage" IN ('PROSPECT','CLIENT','ONBOARDED','CAMPAIGN_SUCCESSFUL'))::int AS "qualifiedLeads",
              COUNT(*) FILTER (WHERE "stage" = 'CAMPAIGN_SUCCESSFUL')::int AS "dealsWon",
              COUNT(*) FILTER (WHERE "stage" = 'PROSPECT')::int AS prospects,
              COUNT(*) FILTER (WHERE "stage" = 'CLIENT')::int AS clients,
              COUNT(*) FILTER (WHERE "stage" = 'ONBOARDED')::int AS onboarded,
              COALESCE(SUM("advertiserSpend") FILTER (WHERE "stage" = 'CAMPAIGN_SUCCESSFUL'), 0)::text AS revenue,
              COALESCE(SUM("advertiserSpend") FILTER (WHERE "stage" NOT IN ('CAMPAIGN_SUCCESSFUL','LOST')), 0)::text AS "pipelineValue"
       FROM "SalesLead" WHERE "organizationId" = $1 AND "ownerId" = $2`,
      [membership.organizationId, session.user.id],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM "SalesOutreach"
       WHERE "organizationId" = $1 AND "ownerId" = $2
         AND "occurredAt" >= (DATE_TRUNC('day', NOW() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')
         AND "occurredAt" < ((DATE_TRUNC('day', NOW() AT TIME ZONE 'Africa/Lagos') + INTERVAL '1 day') AT TIME ZONE 'Africa/Lagos')`,
      [membership.organizationId, session.user.id],
    ),
    pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', "campaignSuccessfulAt"), 'Mon') AS label,
              COALESCE(SUM("advertiserSpend"), 0)::text AS value
       FROM "SalesLead" WHERE "organizationId" = $1 AND "ownerId" = $2
         AND "stage" = 'CAMPAIGN_SUCCESSFUL'
         AND "campaignSuccessfulAt" >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
       GROUP BY DATE_TRUNC('month', "campaignSuccessfulAt") ORDER BY DATE_TRUNC('month', "campaignSuccessfulAt")`,
      [membership.organizationId, session.user.id],
    ),
    pool.query(
      `SELECT l."businessName", l."contactName", l."industry", l."stage", o."channel" AS "outreachChannel", o."occurredAt" AS "outreachAt"
       FROM "SalesLead" l LEFT JOIN LATERAL (SELECT "channel", "occurredAt" FROM "SalesOutreach" WHERE "leadId"=l."id" ORDER BY "occurredAt" DESC LIMIT 1) o ON true
       WHERE l."organizationId"=$1 AND l."ownerId"=$2 ORDER BY l."updatedAt" DESC LIMIT 1`,
      [membership.organizationId, session.user.id],
    ),
  ])

  const metrics = metricsResult.rows[0]
  const data: DashboardData = {
    user: { name: session.user.name || session.user.email, email: session.user.email, jobTitle: membership.jobTitle || 'Sales team member', industry: membership.industryName || null },
    organizationName: membership.organizationName,
    leadsCreated: Number(metrics.leadsCreated),
    qualifiedLeads: Number(metrics.qualifiedLeads),
    dealsWon: Number(metrics.dealsWon),
    revenue: Number(metrics.revenue),
    pipelineValue: Number(metrics.pipelineValue),
    prospects: Number(metrics.prospects),
    clients: Number(metrics.clients),
    onboarded: Number(metrics.onboarded),
    commission: Number(metrics.revenue) * 0.1,
    outreachToday: Number(outreachResult.rows[0].count),
    dailyTarget: 20,
    monthlyRevenue: monthlyResult.rows.map((month) => ({ label: month.label, value: Number(month.value) })),
    stageCounts: { LEAD: Number(metrics.leadCount), PROSPECT: Number(metrics.prospects), CLIENT: Number(metrics.clients), ONBOARDED: Number(metrics.onboarded), CAMPAIGN_SUCCESSFUL: Number(metrics.dealsWon) },
    recentLead: recentResult.rows[0] ? {
      businessName: recentResult.rows[0].businessName,
      contactName: recentResult.rows[0].contactName,
      industry: recentResult.rows[0].industry,
      stage: recentResult.rows[0].stage,
      outreachChannel: recentResult.rows[0].outreachChannel,
      outreachAt: recentResult.rows[0].outreachAt?.toISOString() || null,
    } : null,
  }

  return <DashboardContent data={data} />
}
