import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import ProspectingWorkbench from '@/components/prospecting-workbench'

export default async function ProspectingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const organization = (await pool.query(
    `SELECT o."id", o."name" FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId" = o."id"
     WHERE m."authUserId" = $1 AND m."role" = 'ADMIN' ORDER BY o."createdAt" DESC LIMIT 1`, [session.user.id],
  )).rows[0]
  if (!organization) redirect('/onboarding')

  const [categories, teammates] = await Promise.all([
    pool.query(
      `SELECT c."id", c."name", i."name" AS "industryName", i."id" AS "industryId"
       FROM "IndustryCategory" c JOIN "Industry" i ON i."id" = c."industryId"
       WHERE i."organizationId" = $1 ORDER BY i."name", c."name"`, [organization.id],
    ),
    pool.query(
      `SELECT u."id", u."name", u."email" FROM "OrganizationMember" m
       JOIN "user" u ON u."id" = m."authUserId"
       WHERE m."organizationId" = $1 AND m."role" = 'STAFF' AND m."status" = 'ACTIVE'
       ORDER BY u."name", u."email"`, [organization.id],
    ),
  ])

  return <main className="dashboard-page min-h-screen bg-[#e9edff] p-3 text-[#30263f] md:p-4"><div className="dashboard-frame mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-3"><DashboardSidebar role="ADMIN" userName={session.user.name || 'Admin'} userEmail={session.user.email} organizationName={organization.name} /><section className="dashboard-content min-w-0 flex-1 rounded-[26px] border-[1px] border-black/30 bg-[#f8faff] px-4 py-5 shadow-[0_10px_30px_rgba(7,18,31,0.04)] sm:px-7 md:py-7"><header className="rounded-2xl border-[1px] border-black/30 bg-white p-6 shadow-none sm:p-7"><p className="text-xs text-[#807287]">{organization.name} · Workspace</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#30263f]">AI Prospecting</h1><p className="mt-1 max-w-2xl text-sm text-[#807287]">Describe what you sell, explore promising industries, and discover businesses with links to their public sources.</p></header><ProspectingWorkbench categories={categories.rows} teammates={teammates.rows} /></section></div></main>
}
