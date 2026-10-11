import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ code: 'AUTH_REQUIRED', message: 'Sign in to view your dashboard.' }, { status: 401 })

  const memberResult = await pool.query(
    `SELECT m."organizationId", m."role", o."name" AS "organizationName"
     FROM "OrganizationMember" m JOIN "Organization" o ON o."id" = m."organizationId"
     WHERE m."authUserId" = $1 AND m."status" = 'ACTIVE' LIMIT 1`,
    [session.user.id],
  )
  const member = memberResult.rows[0]
  if (!member) return NextResponse.json({ code: 'MEMBERSHIP_NOT_FOUND', message: 'Your account is not linked to an organization.' }, { status: 403 })

  const [opportunities, activities, performance] = await Promise.all([
    pool.query(
      `SELECT "id", "name", "company", "stage", "value", "lastActivity" FROM "Opportunity"
       WHERE "organizationId" = $1 AND "ownerId" = $2 ORDER BY "lastActivity" DESC LIMIT 10`,
      [member.organizationId, session.user.id],
    ),
    pool.query(
      `SELECT a."id", a."type", a."note", a."occurredAt", o."name" AS "opportunityName"
       FROM "Activity" a LEFT JOIN "Opportunity" o ON o."id" = a."opportunityId"
       WHERE a."organizationId" = $1 AND o."ownerId" = $2 ORDER BY a."occurredAt" DESC LIMIT 8`,
      [member.organizationId, session.user.id],
    ),
    pool.query(
      `SELECT COALESCE(SUM("leadsCreated"), 0)::int AS "leadsCreated", COALESCE(SUM("qualifiedLeads"), 0)::int AS "qualifiedLeads", COALESCE(SUM("dealsWon"), 0)::int AS "dealsWon", COALESCE(SUM("revenue"), 0)::numeric AS "revenue", COALESCE(SUM("activities"), 0)::int AS "activities"
       FROM "StaffPerformance" WHERE "organizationId" = $1 AND "authUserId" = $2`,
      [member.organizationId, session.user.id],
    ),
  ])

  return NextResponse.json({ user: { name: session.user.name, email: session.user.email }, organization: member, performance: performance.rows[0], opportunities: opportunities.rows, activities: activities.rows })
}
