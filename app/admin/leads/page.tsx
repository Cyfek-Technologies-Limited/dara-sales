import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ArrowLeft, Building2 } from 'lucide-react'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { AdminSidebar } from '@/components/admin-sidebar'

const money = (value: string | number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value || 0))
const stageLabel = (stage: string) => stage.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())

export default async function AdminLeadsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const organization = (await pool.query(`SELECT o."id",o."name" FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId"=o."id" WHERE m."authUserId"=$1 AND m."role"='ADMIN' ORDER BY o."createdAt" DESC LIMIT 1`, [session.user.id])).rows[0]
  if (!organization) redirect('/onboarding')
  const leads = (await pool.query(
    `SELECT l."id",l."businessName",l."contactName",l."email",l."industry",l."stage",l."advertiserSpend"::text AS "advertiserSpend",u."name" AS "ownerName",u."email" AS "ownerEmail",o."channel",o."occurredAt"
     FROM "SalesLead" l LEFT JOIN "user" u ON u."id"=l."ownerId"
     LEFT JOIN LATERAL (SELECT "channel","occurredAt" FROM "SalesOutreach" WHERE "leadId"=l."id" ORDER BY "occurredAt" DESC LIMIT 1) o ON true
     WHERE l."organizationId"=$1 ORDER BY l."updatedAt" DESC`, [organization.id],
  )).rows
  const byStage = leads.reduce((counts, lead) => ({ ...counts, [lead.stage]: (counts[lead.stage] || 0) + 1 }), {} as Record<string, number>)

  return <main className="min-h-screen bg-[#f4f6f9] p-3 text-[#07121f] md:p-4"><div className="flex min-h-screen gap-3"><AdminSidebar userName={session.user.name || 'Admin'} userEmail={session.user.email} organizationName={organization.name} /><section className="min-w-0 flex-1 rounded-[26px] border border-[#d6deea] bg-[#fbfcfe] px-4 py-5 shadow-[0_10px_30px_rgba(7,18,31,0.04)] sm:px-7 md:py-7"><Link href="/admin" className="inline-flex items-center gap-2 text-xs font-semibold text-[#657286]"><ArrowLeft className="size-4" />Back to overview</Link><header className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-[#e9eef5] pb-5"><div><p className="text-xs text-[#657286]">{organization.name} · Team pipeline</p><h1 className="mt-1 font-serif text-3xl font-semibold">All leads</h1><p className="mt-1 text-sm text-[#657286]">Every business reached by your sales team, with its current stage and owner.</p></div><span className="rounded-full bg-[#e9eef5] px-3 py-2 text-xs font-semibold">{leads.length} businesses</span></header>
    <div className="mt-5 flex flex-wrap gap-2">{[['LEAD','Leads'],['PROSPECT','Prospects'],['CLIENT','Clients'],['ONBOARDED','Onboarded'],['CAMPAIGN_SUCCESSFUL','Campaigns live']].map(([key,label])=><span key={key} className="rounded-full border border-[#d6deea] bg-white px-3 py-2 text-[11px] text-[#657286]">{label} <strong className="ml-1 text-[#07121f]">{byStage[key] || 0}</strong></span>)}</div>
    <section className="mt-4 overflow-hidden rounded-[22px] border border-[#d6deea] bg-white"><div className="border-b border-[#e9eef5] p-5"><h2 className="font-serif text-lg font-semibold">Recent leads</h2><p className="mt-1 text-xs text-[#657286]">Sorted by most recently updated.</p></div>{leads.length ? <div className="divide-y divide-[#e9eef5]">{leads.map((lead)=><article key={lead.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(120px,.75fr)_minmax(130px,.8fr)_minmax(130px,.8fr)] sm:items-center"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#e9eef5]"><Building2 className="size-4 text-[#07121f]" /></span><div className="min-w-0"><p className="truncate font-serif text-sm font-semibold">{lead.businessName}</p><p className="mt-1 truncate text-[11px] text-[#657286]">{lead.contactName || 'Contact not added'}{lead.industry ? ` · ${lead.industry}` : ''}{lead.email ? ` · ${lead.email}` : ''}</p></div></div><div><span className="rounded-full bg-[#e9eef5] px-3 py-1.5 text-[10px] font-semibold">{stageLabel(lead.stage)}</span></div><div className="text-xs"><p className="font-medium">{lead.ownerName || lead.ownerEmail || 'Team member'}</p><p className="mt-1 text-[10px] text-[#657286]">{lead.channel ? lead.channel.replaceAll('_',' ').toLowerCase() : 'No contact logged'}</p></div><div className="text-xs sm:text-right"><p className="font-semibold">{money(lead.advertiserSpend)}</p><p className="mt-1 text-[10px] text-[#657286]">{lead.stage === 'CAMPAIGN_SUCCESSFUL' ? `Commission ${money(Number(lead.advertiserSpend)*0.1)}` : 'Advertiser spend'}</p></div></article>)}</div> : <div className="p-12 text-center text-sm text-[#657286]">Your team&apos;s businesses will appear here as interns record outreach.</div>}</section>
  </section></div></main>
}
