import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { CalendarDays, CheckCircle2, ClipboardList, CircleHelp, Settings, TrendingUp, Users } from 'lucide-react'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

const content = {
  tasks: { title: 'Tasks', eyebrow: 'Workspace / Tasks', description: 'Coordinate follow-ups and keep every sales motion moving.', icon: ClipboardList, cards: [['Open tasks', '12', 'Across your sales team'], ['Due today', '4', 'Needs attention'], ['Completed this week', '28', 'Strong team momentum']] },
  calendar: { title: 'Calendar', eyebrow: 'Workspace / Calendar', description: 'Keep reviews, demos, and team check-ins in one place.', icon: CalendarDays, cards: [['Today', '3', 'Scheduled events'], ['This week', '14', 'Team commitments'], ['Next review', 'Tomorrow', 'Progress review']] },
  analytics: { title: 'Analytics', eyebrow: 'Workspace / Analytics', description: 'Understand the activity behind your team’s sales performance.', icon: TrendingUp, cards: [['Leads generated', '0', 'Connect staff activity to see trends'], ['Qualification rate', '0%', 'No performance data yet'], ['Revenue', '₦0', 'Recorded this period']] },
  team: { title: 'Team', eyebrow: 'Workspace / Team', description: 'Manage your sales staff, seats, and invitation links.', icon: Users, cards: [['Active staff', '0', 'Registered team members'], ['Available seats', '0', 'Based on your current plan'], ['Invite status', 'Ready', 'Create a secure invite link']] },
  settings: { title: 'Settings', eyebrow: 'General / Settings', description: 'Manage your organization profile and workspace preferences.', icon: Settings, cards: [['Organization profile', 'Ready', 'Company details and industry'], ['Plan', 'Current', 'Billing and seat limits'], ['Security', 'Protected', 'Authentication and access']] },
  help: { title: 'Help center', eyebrow: 'General / Help', description: 'Find guidance for managing your Dara workspace.', icon: CircleHelp, cards: [['Getting started', '3 steps', 'Set up your team'], ['Invitations', 'Guide', 'Add staff securely'], ['Need support?', 'Contact us', 'We are here to help']] },
} as const

export async function AdminSectionPage({ section }: { section: keyof typeof content }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const result = await pool.query(`SELECT o."name", o."staffCount", o."plan" FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId" = o."id" WHERE m."authUserId" = $1 AND m."role" = 'ADMIN' LIMIT 1`, [session.user.id])
  const organization = result.rows[0]
  if (!organization) redirect('/onboarding')
  const page = content[section]
  const Icon = page.icon
  return <main className="min-h-screen bg-[#f4f6f9] p-3 text-[#07121f] md:p-5"><div className="mx-auto min-h-[calc(100vh-2rem)] max-w-6xl rounded-[24px] border border-[#d6deea] bg-[#ffffff] p-5 shadow-[0_10px_30px_rgba(20,34,28,0.035)] md:p-8"><div className="flex items-center justify-between border-b border-[#d6deea] pb-5"><div><p className="text-xs text-[#657286]">{organization.name} / {page.eyebrow.split(' / ')[1]}</p><div className="mt-2 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#e9eef5] text-[#5366df]"><Icon className="size-5" /></span><div><h1 className="text-3xl font-semibold tracking-[-0.04em]">{page.title}</h1><p className="mt-1 text-sm text-[#657286]">{page.description}</p></div></div></div><a href="/admin" className="rounded-full border border-[#d6deea] bg-white px-4 py-2 text-xs font-semibold text-[#596579]">Back to dashboard</a></div><section className="mt-6 grid gap-3 md:grid-cols-3">{page.cards.map(([label, value, detail]) => <article key={label} className="rounded-2xl border border-[#d6deea] bg-white p-5 shadow-[0_3px_12px_rgba(20,34,28,0.025)]"><p className="text-xs font-medium text-[#657286]">{label}</p><p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{value}</p><p className="mt-2 text-xs text-[#657286]">{detail}</p></article>)}</section><section className="mt-3 rounded-2xl border border-[#d6deea] bg-white p-6 shadow-[0_3px_12px_rgba(20,34,28,0.025)]"><div className="flex items-center gap-3"><CheckCircle2 className="size-5 text-[#5366df]" /><div><h2 className="font-semibold">Your workspace is ready</h2><p className="mt-1 text-sm text-[#657286]">This section is connected to {organization.name}. Continue building your team workspace from here.</p></div></div></section></div></main>
} 
