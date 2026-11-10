'use client'

import { useEffect, useState } from 'react'
import { Search, Users, LoaderCircle } from 'lucide-react'

type Contact = { id: string; contactName: string | null; businessName: string; contactJobTitle: string | null; contactDepartment: string | null; email: string | null; phone: string | null; industry: string | null; website: string | null; unsubscribed: boolean }

export default function OutreachContactDirectory({ industryId }: { industryId: string }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ contacts: Contact[]; totalRows: number } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => { setPage(1) }, [industryId])
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page: String(page), search, industry: industryId })
        const response = await fetch(`/api/admin/email-outreach/contacts?${params}`, { cache: 'no-store', signal: controller.signal })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Could not load contacts.')
        if (!cancelled) { setData(result); setError('') }
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load contacts.') }
      finally { if (!cancelled) { setLoading(false); timer = setTimeout(load, 30000) } }
    }
    const initial = setTimeout(load, 250)
    return () => { cancelled = true; controller.abort(); clearTimeout(initial); clearTimeout(timer) }
  }, [industryId, search, page, refresh])
  return <section className="overflow-hidden rounded-2xl border-[1px] border-black/30 bg-white">
    <div className="space-y-3 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold"><Users className="size-5" />Company contacts</h2><p className="mt-1 text-sm text-slate-600">Saved prospects in your selected audience. Named business contacts appear when publicly listed or entered on the prospect.</p></div><button type="button" onClick={() => setRefresh(value => value + 1)} className="text-sm font-semibold">{loading ? <LoaderCircle className="size-4 animate-spin" aria-label="Loading contacts" /> : 'Refresh'}</button></div><label className="flex items-center gap-2 rounded-lg border border-black/30 px-3"><Search className="size-4 text-slate-500" /><input aria-label="Search company contacts" placeholder="Search contact, company, email or phone" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} className="w-full bg-transparent py-3 text-sm outline-none" /></label>{error && <p role="alert" className="text-sm text-red-800">{error}</p>}</div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Full name','Company','Job title','Department','Email','Phone','Email eligibility'].map(title => <th key={title} className="whitespace-nowrap px-4 py-3">{title}</th>)}</tr></thead><tbody>{data?.contacts.map(contact => <tr key={contact.id} className="border-t border-black/10"><td className="min-w-40 px-4 py-4 font-semibold">{contact.contactName || <span className="font-normal text-slate-400">Not publicly listed</span>}</td><td className="min-w-40 px-4 py-4 font-semibold">{contact.businessName}<span className="mt-1 block text-xs font-normal text-slate-500">{contact.industry}</span></td><td className="px-4 py-4">{contact.contactJobTitle || 'Not listed'}</td><td className="px-4 py-4">{contact.contactDepartment || 'Not listed'}</td><td className="px-4 py-4">{contact.email ? <a className="text-[#173b65]" href={`mailto:${contact.email}`}>{contact.email}</a> : <span className="text-slate-400">Not listed</span>}</td><td className="whitespace-nowrap px-4 py-4">{contact.phone ? <a href={`tel:${contact.phone}`} className="text-[#173b65]">{contact.phone}</a> : 'Not listed'}</td><td className="px-4 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${contact.unsubscribed ? 'bg-rose-100 text-rose-900' : contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>{contact.unsubscribed ? 'Unsubscribed' : contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) ? 'Email available' : 'Missing / invalid email'}</span></td></tr>)}</tbody></table>{!data?.contacts.length && <p className="p-5 text-sm text-slate-500">{loading ? 'Loading saved contacts...' : 'No saved prospects match this audience or search.'}</p>}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 p-4 text-xs text-slate-500"><span>{data?.totalRows || 0} saved prospects · Page {page}. Company inboxes and main phone numbers may be listed where direct work contacts are unavailable.</span><div className="flex gap-3"><button type="button" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)} className="rounded border border-black/20 px-3 py-2 disabled:opacity-40">Previous</button><button type="button" disabled={page * 25 >= (data?.totalRows || 0) || loading} onClick={() => setPage(value => value + 1)} className="rounded border border-black/20 px-3 py-2 disabled:opacity-40">Next</button></div></div>
  </section>
}
