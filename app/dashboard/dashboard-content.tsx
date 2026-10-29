'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, ArrowUpRight, Bell, CalendarDays, ChevronDown, CircleHelp, LayoutDashboard, LogOut, Menu, Plus, Search, Target, Users, X } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

type Lead = { id: string; name: string; company: string; email: string; phone: string; industry: string; stage: string; value: number; outreachCount: number; lastOutreachChannel: string; lastOutreachNote: string; lastActivity: string }
type Month = { label: string; value: number }
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
  opportunities: Lead[]
  monthlyRevenue: Month[]
}

const stages = [
  ['LEAD', 'Lead'], ['PROSPECT', 'Prospect'], ['CLIENT', 'Client'],
  ['ONBOARDED', 'Onboarded'], ['CAMPAIGN_SUCCESSFUL', 'Campaign successful'], ['LOST', 'Lost'],
]
const channels = [['SOCIAL_MEDIA', 'Social media'], ['WEBSITE', 'Website'], ['EMAIL', 'Email'], ['PHONE', 'Phone'], ['IN_PERSON', 'In person'], ['OTHER', 'Other']]
const money = (value: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value || 0)
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase()

export default function DashboardContent({ data }: { data: DashboardData }) {
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showNewLead, setShowNewLead] = useState(false)
  const [outreachLead, setOutreachLead] = useState<Lead | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const filteredLeads = useMemo(() => data.opportunities.filter((item) => `${item.name} ${item.company} ${item.email} ${item.industry}`.toLowerCase().includes(query.toLowerCase())), [data.opportunities, query])
  const chartMax = Math.max(...data.monthlyRevenue.map((month) => month.value), 1)
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const firstName = data.user.name.split(/\s+/)[0] || data.user.name

  async function signOut() {
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  async function saveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true); setError('')
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/sales/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'Could not save this lead.'); setPending(false); return }
    setShowNewLead(false); setPending(false); router.refresh()
  }

  async function logOutreach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!outreachLead) return
    setPending(true); setError('')
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/sales/outreach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...Object.fromEntries(form), leadId: outreachLead.id }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'Could not log outreach.'); setPending(false); return }
    setOutreachLead(null); setPending(false); router.refresh()
  }

  async function updateLead(event: FormEvent<HTMLFormElement>, leadId: string) {
    event.preventDefault(); setError('')
    const form = new FormData(event.currentTarget)
    const response = await fetch(`/api/sales/leads/${leadId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'Could not update this lead.'); return }
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#f4f6f9] text-[#07121f]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[228px] shrink-0 flex-col border-r border-[#d6deea] bg-white px-5 py-6 lg:flex">
          <div className="flex items-center gap-2 px-2"><div className="flex size-8 items-center justify-center rounded-xl bg-[#07121f] text-sm font-bold text-white">D</div><span className="font-semibold tracking-tight">Dara</span></div>
          <div className="mt-10 flex flex-1 flex-col gap-1"><p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#657286]">Workspace</p><div className="flex items-center gap-3 rounded-xl bg-[#e9eef5] px-3 py-2.5 text-sm font-semibold text-[#07121f]"><LayoutDashboard className="size-[17px]" />Overview</div><a href="#leads" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#657286] hover:bg-[#f4f6f9]"><Users className="size-[17px]" />Leads &amp; prospects <span className="ml-auto rounded-full bg-[#e9eef5] px-1.5 py-0.5 text-[10px] font-semibold">{data.leadsCreated}</span></a><a href="#performance" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#657286] hover:bg-[#f4f6f9]"><Activity className="size-[17px]" />Performance</a></div>
          <div className="border-t border-[#d6deea] pt-4"><div className="flex items-center gap-3 px-2"><div className="flex size-8 items-center justify-center rounded-full bg-[#07121f] text-xs font-semibold text-white">{initials(data.user.name)}</div><div className="min-w-0"><p className="truncate text-xs font-semibold">{data.user.name}</p><p className="truncate text-[11px] text-[#657286]">{data.user.jobTitle}</p></div><button onClick={signOut} aria-label="Sign out" className="ml-auto text-[#657286] hover:text-[#07121f]"><LogOut className="size-4" /></button></div></div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-[76px] items-center justify-between border-b border-[#d6deea] bg-white px-5 sm:px-8"><div className="flex items-center gap-3"><button aria-label="Open navigation" className="lg:hidden"><Menu className="size-5" /></button><div><p className="text-xs text-[#657286]">{today}</p><h1 className="text-lg font-semibold tracking-tight">Good day, {firstName}</h1></div></div><div className="flex items-center gap-3"><button className="hidden rounded-xl border border-[#d6deea] bg-white px-3 py-2 text-xs font-medium text-[#596579] sm:flex sm:items-center sm:gap-2"><CircleHelp className="size-4" />Help center</button><button aria-label="Notifications" className="relative rounded-xl border border-[#d6deea] bg-white p-2.5"><Bell className="size-4" /></button><button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 rounded-xl border border-[#d6deea] bg-white p-1.5 pr-2.5"><div className="flex size-7 items-center justify-center rounded-full bg-[#07121f] text-[10px] font-semibold text-white">{initials(data.user.name)}</div><ChevronDown className="size-3.5 text-[#657286]" /></button></div></header>
          {menuOpen && <div className="absolute right-5 top-[68px] z-20 rounded-xl border border-[#d6deea] bg-white p-3 shadow-lg sm:right-8"><p className="px-2 pb-2 text-xs font-semibold">{data.user.email}</p><button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#657286] hover:bg-[#f4f6f9]"><LogOut className="size-4" />Sign out</button></div>}

          <div className="px-5 py-7 sm:px-8 sm:py-9">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#657286]"><span className="size-1.5 rounded-full bg-[#a5f36c]" />{data.organizationName} · {data.user.jobTitle}</div><h2 className="text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-none tracking-[-0.055em]">Build your pipeline, <span className="font-serif font-normal italic">one conversation at a time.</span></h2><p className="mt-3 max-w-lg text-sm leading-6 text-[#657286]">Find businesses that can benefit from Seltra, record every touchpoint, and guide advertisers from first contact to successful campaigns.</p></div><button onClick={() => { setError(''); setShowNewLead(true) }} className="flex w-fit items-center gap-2 rounded-xl bg-[#07121f] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="size-4" />Add outreach</button></div>

            <section className="mb-4 rounded-2xl border border-[#d6deea] bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#657286]">Today&apos;s outreach</p><p className="mt-1 text-2xl font-semibold">{data.outreachToday} <span className="text-base font-medium text-[#657286]">/ {data.dailyTarget}</span></p></div><p className="text-sm text-[#657286]">{Math.max(data.dailyTarget - data.outreachToday, 0)} more to reach today&apos;s target</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e9eef5]"><div className="h-full rounded-full bg-[#07121f] transition-all" style={{ width: `${Math.min(data.outreachToday / data.dailyTarget * 100, 100)}%` }} /></div><p className="mt-2 text-[11px] text-[#657286]">Every new business outreach and follow-up is counted toward your daily target of 20.</p></section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
              { label: 'Businesses in pipeline', value: data.leadsCreated.toLocaleString(), icon: Target },
              { label: 'Prospects', value: data.prospects.toLocaleString(), icon: Users },
              { label: 'Advertisers onboarded', value: data.onboarded.toLocaleString(), icon: ArrowUpRight },
              { label: 'Earned commission', value: money(data.commission), icon: Activity },
            ].map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border border-[#d6deea] bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs font-medium text-[#657286]">{label}</p><span className="rounded-lg bg-[#e9eef5] p-2 text-[#07121f]"><Icon className="size-4" /></span></div><p className="mt-5 truncate text-2xl font-semibold tracking-tight">{value}</p></article>)}</div>

            <div id="performance" className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_1fr]"><section className="rounded-2xl border border-[#d6deea] bg-white p-5 sm:p-6"><div className="flex items-start justify-between"><div><h3 className="font-semibold">Successful campaign spend</h3><p className="mt-1 text-xs text-[#657286]">Advertiser spend from campaigns marked successful</p></div><CalendarDays className="size-4 text-[#657286]" /></div>{data.monthlyRevenue.length ? <div className="mt-8 flex h-48 items-end gap-2 border-b border-[#e9eef5] px-2 sm:gap-4">{data.monthlyRevenue.map((month, index) => <div key={`${month.label}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div title={money(month.value)} className={`w-full max-w-10 rounded-t-md ${index === data.monthlyRevenue.length - 1 ? 'bg-[#07121f]' : 'bg-[#cbd5e1]'}`} style={{ height: `${Math.max((month.value / chartMax) * 85, 3)}%` }} /><span className="text-[10px] text-[#657286]">{month.label}</span></div>)}</div> : <div className="mt-6 flex h-48 items-center justify-center rounded-xl bg-[#f4f6f9] px-6 text-center text-sm text-[#657286]">Successful advertiser campaign spend will appear here.</div>}</section>
              <section className="rounded-2xl bg-[#07121f] p-6 text-white"><div className="flex size-10 items-center justify-center rounded-xl bg-white/10"><Activity className="size-5 text-[#a5f36c]" /></div><h3 className="mt-5 text-lg font-semibold tracking-tight">Sales journey</h3><p className="mt-2 text-sm leading-6 text-[#d6deea]">Move each business from lead to prospect, client, and onboarded advertiser.</p><div className="mt-5 space-y-3">{[['Clients', data.clients], ['Onboarded', data.onboarded], ['Campaigns successful', data.dealsWon]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-white/10 pb-2 text-sm"><span className="text-[#d6deea]">{label}</span><strong>{value}</strong></div>)}</div><p className="mt-4 text-xs text-[#d6deea]">Commission is 10% of advertiser spend once the campaign is successful. Earned so far: <strong className="text-[#a5f36c]">{money(data.commission)}</strong></p></section></div>

            <section id="leads" className="mt-4 overflow-hidden rounded-2xl border border-[#d6deea] bg-white"><div className="flex flex-col gap-4 border-b border-[#e9eef5] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">Leads, prospects &amp; clients</h3><p className="mt-1 text-xs text-[#657286]">Track each business and every step toward a successful Seltra campaign.</p></div><div className="flex items-center gap-2"><div className="flex items-center rounded-lg border border-[#d6deea] px-2.5"><Search className="size-3.5 text-[#657286]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search businesses" className="w-36 bg-transparent px-2 py-2 text-xs outline-none placeholder:text-[#657286] sm:w-44" /></div><button onClick={() => { setError(''); setShowNewLead(true) }} className="flex items-center gap-1 rounded-lg bg-[#07121f] px-3 py-2 text-xs font-semibold text-white"><Plus className="size-3.5" />Add</button></div></div>
              {error && !showNewLead && !outreachLead && <p role="alert" className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              {filteredLeads.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-xs"><thead className="bg-[#f4f6f9] text-[10px] uppercase tracking-[0.12em] text-[#657286]"><tr><th className="px-5 py-3 font-semibold">Business / contact</th><th className="px-5 py-3 font-semibold">Stage</th><th className="px-5 py-3 font-semibold">Outreach</th><th className="px-5 py-3 font-semibold">Advertiser spend</th><th className="px-5 py-3 font-semibold">Commission</th><th className="px-5 py-3 font-semibold">Last touch</th><th className="px-5 py-3" /></tr></thead><tbody>{filteredLeads.map((item) => <tr key={item.id} className="border-t border-[#f4f6f9] align-top"><td className="px-5 py-3.5"><p className="font-semibold">{item.company}</p><p className="mt-0.5 text-[11px] text-[#657286]">{item.name}{item.email ? ` · ${item.email}` : ''}{item.industry ? ` · ${item.industry}` : ''}</p></td><td className="px-5 py-3.5"><select form={`lead-form-${item.id}`} name="stage" defaultValue={item.stage} className="rounded-lg border border-[#d6deea] bg-white px-2 py-1.5 text-[11px]">{stages.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></td><td className="px-5 py-3.5"><p>{item.outreachCount} touch{item.outreachCount === 1 ? '' : 'es'}</p>{item.lastOutreachChannel && <p className="mt-1 text-[10px] text-[#657286]">Last: {item.lastOutreachChannel.replaceAll('_', ' ').toLowerCase()}</p>}{item.lastOutreachNote && <p className="mt-1 max-w-48 truncate text-[10px] text-[#657286]" title={item.lastOutreachNote}>{item.lastOutreachNote}</p>}<button onClick={() => { setError(''); setOutreachLead(item) }} className="mt-1 text-[11px] font-semibold text-[#07121f] underline">Log follow-up</button></td><td className="px-5 py-3.5"><input key={`${item.id}-${item.value}`} form={`lead-form-${item.id}`} name="advertiserSpend" type="number" min="0" step="0.01" defaultValue={item.value || ''} placeholder="₦0" className="w-28 rounded-lg border border-[#d6deea] px-2 py-1.5" /></td><td className="px-5 py-3.5 font-semibold">{item.stage === 'CAMPAIGN_SUCCESSFUL' ? money(item.value * 0.1) : '—'}</td><td className="px-5 py-3.5 text-[#657286]">{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(item.lastActivity))}</td><td className="px-5 py-3.5"><form id={`lead-form-${item.id}`} onSubmit={(event) => updateLead(event, item.id)}><button className="rounded-lg border border-[#d6deea] px-3 py-1.5 text-[11px] font-semibold hover:bg-[#f4f6f9]">Save stage/spend</button></form></td></tr>)}</tbody></table></div> : <div className="p-10 text-center"><p className="font-medium">{query ? 'No matching businesses' : 'No leads recorded yet'}</p><p className="mt-1 text-sm text-[#657286]">{query ? 'Try another search.' : 'Add a business when you make your first outreach.'}</p></div>}
            </section>
          </div>
        </section>
      </div>

      {(showNewLead || outreachLead) && <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#07121f]/50 p-4"><section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-xl font-semibold">{showNewLead ? 'Record a business outreach' : `Log outreach · ${outreachLead?.company}`}</h2><p className="mt-1 text-sm text-[#657286]">Capture the business and how you contacted them.</p></div><button onClick={() => { setShowNewLead(false); setOutreachLead(null); setError('') }} aria-label="Close dialog"><X className="size-5" /></button></div>
        <form onSubmit={showNewLead ? saveLead : logOutreach} className="grid gap-3 sm:grid-cols-2">{showNewLead && <><label className="text-xs font-medium">Business name<input name="businessName" required maxLength={160} placeholder="Business or organization" className="mt-1 w-full rounded-lg border border-[#d6deea] px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium">Contact person<input name="contactName" placeholder="Name" className="mt-1 w-full rounded-lg border border-[#d6deea] px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium">Email<input name="email" type="email" placeholder="contact@business.com" className="mt-1 w-full rounded-lg border border-[#d6deea] px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium">Phone<input name="phone" placeholder="Phone number" className="mt-1 w-full rounded-lg border border-[#d6deea] px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium">Industry<input name="industry" placeholder="e.g. Events, retail, coworking" className="mt-1 w-full rounded-lg border border-[#d6deea] px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium">Website<input name="website" type="url" placeholder="https://" className="mt-1 w-full rounded-lg border border-[#d6deea] px-3 py-2.5 text-sm" /></label></>}
          <label className="text-xs font-medium">Outreach channel<select name="channel" required className="mt-1 w-full rounded-lg border border-[#d6deea] bg-white px-3 py-2.5 text-sm">{channels.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="text-xs font-medium">Platform / detail<input name="platform" placeholder="Instagram, LinkedIn, company site…" className="mt-1 w-full rounded-lg border border-[#d6deea] px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium sm:col-span-2">Notes<input name="note" placeholder="What did you discuss? What is the next step?" className="mt-1 w-full rounded-lg border border-[#d6deea] px-3 py-2.5 text-sm" /></label>
          {error && <p role="alert" className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-2 flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => { setShowNewLead(false); setOutreachLead(null) }} className="rounded-lg border border-[#d6deea] px-4 py-2.5 text-sm">Cancel</button><button disabled={pending} className="rounded-lg bg-[#07121f] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Saving…' : showNewLead ? 'Save outreach' : 'Log follow-up'}</button></div>
        </form></section></div>}
    </main>
  )
}
