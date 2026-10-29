'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, ArrowDownRight, ArrowUpRight, Bell, CalendarDays, ChevronDown, CircleHelp, LayoutDashboard, LogOut, Menu, MoreHorizontal, Search, Target, Users } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

type Opportunity = { id: string; name: string; company: string; email: string; stage: string; value: number; lastActivity: string }
type Month = { label: string; value: number }
export type DashboardData = {
  user: { name: string; email: string; jobTitle: string }
  organizationName: string
  leadsCreated: number
  qualifiedLeads: number
  dealsWon: number
  revenue: number
  pipelineValue: number
  opportunities: Opportunity[]
  monthlyRevenue: Month[]
}

const money = (value: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value || 0)
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase()

export default function DashboardContent({ data }: { data: DashboardData }) {
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const filteredOpportunities = useMemo(() => data.opportunities.filter((item) => `${item.name} ${item.company} ${item.email}`.toLowerCase().includes(query.toLowerCase())), [data.opportunities, query])
  const qualificationRate = data.leadsCreated ? Math.round((data.qualifiedLeads / data.leadsCreated) * 100) : 0
  const chartMax = Math.max(...data.monthlyRevenue.map((month) => month.value), 1)
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const firstName = data.user.name.split(/\s+/)[0] || data.user.name

  async function signOut() {
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#f4f6f9] text-[#07121f]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[228px] shrink-0 flex-col border-r border-[#d6deea] bg-white px-5 py-6 lg:flex">
          <div className="flex items-center gap-2 px-2"><div className="flex size-8 items-center justify-center rounded-xl bg-[#07121f] text-sm font-bold text-white">D</div><span className="font-semibold tracking-tight">Dara</span></div>
          <div className="mt-10 flex flex-1 flex-col gap-1">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#657286]">Workspace</p>
            <div className="flex items-center gap-3 rounded-xl bg-[#e9eef5] px-3 py-2.5 text-sm font-semibold text-[#07121f]"><LayoutDashboard className="size-[17px]" />Overview</div>
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#657286]"><Users className="size-[17px]" />Opportunities <span className="ml-auto rounded-full bg-[#e9eef5] px-1.5 py-0.5 text-[10px] font-semibold">{data.opportunities.length}</span></div>
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#657286]"><Activity className="size-[17px]" />Performance</div>
          </div>
          <div className="border-t border-[#d6deea] pt-4"><div className="flex items-center gap-3 px-2"><div className="flex size-8 items-center justify-center rounded-full bg-[#07121f] text-xs font-semibold text-white">{initials(data.user.name)}</div><div className="min-w-0"><p className="truncate text-xs font-semibold">{data.user.name}</p><p className="truncate text-[11px] text-[#657286]">{data.user.jobTitle}</p></div><button onClick={signOut} aria-label="Sign out" className="ml-auto text-[#657286] hover:text-[#07121f]"><LogOut className="size-4" /></button></div></div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-[76px] items-center justify-between border-b border-[#d6deea] bg-white px-5 sm:px-8">
            <div className="flex items-center gap-3"><button aria-label="Open navigation" className="lg:hidden"><Menu className="size-5" /></button><div><p className="text-xs text-[#657286]">{today}</p><h1 className="text-lg font-semibold tracking-tight">Good day, {firstName}</h1></div></div>
            <div className="flex items-center gap-3"><button className="hidden rounded-xl border border-[#d6deea] bg-white px-3 py-2 text-xs font-medium text-[#596579] sm:flex sm:items-center sm:gap-2"><CircleHelp className="size-4" />Help center</button><button aria-label="Notifications" className="relative rounded-xl border border-[#d6deea] bg-white p-2.5"><Bell className="size-4" /></button><button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 rounded-xl border border-[#d6deea] bg-white p-1.5 pr-2.5"><div className="flex size-7 items-center justify-center rounded-full bg-[#07121f] text-[10px] font-semibold text-white">{initials(data.user.name)}</div><ChevronDown className="size-3.5 text-[#657286]" /></button></div>
          </header>

          {menuOpen && <div className="absolute right-5 top-[68px] z-20 rounded-xl border border-[#d6deea] bg-white p-3 shadow-lg sm:right-8"><p className="px-2 pb-2 text-xs font-semibold">{data.user.email}</p><button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#657286] hover:bg-[#f4f6f9]"><LogOut className="size-4" />Sign out</button></div>}

          <div className="px-5 py-7 sm:px-8 sm:py-9">
            <div className="mb-7"><div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#657286]"><span className="size-1.5 rounded-full bg-[#a5f36c]" />{data.organizationName} · {data.user.jobTitle}</div><h2 className="text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-none tracking-[-0.055em]">Your sales, <span className="font-serif font-normal italic text-[#07121f]">in motion.</span></h2><p className="mt-3 max-w-lg text-sm leading-6 text-[#657286]">Your personal sales activity and results for {data.organizationName}.</p></div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Pipeline value', value: money(data.pipelineValue), icon: Target },
                { label: 'Revenue recorded', value: money(data.revenue), icon: ArrowUpRight },
                { label: 'Deals won', value: data.dealsWon.toLocaleString(), icon: ArrowDownRight },
                { label: 'Qualified leads', value: `${data.qualifiedLeads.toLocaleString()} (${qualificationRate}%)`, icon: Users },
              ].map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border border-[#d6deea] bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs font-medium text-[#657286]">{label}</p><span className="rounded-lg bg-[#e9eef5] p-2 text-[#07121f]"><Icon className="size-4" /></span></div><p className="mt-5 truncate text-2xl font-semibold tracking-tight">{value}</p></article>)}
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
              <section className="rounded-2xl border border-[#d6deea] bg-white p-5 sm:p-6"><div className="flex items-start justify-between"><div><h3 className="font-semibold">Revenue overview</h3><p className="mt-1 text-xs text-[#657286]">Monthly revenue recorded for your account</p></div><CalendarDays className="size-4 text-[#657286]" /></div>
                {data.monthlyRevenue.length ? <><div className="mt-8 flex h-48 items-end gap-2 border-b border-[#e9eef5] px-2 sm:gap-4">{data.monthlyRevenue.map((month, index) => <div key={`${month.label}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div title={money(month.value)} className={`w-full max-w-10 rounded-t-md ${index === data.monthlyRevenue.length - 1 ? 'bg-[#07121f]' : 'bg-[#cbd5e1]'}`} style={{ height: `${Math.max((month.value / chartMax) * 85, 3)}%` }} /><span className="text-[10px] text-[#657286]">{month.label}</span></div>)}</div></> : <div className="mt-6 flex h-48 items-center justify-center rounded-xl bg-[#f4f6f9] px-6 text-center text-sm text-[#657286]">No monthly revenue has been recorded for your account yet.</div>}
              </section>
              <section className="rounded-2xl bg-[#07121f] p-6 text-white"><div className="flex size-10 items-center justify-center rounded-xl bg-white/10"><Activity className="size-5 text-[#a5f36c]" /></div><h3 className="mt-5 text-lg font-semibold tracking-tight">Your performance</h3><p className="mt-2 text-sm leading-6 text-[#d6deea]">{data.leadsCreated.toLocaleString()} leads created and {data.qualifiedLeads.toLocaleString()} qualified so far.</p><div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3.5"><p className="text-xs font-medium text-[#d6deea]">Qualification rate</p><p className="mt-2 text-3xl font-semibold">{qualificationRate}%</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#a5f36c]" style={{ width: `${Math.min(qualificationRate, 100)}%` }} /></div></div></section>
            </div>

            <section className="mt-4 overflow-hidden rounded-2xl border border-[#d6deea] bg-white"><div className="flex flex-col gap-4 border-b border-[#e9eef5] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">My opportunities</h3><p className="mt-1 text-xs text-[#657286]">Opportunities assigned to you</p></div><div className="flex items-center rounded-lg border border-[#d6deea] px-2.5"><Search className="size-3.5 text-[#657286]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search opportunities" className="w-40 bg-transparent px-2 py-2 text-xs outline-none placeholder:text-[#657286]" /></div></div>
              {filteredOpportunities.length ? <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="bg-[#f4f6f9] text-[10px] uppercase tracking-[0.12em] text-[#657286]"><tr><th className="px-5 py-3 font-semibold">Contact</th><th className="px-5 py-3 font-semibold">Stage</th><th className="px-5 py-3 font-semibold">Value</th><th className="px-5 py-3 font-semibold">Last activity</th><th className="px-5 py-3" /></tr></thead><tbody>{filteredOpportunities.map((item) => <tr key={item.id} className="border-t border-[#f4f6f9]"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center rounded-full bg-[#e9eef5] text-[10px] font-semibold text-[#07121f]">{initials(item.name)}</div><div><p className="font-semibold">{item.name}</p><p className="mt-0.5 text-[11px] text-[#657286]">{item.company} · {item.email}</p></div></div></td><td className="px-5 py-3.5"><span className="rounded-full bg-[#f4f6f9] px-2.5 py-1 text-[10px] font-medium text-[#657286]">{item.stage}</span></td><td className="px-5 py-3.5 font-semibold">{money(item.value)}</td><td className="px-5 py-3.5 text-[#657286]">{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.lastActivity))}</td><td className="px-5 py-3.5 text-right"><MoreHorizontal className="ml-auto size-4 text-[#657286]" /></td></tr>)}</tbody></table></div> : <div className="p-10 text-center"><p className="font-medium">{query ? 'No matching opportunities' : 'No opportunities assigned yet'}</p><p className="mt-1 text-sm text-[#657286]">{query ? 'Try another search.' : 'Assigned opportunities will appear here when they are added to your workspace.'}</p></div>}
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}
