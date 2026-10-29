import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import DashboardContent, { type DashboardData } from './dashboard-content'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const membership = (await pool.query(
    `SELECT m."organizationId", m."jobTitle", o."name" AS "organizationName"
     FROM "OrganizationMember" m
     JOIN "Organization" o ON o."id" = m."organizationId"
     WHERE m."authUserId" = $1 AND m."role" = 'STAFF' AND m."status" = 'ACTIVE'
     ORDER BY m."joinedAt" DESC LIMIT 1`,
    [session.user.id],
  )).rows[0]

  if (!membership) redirect('/sign-in')

  const [performanceResult, opportunityResult, pipelineResult, monthlyResult] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM("leadsCreated"), 0)::int AS "leadsCreated",
              COALESCE(SUM("qualifiedLeads"), 0)::int AS "qualifiedLeads",
              COALESCE(SUM("dealsWon"), 0)::int AS "dealsWon",
              COALESCE(SUM("revenue"), 0)::text AS revenue
       FROM "StaffPerformance" WHERE "organizationId" = $1 AND "authUserId" = $2`,
      [membership.organizationId, session.user.id],
    ),
    pool.query(
      `SELECT "id", "name", "company", "email", "stage", "value"::text AS value, "lastActivity"
       FROM "Opportunity" WHERE "organizationId" = $1 AND "ownerId" = $2
       ORDER BY "lastActivity" DESC LIMIT 8`,
      [membership.organizationId, session.user.id],
    ),
    pool.query(
      `SELECT COALESCE(SUM("value"), 0)::text AS value
       FROM "Opportunity"
       WHERE "organizationId" = $1 AND "ownerId" = $2
         AND UPPER("stage") NOT IN ('WON', 'CLOSED_WON', 'LOST', 'CLOSED_LOST')`,
      [membership.organizationId, session.user.id],
    ),
    pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', "periodStart"), 'Mon') AS label,
              COALESCE(SUM("revenue"), 0)::text AS value
       FROM "StaffPerformance"
       WHERE "organizationId" = $1 AND "authUserId" = $2
         AND "periodStart" >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
       GROUP BY DATE_TRUNC('month', "periodStart")
       ORDER BY DATE_TRUNC('month', "periodStart")`,
      [membership.organizationId, session.user.id],
    ),
  ])

  const performance = performanceResult.rows[0]
  const opportunities = opportunityResult.rows

  const data: DashboardData = {
    user: { name: session.user.name || session.user.email, email: session.user.email, jobTitle: membership.jobTitle || 'Sales team member' },
    organizationName: membership.organizationName,
    leadsCreated: Number(performance.leadsCreated),
    qualifiedLeads: Number(performance.qualifiedLeads),
    dealsWon: Number(performance.dealsWon),
    revenue: Number(performance.revenue),
    pipelineValue: Number(pipelineResult.rows[0].value),
    opportunities: opportunities.map((item) => ({
      id: item.id,
      name: item.name,
      company: item.company,
      email: item.email,
      stage: String(item.stage).replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (character: string) => character.toUpperCase()),
      value: Number(item.value),
      lastActivity: item.lastActivity.toISOString(),
    })),
    monthlyRevenue: monthlyResult.rows.map((item) => ({ label: item.label, value: Number(item.value) })),
  }

  return <DashboardContent data={data} />
}
