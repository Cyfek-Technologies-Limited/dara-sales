import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { IndustryManager, type IndustryTeammate, type ManagedCategory, type ManagedIndustry } from '@/components/industry-manager'

export default async function IndustriesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const organization = (await pool.query(
    `SELECT o."id", o."name" FROM "Organization" o
     JOIN "OrganizationMember" m ON m."organizationId" = o."id"
     WHERE m."authUserId" = $1 AND m."role" = 'ADMIN'
     ORDER BY o."createdAt" DESC LIMIT 1`,
    [session.user.id],
  )).rows[0]
  if (!organization) redirect('/onboarding')

  const [industryResult, categoryResult, teammateResult] = await Promise.all([
    pool.query(
      `SELECT i."id", i."name",
              COUNT(DISTINCT l."id") FILTER (WHERE l."stage" = 'PROSPECT')::int AS "prospectCount",
              COUNT(DISTINCT l."id") FILTER (WHERE l."stage" = 'CLIENT')::int AS "clientCount"
       FROM "Industry" i
       LEFT JOIN "SalesLead" l ON l."organizationId" = i."organizationId" AND l."industry" = i."name"
       WHERE i."organizationId" = $1
       GROUP BY i."id", i."name" ORDER BY i."name"`,
      [organization.id],
    ),
    pool.query(
      `SELECT c."id", c."industryId", c."name", i."name" AS "industryName",
              COUNT(DISTINCT l."id") FILTER (WHERE l."stage" = 'PROSPECT')::int AS "prospectCount",
              COUNT(DISTINCT l."id") FILTER (WHERE l."stage" = 'CLIENT')::int AS "clientCount",
              COUNT(DISTINCT l."id") FILTER (WHERE s."id" IS NOT NULL)::int AS "todayBusinesses",
              COUNT(DISTINCT m."authUserId")::int AS "assignedInterns"
       FROM "IndustryCategory" c
       JOIN "Industry" i ON i."id" = c."industryId"
       LEFT JOIN "SalesLead" l ON l."industryCategoryId" = c."id" AND l."organizationId" = $1
       LEFT JOIN "SalesOutreach" s ON s."leadId" = l."id"
         AND s."occurredAt" >= (DATE_TRUNC('day', NOW() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')
         AND s."occurredAt" < ((DATE_TRUNC('day', NOW() AT TIME ZONE 'Africa/Lagos') + INTERVAL '1 day') AT TIME ZONE 'Africa/Lagos')
       LEFT JOIN "OrganizationMember" m ON m."industryId" = i."id" AND m."role" = 'STAFF' AND m."status" = 'ACTIVE'
       WHERE i."organizationId" = $1
       GROUP BY c."id", c."industryId", c."name", i."name"
       ORDER BY i."name", c."name"`,
      [organization.id],
    ),
    pool.query(
      `SELECT m."authUserId" AS "userId", u."name", u."email", m."jobTitle", m."industryId", i."name" AS "industryName",
              COUNT(DISTINCT l."id") FILTER (WHERE l."stage" = 'CLIENT')::int AS "clientCount"
       FROM "OrganizationMember" m
       JOIN "user" u ON u."id" = m."authUserId"
       LEFT JOIN "Industry" i ON i."id" = m."industryId"
       LEFT JOIN "SalesLead" l ON l."organizationId" = m."organizationId" AND l."ownerId" = m."authUserId" AND l."industry" = i."name"
       WHERE m."organizationId" = $1 AND m."role" = 'STAFF' AND m."status" = 'ACTIVE'
       GROUP BY m."authUserId", u."name", u."email", m."jobTitle", m."industryId", i."name"
       ORDER BY i."name" NULLS FIRST, u."name"`,
      [organization.id],
    ),
  ])

  const categories: ManagedCategory[] = categoryResult.rows.map((category) => ({
    id: category.id,
    industryId: category.industryId,
    name: category.name,
    prospectCount: Number(category.prospectCount),
    clientCount: Number(category.clientCount),
    todayBusinesses: Number(category.todayBusinesses),
    assignedInterns: Number(category.assignedInterns),
  }))
  const industries: ManagedIndustry[] = industryResult.rows.map((industry) => ({
    id: industry.id,
    name: industry.name,
    prospectCount: Number(industry.prospectCount),
    clientCount: Number(industry.clientCount),
    categories: categories.filter((category) => category.industryId === industry.id),
  }))
  const teammates: IndustryTeammate[] = teammateResult.rows.map((teammate) => ({
    userId: teammate.userId,
    name: teammate.name || teammate.email,
    email: teammate.email,
    jobTitle: teammate.jobTitle,
    industryId: teammate.industryId,
    industryName: teammate.industryName,
    clientCount: Number(teammate.clientCount),
  }))

  return (
    <main className="min-h-screen bg-[#f4f6f9] p-3 text-[#07121f] md:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-3">
        <DashboardSidebar role="ADMIN" userName={session.user.name || 'Admin'} userEmail={session.user.email} organizationName={organization.name} />
        <section className="min-w-0 flex-1 rounded-[26px] border-[1px] border-black/30 bg-[#fbfcfe] px-4 py-5 shadow-[0_10px_30px_rgba(7,18,31,0.04)] sm:px-7 md:py-7">
          <header className="border-b-[1px] border-black/30 pb-5">
            <p className="text-xs text-[#657286]">{organization.name} · Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Industries</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#657286]">Build your industry list, assign each intern a market, and track how many clients the team has won in each one.</p>
          </header>
          <IndustryManager industries={industries} teammates={teammates} />
        </section>
      </div>
    </main>
  )
}
