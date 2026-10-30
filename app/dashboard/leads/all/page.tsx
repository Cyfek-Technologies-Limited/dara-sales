import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { DashboardSidebar } from '@/components/dashboard-sidebar'

type LeadRow = {
  id: string
  businessName: string
  contactName: string | null
  email: string | null
  phone: string | null
  industry: string | null
  website: string | null
  stage: string
  advertiserSpend: string
  createdAt: Date
  lastOutreachAt: Date | null
  outreachCount: number
}

const money = (value: string | number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value || 0))
const stageLabel = (stage: string) => stage.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
const dateLabel = (date: Date | null) => date ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).format(date) : 'No outreach yet'

export default async function AllLeadsPage() {
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

  const leads = (await pool.query(
    `SELECT l."id", l."businessName", l."contactName", l."email", l."phone", l."industry", l."website",
            l."stage", l."advertiserSpend"::text AS "advertiserSpend", l."createdAt",
            recent."lastOutreachAt", COALESCE(recent."outreachCount", 0)::int AS "outreachCount"
     FROM "SalesLead" l
     LEFT JOIN LATERAL (
       SELECT MAX(s."occurredAt") AS "lastOutreachAt", COUNT(*)::int AS "outreachCount"
       FROM "SalesOutreach" s WHERE s."leadId" = l."id" AND s."ownerId" = $2
     ) recent ON true
     WHERE l."organizationId" = $1 AND l."ownerId" = $2
     ORDER BY l."updatedAt" DESC, l."createdAt" DESC`,
    [member.organizationId, session.user.id],
  )).rows as LeadRow[]

  return (
    <main className="min-h-screen bg-[#f4f6f9] p-3 text-[#07121f] md:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-3">
        <DashboardSidebar role="STAFF" userName={session.user.name || session.user.email} userEmail={session.user.email} organizationName={member.organizationName} jobTitle={member.jobTitle || 'Sales team member'} />
        <section className="min-w-0 flex-1 rounded-[26px] border-[1px] border-black/30 bg-[#fbfcfe] px-4 py-5 shadow-[0_10px_30px_rgba(7,18,31,0.04)] sm:px-7 md:py-7">
          <header className="flex flex-col justify-between gap-4 border-b-[1px] border-black/30 pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs text-[#657286]">{member.organizationName} · {member.jobTitle || 'Sales team member'}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">All leads &amp; prospects</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#657286]">Your complete list of businesses, including leads you contacted on earlier days.</p>
              <Link href="/dashboard/leads" className="mt-3 inline-block text-xs font-semibold underline">View today&apos;s leads</Link>
            </div>
            <span className="rounded-full bg-[#e9eef5] px-3 py-2 text-xs font-semibold">{leads.length} {leads.length === 1 ? 'business' : 'businesses'}</span>
          </header>

          <section className="mt-5 overflow-hidden rounded-2xl border-[1px] border-black/30 bg-white">
            {leads.length ? <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-[#f4f6f9] text-[10px] uppercase tracking-[0.12em] text-[#657286]"><tr><th className="px-5 py-3">Business / contact</th><th className="px-5 py-3">Stage</th><th className="px-5 py-3">Outreach</th><th className="px-5 py-3">Last contacted</th><th className="px-5 py-3">Advertiser spend</th></tr></thead>
                <tbody className="divide-y divide-black/30">{leads.map((lead) => <tr key={lead.id}>
                  <td className="px-5 py-4"><p className="font-semibold">{lead.businessName}</p><p className="mt-1 text-[11px] text-[#657286]">{lead.contactName || 'Contact not added'}{lead.industry ? ` · ${lead.industry}` : ''}</p><p className="mt-1 text-[11px] text-[#657286]">{[lead.email, lead.phone].filter(Boolean).join(' · ') || 'No contact details'}</p>{lead.website && <a className="mt-1 inline-block text-[11px] underline" href={lead.website} target="_blank" rel="noreferrer">Website</a>}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-[#e9eef5] px-3 py-1.5 text-[10px] font-semibold">{stageLabel(lead.stage)}</span></td>
                  <td className="px-5 py-4 font-medium">{lead.outreachCount} {lead.outreachCount === 1 ? 'touch' : 'touches'}</td>
                  <td className="px-5 py-4 text-[#657286]">{dateLabel(lead.lastOutreachAt)}</td>
                  <td className="px-5 py-4 font-semibold">{money(lead.advertiserSpend)}</td>
                </tr>)}</tbody>
              </table>
            </div> : <div className="p-12 text-center"><h2 className="font-semibold">No leads yet</h2><p className="mt-1 text-sm text-[#657286]">Businesses you record will stay here, even after today.</p></div>}
          </section>
        </section>
      </div>
    </main>
  )
}
