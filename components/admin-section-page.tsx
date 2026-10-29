import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { CalendarDays, CheckCircle2, ClipboardList, CircleHelp, Settings, TrendingUp, Users } from 'lucide-react'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { AdminSidebar } from '@/components/admin-sidebar'

const content = {
  tasks: { title: 'Tasks', eyebrow: 'Workspace / Tasks', description: 'Coordinate follow-ups and keep every sales motion moving.', icon: ClipboardList, cards: [['Open tasks', '12', 'Across your sales team'], ['Due today', '4', 'Needs attention'], ['Completed this week', '28', 'Strong team momentum']] },
  calendar: { title: 'Calendar', eyebrow: 'Workspace / Calendar', description: 'Keep reviews, demos, and team check-ins in one place.', icon: CalendarDays, cards: [['Today', '3', 'Scheduled events'], ['This week', '14', 'Team commitments'], ['Next review', 'Tomorrow', 'Progress review']] },
  analytics: { title: 'Analytics', eyebrow: 'Workspace / Analytics', description: 'Understand the activity behind your team’s sales performance.', icon: TrendingUp, cards: [['Leads generated', '0', 'Connect staff activity to see trends'], ['Qualification rate', '0%', 'No performance data yet'], ['Revenue', '₦0', 'Recorded this period']] },
  team: { title: 'Team', eyebrow: 'Workspace / Team', description: 'Track daily outreach, pipeline progress, advertiser spend, and earned commission.', icon: Users, cards: [] },
  settings: { title: 'Settings', eyebrow: 'General / Settings', description: 'Manage your organization profile and workspace preferences.', icon: Settings, cards: [['Organization profile', 'Ready', 'Company details and industry'], ['Plan', 'Current', 'Billing and seat limits'], ['Security', 'Protected', 'Authentication and access']] },
  help: { title: 'Help center', eyebrow: 'General / Help', description: 'Find guidance for managing your Dara workspace.', icon: CircleHelp, cards: [['Getting started', '3 steps', 'Set up your team'], ['Invitations', 'Guide', 'Add staff securely'], ['Need support?', 'Contact us', 'We are here to help']] },
} as const

const money = (value: string | number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value || 0))
const number = (value: string | number) => new Intl.NumberFormat('en-NG').format(Number(value || 0))
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase()

export async function AdminSectionPage({ section }: { section: keyof typeof content }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const result = await pool.query(`SELECT o."id", o."name", o."staffCount", o."plan" FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId" = o."id" WHERE m."authUserId" = $1 AND m."role" = 'ADMIN' LIMIT 1`, [session.user.id])
  const organization = result.rows[0]
  if (!organization) redirect('/onboarding')
  const page = content[section]
  const Icon = page.icon
  const team = section === 'team' ? (await pool.query(
    `SELECT m."authUserId", m."jobTitle", u."name", u."email",
       (SELECT COUNT(*)::int FROM "SalesOutreach" s WHERE s."organizationId" = m."organizationId" AND s."ownerId" = m."authUserId" AND s."occurredAt" >= (DATE_TRUNC('day', NOW() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos') AND s."occurredAt" < ((DATE_TRUNC('day', NOW() AT TIME ZONE 'Africa/Lagos') + INTERVAL '1 day') AT TIME ZONE 'Africa/Lagos')) AS "outreachToday",
       (SELECT COUNT(*)::int FROM "SalesLead" l WHERE l."organizationId" = m."organizationId" AND l."ownerId" = m."authUserId") AS "leadCount",
       (SELECT COUNT(*)::int FROM "SalesLead" l WHERE l."organizationId" = m."organizationId" AND l."ownerId" = m."authUserId" AND l."stage" = 'PROSPECT') AS prospects,
       (SELECT COUNT(*)::int FROM "SalesLead" l WHERE l."organizationId" = m."organizationId" AND l."ownerId" = m."authUserId" AND l."stage" = 'CLIENT') AS clients,
       (SELECT COUNT(*)::int FROM "SalesLead" l WHERE l."organizationId" = m."organizationId" AND l."ownerId" = m."authUserId" AND l."stage" = 'ONBOARDED') AS onboarded,
       (SELECT COUNT(*)::int FROM "SalesLead" l WHERE l."organizationId" = m."organizationId" AND l."ownerId" = m."authUserId" AND l."stage" = 'CAMPAIGN_SUCCESSFUL') AS successful,
       (SELECT COALESCE(SUM(l."advertiserSpend"),0)::text FROM "SalesLead" l WHERE l."organizationId" = m."organizationId" AND l."ownerId" = m."authUserId" AND l."stage" = 'CAMPAIGN_SUCCESSFUL') AS spend
     FROM "OrganizationMember" m JOIN "user" u ON u."id" = m."authUserId"
     WHERE m."organizationId" = $1 AND m."role" = 'STAFF' AND m."status" = 'ACTIVE' ORDER BY "outreachToday" DESC, "leadCount" DESC`,
    [organization.id],
  )).rows : []

  const teamTotals = team.reduce((totals, member) => ({
    outreach: totals.outreach + Number(member.outreachToday), leads: totals.leads + Number(member.leadCount),
    successful: totals.successful + Number(member.successful), spend: totals.spend + Number(member.spend),
  }), { outreach: 0, leads: 0, successful: 0, spend: 0 })

  return (
    <main className="min-h-screen bg-[#f4f6f9] p-3 text-[#07121f] md:p-4">
      <div className="flex min-h-screen gap-3"><AdminSidebar userName={session.user.name || 'Admin'} userEmail={session.user.email} organizationName={organization.name} /><section className="min-w-0 flex-1 rounded-[24px] border border-[#d6deea] bg-white px-4 py-5 shadow-[0_10px_30px_rgba(20,34,28,0.035)] sm:px-7 md:py-8">
        <header className="border-b border-[#d6deea] pb-5"><p className="text-xs text-[#657286]">{organization.name} / {page.eyebrow.split(' / ')[1]}</p><div className="mt-2 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#e9eef5] text-[#07121f]"><Icon className="size-5" /></span><div><h1 className="text-3xl font-semibold tracking-[-0.04em]">{page.title}</h1><p className="mt-1 text-sm text-[#657286]">{page.description}</p></div></div></header>
        {section === 'team' ? <>
          <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
            ['Outreach today', teamTotals.outreach, 'Team target: 20 per intern'],
            ['Businesses in pipeline', teamTotals.leads, `${team.length} sales team members`],
            ['Successful campaigns', teamTotals.successful, 'Advertiser campaigns completed successfully'],
            ['Advertiser spend', money(teamTotals.spend), `Team commission: ${money(teamTotals.spend * 0.1)}`],
          ].map(([label, value, detail]) => <article key={String(label)} className="rounded-2xl border border-[#d6deea] bg-white p-5"><p className="text-xs font-medium text-[#657286]">{label}</p><p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{typeof value === 'number' ? number(value) : value}</p><p className="mt-2 text-xs text-[#657286]">{detail}</p></article>)}</section>
          <section className="mt-4 overflow-hidden rounded-2xl border border-[#d6deea] bg-white"><div className="border-b border-[#e9eef5] p-5"><h2 className="font-semibold">Sales intern progress</h2><p className="mt-1 text-xs text-[#657286]">Daily outreach target and advertiser pipeline by team member.</p></div>
            {team.length ? <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left text-xs"><thead className="bg-[#f4f6f9] text-[10px] uppercase tracking-[0.12em] text-[#657286]"><tr><th className="px-5 py-3">Team member</th><th className="px-5 py-3">Today&apos;s outreach / 20</th><th className="px-5 py-3">Leads</th><th className="px-5 py-3">Prospects</th><th className="px-5 py-3">Clients</th><th className="px-5 py-3">Onboarded</th><th className="px-5 py-3">Successful ads</th><th className="px-5 py-3">Spend</th><th className="px-5 py-3">10% commission</th></tr></thead><tbody>{team.map((member) => <tr key={member.authUserId} className="border-t border-[#e9eef5]"><td className="px-5 py-3.5"><p className="font-semibold">{member.name || member.email}</p><p className="mt-0.5 text-[11px] text-[#657286]">{member.jobTitle || 'Sales intern'} · {member.email}</p></td><td className="px-5 py-3.5"><div className="flex items-center gap-2"><span className="w-8 font-semibold">{number(member.outreachToday)}</span><div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#e9eef5]"><div className="h-full rounded-full bg-[#07121f]" style={{ width: `${Math.min(Number(member.outreachToday) / 20 * 100, 100)}%` }} /></div></div></td><td className="px-5 py-3.5">{number(member.leadCount)}</td><td className="px-5 py-3.5">{number(member.prospects)}</td><td className="px-5 py-3.5">{number(member.clients)}</td><td className="px-5 py-3.5">{number(member.onboarded)}</td><td className="px-5 py-3.5">{number(member.successful)}</td><td className="px-5 py-3.5">{money(member.spend)}</td><td className="px-5 py-3.5 font-semibold">{money(Number(member.spend) * 0.1)}</td></tr>)}</tbody></table></div> : <p className="p-10 text-center text-sm text-[#657286]">No sales team members have joined this workspace yet.</p>}
          </section>
        </> : <><section className="mt-6 grid gap-3 md:grid-cols-3">{page.cards.map(([label, value, detail]) => <article key={label} className="rounded-2xl border border-[#d6deea] bg-white p-5 shadow-[0_3px_12px_rgba(20,34,28,0.025)]"><p className="text-xs font-medium text-[#657286]">{label}</p><p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{value}</p><p className="mt-2 text-xs text-[#657286]">{detail}</p></article>)}</section><section className="mt-3 rounded-2xl border border-[#d6deea] bg-white p-6 shadow-[0_3px_12px_rgba(20,34,28,0.025)]"><div className="flex items-center gap-3"><CheckCircle2 className="size-5 text-[#07121f]" /><div><h2 className="font-semibold">Your workspace is ready</h2><p className="mt-1 text-sm text-[#657286]">This section is connected to {organization.name}. Continue building your team workspace from here.</p></div></div></section></>}
      </section></div>
    </main>
  )
}
