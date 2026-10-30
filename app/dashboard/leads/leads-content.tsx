'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Search, Users, X } from 'lucide-react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'

export type DailyLead = {
  id: string; businessName: string; contactName: string; email: string; phone: string; industry: string; website: string
  stage: string; advertiserSpend: number; todayTouches: number; lastOutreachAt: string; lastChannel: string; lastPlatform: string; lastNote: string
}

const stages = [['LEAD', 'Lead'], ['PROSPECT', 'Prospect'], ['CLIENT', 'Client'], ['ONBOARDED', 'Onboarded'], ['CAMPAIGN_SUCCESSFUL', 'Campaign successful'], ['LOST', 'Lost']]
const channels = [['SOCIAL_MEDIA', 'Social media'], ['WEBSITE', 'Website'], ['EMAIL', 'Email'], ['PHONE', 'Phone'], ['IN_PERSON', 'In person'], ['OTHER', 'Other']]
const money = (value: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value || 0)

export default function LeadsContent({ user, leads, outreachToday, dailyTarget }: { user: { name: string; email: string; jobTitle: string; organizationName: string }; leads: DailyLead[]; outreachToday: number; dailyTarget: number }) {
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [followUpLead, setFollowUpLead] = useState<DailyLead | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const filteredLeads = useMemo(() => leads.filter((lead) => `${lead.businessName} ${lead.contactName} ${lead.email} ${lead.industry}`.toLowerCase().includes(query.toLowerCase())), [leads, query])
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date())

  async function createLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError('')
    const body = Object.fromEntries(new FormData(event.currentTarget))
    try {
      const response = await fetch('/api/sales/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not save this business.')
      setCreateOpen(false); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this business.') }
    finally { setPending(false) }
  }

  async function logFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!followUpLead) return
    setPending(true); setError('')
    const body = { ...Object.fromEntries(new FormData(event.currentTarget)), leadId: followUpLead.id }
    try {
      const response = await fetch('/api/sales/outreach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not log this follow-up.')
      setFollowUpLead(null); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not log this follow-up.') }
    finally { setPending(false) }
  }

  async function updateStage(event: FormEvent<HTMLFormElement>, lead: DailyLead) {
    event.preventDefault(); setError('')
    const body = Object.fromEntries(new FormData(event.currentTarget))
    try {
      const response = await fetch(`/api/sales/leads/${lead.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not update lead status.')
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update lead status.') }
  }

  return (
    <main className="min-h-screen bg-[#f4f6f9] p-3 text-[#07121f] md:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-3">
        <DashboardSidebar role="STAFF" userName={user.name} userEmail={user.email} organizationName={user.organizationName} jobTitle={user.jobTitle} />
        <section className="min-w-0 flex-1 rounded-[26px] border-[1px] border-black/30 bg-[#fbfcfe] px-4 py-5 shadow-[0_10px_30px_rgba(7,18,31,0.04)] sm:px-7 md:py-7">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#657286] hover:text-[#07121f]"><ArrowLeft className="size-4" />Back to overview</Link>
        <header className="mt-6 flex flex-col justify-between gap-4 border-b-[1px] border-black/30 pb-6 sm:flex-row sm:items-end"><div><p className="text-xs text-[#657286]">{user.organizationName} · {user.jobTitle}</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Today&apos;s leads</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#657286]">Businesses you reached out to today. Keep their contact details and next step up to date as they move from lead to prospect to client.</p><Link href="/dashboard/leads/all" className="mt-3 inline-block text-xs font-semibold underline">View all leads &amp; prospects</Link></div><button onClick={() => { setError(''); setCreateOpen(true) }} className="flex w-fit items-center gap-2 rounded-xl bg-[#07121f] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="size-4" />Record outreach</button></header>

        <section className="mt-5 rounded-2xl border-[1px] border-black/30 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#657286]">Daily outreach target</p><p className="mt-1 text-2xl font-semibold">{outreachToday} <span className="text-base font-medium text-[#657286]">/ {dailyTarget}</span></p></div><p className="text-sm text-[#657286]">{Math.max(dailyTarget - outreachToday, 0)} outreach{dailyTarget - outreachToday === 1 ? '' : 'es'} remaining today</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e9eef5]"><div className="h-full rounded-full bg-[#07121f]" style={{ width: `${Math.min(outreachToday / dailyTarget * 100, 100)}%` }} /></div><p className="mt-2 text-[11px] text-[#657286]">Each initial message and follow-up is counted as an outreach touch.</p></section>

        <section className="mt-5 overflow-hidden rounded-2xl border-[1px] border-black/30 bg-white"><div className="flex flex-col gap-4 border-b-[1px] border-black/30 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Businesses contacted today <span className="ml-1 rounded-full bg-[#e9eef5] px-2 py-1 text-[10px]">{leads.length}</span></h2><p className="mt-1 text-xs text-[#657286]">{today} · Update a business&apos;s stage as your conversation progresses.</p></div><div className="flex items-center rounded-lg border-[1px] border-black/30 px-2.5"><Search className="size-3.5 text-[#657286]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search businesses" className="w-40 bg-transparent px-2 py-2 text-xs outline-none placeholder:text-[#657286] sm:w-52" /></div></div>
          {error && !createOpen && !followUpLead && <p role="alert" className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {filteredLeads.length ? <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left text-xs"><thead className="bg-[#f4f6f9] text-[10px] uppercase tracking-[0.12em] text-[#657286]"><tr><th className="px-5 py-3">Business / contact</th><th className="px-5 py-3">Status &amp; spend</th><th className="px-5 py-3">Today&apos;s outreach</th><th className="px-5 py-3">Last contact</th><th className="px-5 py-3">Commission</th></tr></thead><tbody>{filteredLeads.map((lead) => <tr key={lead.id} className="border-[1px] border-black/30 align-top"><td className="px-5 py-4"><p className="font-semibold">{lead.businessName}</p><p className="mt-1 text-[11px] text-[#657286]">{lead.contactName || 'Contact not named'}{lead.industry ? ` · ${lead.industry}` : ''}</p><p className="mt-1 text-[11px] text-[#657286]">{lead.email}{lead.phone ? ` · ${lead.phone}` : ''}</p>{lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-[#07121f] underline">Website</a>}</td><td className="px-5 py-4"><form id={`lead-${lead.id}`} onSubmit={(event) => updateStage(event, lead)} className="flex flex-col gap-2"><select name="stage" defaultValue={lead.stage} className="rounded-lg border-[1px] border-black/30 bg-white px-2 py-2 text-[11px]">{stages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input name="advertiserSpend" type="number" min="0" step="0.01" defaultValue={lead.advertiserSpend || ''} placeholder="Advertiser spend (₦)" className="w-44 rounded-lg border-[1px] border-black/30 px-2 py-2 text-[11px]" /><button className="w-fit rounded-lg border-[1px] border-black/30 px-2.5 py-1.5 text-[10px] font-semibold hover:bg-[#f4f6f9]">Save status</button></form></td><td className="px-5 py-4"><p className="font-semibold">{lead.todayTouches} touch{lead.todayTouches === 1 ? '' : 'es'}</p><p className="mt-1 text-[11px] text-[#657286]">{lead.lastChannel.replaceAll('_', ' ').toLowerCase()}{lead.lastPlatform ? ` · ${lead.lastPlatform}` : ''}</p>{lead.lastNote && <p title={lead.lastNote} className="mt-1 max-w-56 truncate text-[11px] text-[#657286]">{lead.lastNote}</p>}<button onClick={() => { setError(''); setFollowUpLead(lead) }} className="mt-2 text-[11px] font-semibold underline">Log follow-up</button></td><td className="whitespace-nowrap px-5 py-4 text-[#657286]">{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(lead.lastOutreachAt))}</td><td className="px-5 py-4">{lead.stage === 'CAMPAIGN_SUCCESSFUL' ? <><p className="font-semibold">{money(lead.advertiserSpend * 0.1)}</p><p className="mt-1 text-[11px] text-[#657286]">10% of spend</p></> : <p className="text-[11px] text-[#657286]">After successful campaign</p>}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center"><div className="mx-auto flex size-11 items-center justify-center rounded-full bg-[#e9eef5]"><Users className="size-5 text-[#07121f]" /></div><p className="mt-3 font-semibold">{query ? 'No matching businesses' : 'No businesses contacted today'}</p><p className="mt-1 text-sm text-[#657286]">{query ? 'Try a different search.' : 'Record your first business outreach to start tracking your daily progress.'}</p></div>}
        </section>
      </div>
        </section>
      </div>

      {(createOpen || followUpLead) && <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#07121f]/50 p-4"><section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-xl font-semibold">{createOpen ? 'Record a business outreach' : `Log follow-up · ${followUpLead?.businessName}`}</h2><p className="mt-1 text-sm text-[#657286]">Save who you contacted, where, and what happens next.</p></div><button aria-label="Close dialog" onClick={() => { setCreateOpen(false); setFollowUpLead(null); setError('') }}><X className="size-5" /></button></div>
          <form onSubmit={createOpen ? createLead : logFollowUp} className="grid gap-3 sm:grid-cols-2">{createOpen && <><label className="text-xs font-medium">Business name<input name="businessName" required maxLength={160} placeholder="Business or organization" className="mt-1 w-full rounded-lg border-[1px] border-black/30 px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium">Contact person<input name="contactName" placeholder="Name" className="mt-1 w-full rounded-lg border-[1px] border-black/30 px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium">Email<input name="email" type="email" placeholder="contact@business.com" className="mt-1 w-full rounded-lg border-[1px] border-black/30 px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium">Phone<input name="phone" placeholder="Phone number" className="mt-1 w-full rounded-lg border-[1px] border-black/30 px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium">Industry<input name="industry" placeholder="Events, retail, coworking…" className="mt-1 w-full rounded-lg border-[1px] border-black/30 px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium">Website<input name="website" type="url" placeholder="https://" className="mt-1 w-full rounded-lg border-[1px] border-black/30 px-3 py-2.5 text-sm" /></label></>}
            <label className="text-xs font-medium">Outreach channel<select name="channel" required className="mt-1 w-full rounded-lg border-[1px] border-black/30 bg-white px-3 py-2.5 text-sm">{channels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-medium">Platform / detail<input name="platform" placeholder="Instagram, LinkedIn, company site…" className="mt-1 w-full rounded-lg border-[1px] border-black/30 px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium sm:col-span-2">Notes<input name="note" placeholder="What did you discuss? What is the next step?" className="mt-1 w-full rounded-lg border-[1px] border-black/30 px-3 py-2.5 text-sm" /></label>{error && <p role="alert" className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-2 flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => { setCreateOpen(false); setFollowUpLead(null); setError('') }} className="rounded-lg border-[1px] border-black/30 px-4 py-2.5 text-sm">Cancel</button><button disabled={pending} className="rounded-lg bg-[#07121f] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Saving…' : createOpen ? 'Save outreach' : 'Log follow-up'}</button></div>
          </form></section></div>}
    </main>
  )
}
