'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, ArrowRight, Bell, CheckCircle2, ChevronDown, CircleHelp, LayoutDashboard, LogOut, Menu, Target, Users } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { RecentLeadRow, SalesStageTracker, type RecentLead, type SalesStageCounts } from '@/components/sales-dashboard-widgets'

export type DashboardData = {
  user: { name: string; email: string; jobTitle: string }
  organizationName: string
  leadsCreated: number
  qualifiedLeads: number
  dealsWon: number
  revenue: number
  pipelineValue: number
  prospects: number
  clients: number
  onboarded: number
  commission: number
  outreachToday: number
  dailyTarget: number
  monthlyRevenue: { label: string; value: number }[]
  stageCounts: SalesStageCounts
  recentLead: RecentLead | null
}

const money = (value: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value || 0)
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase()

export default function DashboardContent({ data }: { data: DashboardData }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date())
  const firstName = data.user.name.split(/\s+/)[0] || data.user.name

  async function signOut() {
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#f4f6f9] p-3 text-[#07121f] md:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-3">
        <DashboardSidebar role="STAFF" userName={data.user.name} userEmail={data.user.email} organizationName={data.organizationName} jobTitle={data.user.jobTitle} />

        <section className="min-w-0 flex-1 rounded-[26px] border-[1px] border-black/30 bg-[#fbfcfe] px-4 py-4 shadow-[0_10px_30px_rgba(7,18,31,0.04)] sm:px-7 sm:py-6">
          <header className="flex items-center justify-between border-b-[1px] border-black/30 pb-4"><div className="flex items-center gap-3"><button aria-label="Open navigation" className="lg:hidden"><Menu className="size-5" /></button><div><p className="text-[11px] text-[#657286]">{today}</p><h1 className="mt-1 font-serif text-xl font-semibold">Good morning, {firstName}</h1></div></div><div className="flex items-center gap-2"><button aria-label="Help center" className="hidden rounded-full border-[1px] border-black/30 bg-white p-2.5 text-[#657286] sm:block"><CircleHelp className="size-4" /></button><button aria-label="Notifications" className="rounded-full border-[1px] border-black/30 bg-white p-2.5 text-[#657286]"><Bell className="size-4" /></button><button onClick={() => setMenuOpen(!menuOpen)} aria-label="Account menu" className="flex items-center gap-2 rounded-full border-[1px] border-black/30 bg-white p-1.5"><span className="flex size-7 items-center justify-center rounded-full bg-[#07121f] text-[10px] font-bold text-white">{initials(data.user.name)}</span><ChevronDown className="mr-1 size-3.5 text-[#657286]" /></button></div></header>
          {menuOpen && <div className="absolute right-7 top-[76px] z-20 rounded-xl border-[1px] border-black/30 bg-white p-3 shadow-lg"><p className="px-2 pb-2 text-xs font-semibold">{data.user.email}</p><button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#657286] hover:bg-[#f4f6f9]"><LogOut className="size-4" />Sign out</button></div>}

          <div className="py-6"><div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs text-[#657286]">{data.organizationName} · {data.user.jobTitle}</p><h2 className="mt-1 font-serif text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Your sales desk</h2><p className="mt-1 text-sm text-[#657286]">Turn today&apos;s conversations into tomorrow&apos;s clients.</p></div><Link href="/dashboard/leads" className="flex w-fit items-center gap-2 rounded-full bg-[#07121f] px-4 py-2.5 text-xs font-semibold text-white">Record outreach <ArrowRight className="size-3.5" /></Link></div>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
              { label: 'Outreach today', value: `${data.outreachToday}/${data.dailyTarget}`, detail: `${Math.max(data.dailyTarget - data.outreachToday, 0)} to daily goal`, icon: Target, featured: true },
              { label: 'Businesses reached', value: data.leadsCreated, detail: 'Your current pipeline', icon: Users },
              { label: 'Prospects', value: data.prospects, detail: `${data.clients} converted to clients`, icon: Activity },
              { label: 'Commission earned', value: money(data.commission), detail: '10% of successful campaign spend', icon: CheckCircle2 },
            ].map(({ label, value, detail, icon: Icon, featured }) => <article key={label} className={`rounded-[20px] border-[1px] p-4 shadow-[0_5px_18px_rgba(7,18,31,0.035)] ${featured ? 'border-black/30 bg-[#07121f] text-white' : 'border-black/30 bg-white'}`}><div className="flex items-center justify-between"><p className={`text-xs font-medium ${featured ? 'text-[#d6deea]' : 'text-[#657286]'}`}>{label}</p><span className={`rounded-xl p-2 ${featured ? 'bg-white/10 text-[#a5f36c]' : 'bg-[#e9eef5] text-[#07121f]'}`}><Icon className="size-4" /></span></div><p className="mt-4 truncate font-serif text-2xl font-semibold">{value}</p><p className={`mt-1 text-[10px] ${featured ? 'text-[#d6deea]' : 'text-[#657286]'}`}>{detail}</p>{featured && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#a5f36c]" style={{ width: `${Math.min(data.outreachToday / data.dailyTarget * 100, 100)}%` }} /></div>}</article>)}</section>

            <div id="pipeline" className="mt-4"><SalesStageTracker counts={data.stageCounts} /></div>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_.9fr]"><article className="rounded-[24px] border-[1px] border-black/30 bg-white p-5 shadow-[0_8px_24px_rgba(7,18,31,0.035)] sm:p-6"><div className="flex items-center justify-between gap-3"><div><h3 className="font-serif text-lg font-semibold">Recent leads</h3><p className="mt-1 text-xs text-[#657286]">Your newest business in the pipeline.</p></div><Link href="/dashboard/leads" className="shrink-0 rounded-full border-[1px] border-black/30 px-3 py-2 text-[10px] font-semibold hover:bg-[#f4f6f9]">View more</Link></div>{data.recentLead ? <RecentLeadRow lead={data.recentLead} /> : <p className="mt-4 border-[1px] border-black/30 py-6 text-sm text-[#657286]">Your first business outreach will appear here.</p>}</article>
              <article className="rounded-[24px] border-[1px] border-black/30 bg-white p-5 shadow-[0_8px_24px_rgba(7,18,31,0.035)] sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-serif text-lg font-semibold">Campaign rewards</h3><p className="mt-1 text-xs text-[#657286]">Commission is earned after success.</p></div><span className="rounded-xl bg-[#e9eef5] p-2"><CheckCircle2 className="size-4" /></span></div><p className="mt-5 font-serif text-3xl font-semibold">{money(data.commission)}</p><p className="mt-1 text-[11px] text-[#657286]">10% of {money(data.revenue)} advertiser spend from successful campaigns.</p><div className="mt-5 flex items-center justify-between border-t-[1px] border-black/30 pt-4 text-xs"><span className="text-[#657286]">Campaigns successful</span><strong>{data.dealsWon}</strong></div><div className="mt-3 flex items-center justify-between text-xs"><span className="text-[#657286]">Clients onboarded</span><strong>{data.onboarded}</strong></div><Link href="/dashboard/leads" className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold underline">Open sales pipeline <ArrowRight className="size-3.5" /></Link></article></section>

            <section className="mt-4 flex flex-col justify-between gap-3 rounded-[22px] bg-[#07121f] p-5 text-white sm:flex-row sm:items-center sm:px-7"><div><p className="font-serif text-lg font-semibold">A strong pipeline starts with consistent outreach.</p><p className="mt-1 text-xs text-[#d6deea]">Every call, message, and follow-up adds to your daily progress.</p></div><span className="inline-flex items-center gap-2 text-xs font-semibold text-[#a5f36c]"><CheckCircle2 className="size-4" />{data.outreachToday} of {data.dailyTarget} today</span></section>
          </div>
        </section>
      </div>
    </main>
  )
}
