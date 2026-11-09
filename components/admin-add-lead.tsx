'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Plus, X } from 'lucide-react'

export type LeadIndustry = { id: string; name: string }
export type LeadCategory = { id: string; name: string; industryId: string }
export type LeadTeammate = { id: string; name: string | null; email: string }
const empty = { businessName: '', contactName: '', email: '', phone: '', website: '', industryId: '', categoryId: '', ownerId: '', source: '', notes: '' }

export default function AdminAddLead({ industries, categories, teammates }: { industries: LeadIndustry[]; categories: LeadCategory[]; teammates: LeadTeammate[] }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const inFlight = useRef(false)
  const router = useRouter()
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const field = 'mt-1.5 w-full rounded-xl border-[1px] border-black/30 bg-white px-3 py-2.5 text-sm text-[#0b1f3a] outline-none focus:border-[#8a509b] focus:ring-2 focus:ring-purple-100'
  function update(name: keyof typeof empty, value: string) { setForm(current => ({ ...current, [name]: value })) }
  function close() { if (!inFlight.current) dialog.current?.close() }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setError(''); setSuccess('')
    try {
      const response = await fetch('/api/admin/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form), signal: AbortSignal.timeout(45000) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not save this lead.')
      setSuccess(`${form.businessName} added to your leads.`); setForm(empty); dialog.current?.close(); router.refresh()
    } catch (cause) {
      setError(cause instanceof Error && cause.name === 'TimeoutError' ? 'Saving took too long. Check your leads before trying again.' : cause instanceof Error ? cause.message : 'Could not save this lead.')
    } finally { inFlight.current = false; setBusy(false) }
  }
  return <div>
    <button type="button" onClick={() => { setError(''); setSuccess(''); dialog.current?.showModal() }} className="inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white hover:bg-[#173b65]"><Plus className="size-4" />Add lead</button>
    {success && <p role="status" className="mt-2 max-w-xs text-xs text-emerald-800">{success}</p>}
    <dialog ref={dialog} aria-labelledby="add-lead-title" onCancel={event => { if (inFlight.current) event.preventDefault() }} onClick={event => { if (event.target === event.currentTarget) close() }} className="m-auto max-h-[90dvh] w-[94vw] max-w-2xl overflow-y-auto rounded-2xl border-[1px] border-black/30 bg-white p-0 text-[#0b1f3a] shadow-2xl backdrop:bg-slate-950/60">
      <header className="flex items-start justify-between gap-4 border-b border-black/20 p-5"><div><h2 id="add-lead-title" className="text-xl font-bold">Add a lead</h2><p className="mt-1 text-sm text-slate-600">Enter the business details yourself. Only the business name is required.</p></div><button type="button" aria-label="Close add lead form" disabled={busy} onClick={close} className="rounded-lg p-1 disabled:opacity-50"><X className="size-5" /></button></header>
      <form onSubmit={submit} className="p-5">
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60">
          <label className="text-sm font-semibold sm:col-span-2">Business name <span className="text-red-600">*</span><input autoFocus required maxLength={160} value={form.businessName} onChange={e => update('businessName', e.target.value)} className={field} /></label>
          <label className="text-sm font-semibold">Contact person<input maxLength={160} value={form.contactName} onChange={e => update('contactName', e.target.value)} className={field} /></label>
          <label className="text-sm font-semibold">Email<input type="email" maxLength={254} value={form.email} onChange={e => update('email', e.target.value)} className={field} /></label>
          <label className="text-sm font-semibold">Phone<input type="tel" maxLength={40} value={form.phone} onChange={e => update('phone', e.target.value)} className={field} placeholder="+234..." /></label>
          <label className="text-sm font-semibold">Website<input maxLength={600} value={form.website} onChange={e => update('website', e.target.value)} className={field} placeholder="yourbusiness.com" /></label>
          <label className="text-sm font-semibold">Industry<select value={form.industryId} onChange={e => setForm(current => ({ ...current, industryId: e.target.value, categoryId: '' }))} className={field}><option value="">No industry selected</option>{industries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-semibold">Category<select disabled={!form.industryId || busy} value={form.categoryId} onChange={e => update('categoryId', e.target.value)} className={field}><option value="">No category selected</option>{categories.filter(item => item.industryId === form.industryId).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-semibold">Assign to teammate<select value={form.ownerId} onChange={e => update('ownerId', e.target.value)} className={field}><option value="">Unassigned</option>{teammates.map(item => <option key={item.id} value={item.id}>{item.name || item.email}</option>)}</select></label>
          <label className="text-sm font-semibold">Lead source<input maxLength={600} value={form.source} onChange={e => update('source', e.target.value)} className={field} placeholder="Referral, event, website..." /></label>
          <label className="text-sm font-semibold sm:col-span-2">Notes<textarea maxLength={5000} value={form.notes} onChange={e => update('notes', e.target.value)} className={`${field} min-h-24`} /></label>
        </fieldset>
        <p className="mt-4 text-xs leading-5 text-slate-500">If email outreach is active, matching leads with an email address can receive your approved message automatically.</p>
        <div className="mt-5 flex justify-end gap-3 border-t border-black/20 pt-4"><button type="button" disabled={busy} onClick={close} className="rounded-xl border border-black/30 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Cancel</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy && <LoaderCircle className="size-4 animate-spin" />}{busy ? 'Saving lead...' : 'Save lead'}</button></div>
      </form>
    </dialog>
  </div>
}
