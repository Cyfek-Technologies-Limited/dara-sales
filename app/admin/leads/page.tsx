import { workspaceReader } from '@/lib/workspace-reader'
import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import AdminLeadsList, { type AdminLead } from '@/components/admin-leads-list'
import AdminAddLead, { type LeadIndustry, type LeadCategory, type LeadTeammate } from '@/components/admin-add-lead'

type LeadRow = Omit<AdminLead, 'createdAt' | 'updatedAt' | 'occurredAt'> & { createdAt: Date; updatedAt: Date; occurredAt: Date | null }

export default async function AdminLeadsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const organization = (await pool.query(`SELECT m."role", o."id", o."name" FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId"=o."id" WHERE m."authUserId" = $1 AND m."role" IN ('ADMIN','STAFF') AND m."status" = 'ACTIVE' ORDER BY o."createdAt" DESC LIMIT 1`, [session.user.id])).rows[0]
  if (!organization) redirect('/onboarding')
  const reader = workspaceReader(organization, session.user.id)
  const leads: AdminLead[] = (await reader.query(
    `SELECT l."id",l."businessName",l."contactName",l."email",l."phone",l."industry",c."name" AS "categoryName",l."website",l."source",l."notes",l."createdAt",l."updatedAt",l."stage",l."advertiserSpend"::text AS "advertiserSpend",u."name" AS "ownerName",u."email" AS "ownerEmail",o."channel",o."occurredAt"
     FROM "VisibleSalesLead" l LEFT JOIN "user" u ON u."id"=l."ownerId"
     LEFT JOIN "IndustryCategory" c ON c."id"=l."industryCategoryId"
     LEFT JOIN LATERAL (SELECT "channel","occurredAt" FROM "VisibleSalesOutreach" WHERE "leadId"=l."id" ORDER BY "occurredAt" DESC LIMIT 1) o ON true
     WHERE l."organizationId"=$1 ORDER BY l."updatedAt" DESC`, [organization.id],
  )).rows.map((lead: LeadRow) => ({ ...lead, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString(), occurredAt: lead.occurredAt?.toISOString() || null }))
  const [industryRows, categoryRows, teammateRows] = await Promise.all([
    reader.query('SELECT "id", "name" FROM "Industry" WHERE "organizationId" = $1 ORDER BY "name"', [organization.id]),
    reader.query(`SELECT c."id", c."name", c."industryId" FROM "IndustryCategory" c JOIN "Industry" i ON i."id" = c."industryId" WHERE i."organizationId" = $1 ORDER BY c."name"`, [organization.id]),
    reader.query(`SELECT m."authUserId" AS "id", u."name", u."email" FROM "OrganizationMember" m JOIN "user" u ON u."id" = m."authUserId" WHERE m."organizationId" = $1 AND m."role" = 'STAFF' AND m."status" = 'ACTIVE' ORDER BY u."name", u."email"`, [organization.id]),
  ])
  const byStage = leads.reduce((counts, lead) => ({ ...counts, [lead.stage]: (counts[lead.stage] || 0) + 1 }), {} as Record<string, number>)

  return <main className="dashboard-page min-h-screen bg-[#f4f6f9] p-3 text-[#30263f] md:p-4"><div className="dashboard-frame flex min-h-screen gap-3"><DashboardSidebar role={organization.role} userName={session.user.name || 'Admin'} userEmail={session.user.email} organizationName={organization.name} /><section className="dashboard-content min-w-0 flex-1 rounded-[26px] border-[1px] border-black/30 bg-[#fbfcfe] px-4 py-5 shadow-[0_10px_30px_rgba(7,18,31,0.04)] sm:px-7 md:py-7"><Link href="/admin" className="inline-flex items-center gap-2 text-xs font-semibold text-[#657286]"><ArrowLeft className="size-4" />Back to overview</Link><header className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b-[1px] border-black/30 pb-5"><div><p className="text-xs text-[#657286]">{organization.name} · Team pipeline</p><h1 className="mt-1 font-serif text-3xl font-semibold">All prospects</h1><p className="mt-1 text-sm text-[#657286]">Every saved business, with its current stage and owner. Click a prospect to view its full information.</p></div><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-[#eee9f1] px-3 py-2 text-xs font-semibold">{leads.length} businesses</span><AdminAddLead autoAssignUserId={organization.role === 'STAFF' ? session.user.id : undefined} industries={industryRows.rows as LeadIndustry[]} categories={categoryRows.rows as LeadCategory[]} teammates={teammateRows.rows as LeadTeammate[]} /></div></header>
    <div className="mt-5 flex flex-wrap gap-2">{[['LEAD','Prospects'],['PROSPECT','Leads'],['CLIENT','Clients'],['ONBOARDED','Onboarded'],['CAMPAIGN_SUCCESSFUL','Campaigns live']].map(([key,label])=><span key={key} className="rounded-full border-[1px] border-black/30 bg-white px-3 py-2 text-[11px] text-[#657286]">{label} <strong className="ml-1 text-[#30263f]">{byStage[key] || 0}</strong></span>)}</div>
    <section className="mt-4 overflow-hidden rounded-[22px] border-[1px] border-black/30 bg-white"><div className="border-b-[1px] border-black/30 p-5"><h2 className="font-serif text-lg font-semibold">Recent prospects</h2><p className="mt-1 text-xs text-[#657286]">Sorted by most recently updated.</p></div><AdminLeadsList leads={leads} /></section>
  </section></div></main>
}
