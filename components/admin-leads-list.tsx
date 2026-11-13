'use client'

import { salesStageLabel as stageLabel } from '@/lib/sales-stage-label'

import ProspectStatusEditor from '@/components/prospect-status-editor'
import RemoveProspectButton from '@/components/remove-prospect-button'
import FindMissingPhones from '@/components/find-missing-phones'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ExternalLink, X } from 'lucide-react'

export type AdminLead = {
  id: string
  businessName: string
  contactName: string | null
  email: string | null
  phone: string | null
  industry: string | null
  categoryName: string | null
  website: string | null
  source: string | null
  notes: string | null
  contactStatus: string
  responseText: string | null
  stage: string
  advertiserSpend: string
  ownerName: string | null
  ownerEmail: string | null
  channel: string | null
  occurredAt: string | null
  createdAt: string
  updatedAt: string
}

const contactLabel = (status: string) => status === 'ACCEPTED' ? 'Accepted' : status === 'REJECTED' ? 'Rejected' : status === 'RESPONSE' ? 'Response' : status === 'CONTACTED' ? 'Contacted' : 'Prospect'
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(value)) : 'Not recorded'

function webUrl(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch { return null }
}

export default function AdminLeadsList({ leads, emptyMessage = 'Saved and researched prospects will appear here. Click a prospect to view its details.' }: { leads: AdminLead[]; emptyMessage?: string }) {
  const router = useRouter()
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const visibleLeads = leads.filter(lead => !removedIds.includes(lead.id))
  const contactLookup = useRef(false)
  const [checkingContacts, setCheckingContacts] = useState(false)
  const [contactFeedback, setContactFeedback] = useState<{ id: string; message: string } | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const [selectedSnapshot, setSelected] = useState<AdminLead | null>(null)
  const selected = leads.find(lead => lead.id === selectedSnapshot?.id) || selectedSnapshot

  function openLead(lead: AdminLead) {
    setSelected(lead)
    if (!dialog.current?.open) dialog.current?.showModal()
  }

  function prospectRemoved(id: string) {
    setRemovedIds(current => [...current, id])
    if (selected?.id === id) { dialog.current?.close(); setSelected(null) }
  }

  async function findContacts() {
    if (!selected || contactLookup.current) return
    const id = selected.id
    contactLookup.current = true; setCheckingContacts(true); setContactFeedback(null)
    try {
      const response = await fetch(`/api/admin/leads/${encodeURIComponent(id)}/contacts`, { method: 'POST', signal: AbortSignal.timeout(55000) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not check contacts.')
      setContactFeedback({ id, message: result.message }); router.refresh()
    } catch (error) { setContactFeedback({ id, message: error instanceof Error ? error.message : 'Could not check contacts.' }) }
    finally { contactLookup.current = false; setCheckingContacts(false) }
  }

  const website = webUrl(selected?.website || null)
  const sourceLinks = [...new Set((selected?.source?.match(/https?:\/\/[^\s|]+/g) || []).map(webUrl).filter((url): url is string => Boolean(url)))]

  return <>
    <FindMissingPhones prospects={visibleLeads.filter(lead => !lead.phone && lead.website)} />
    {visibleLeads.length ? <div className="divide-y divide-black/30">{visibleLeads.map((lead) => <div key={lead.id} className="grid w-full gap-3 px-5 py-4 text-left transition hover:bg-violet-50 focus-visible:bg-violet-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-600 sm:grid-cols-[minmax(0,1.5fr)_minmax(120px,.75fr)_minmax(130px,.8fr)_minmax(130px,.8fr)] sm:items-center">
      <button type="button" onClick={() => openLead(lead)} aria-haspopup="dialog" aria-label={`View details for ${lead.businessName}`} className="flex min-w-0 items-center gap-3 text-left"><span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-800"><Building2 className="size-4" /></span><span className="min-w-0"><span className="block truncate font-serif text-sm font-semibold">{lead.businessName}</span><span className="mt-1 block truncate text-[11px] text-slate-600">{lead.contactName || 'Contact not added'}{lead.industry ? ` / ${lead.industry}` : ''}{lead.email ? ` / ${lead.email}` : ''}</span><span className="mt-1 block text-[10px] font-medium text-violet-700">View full prospect details</span></span></button>
      <span><span className="rounded-full bg-violet-100 px-3 py-1.5 text-[10px] font-semibold text-violet-900">{contactLabel(lead.contactStatus)}</span></span>
      <div className="text-xs"><span className="mb-1 block text-[10px] text-slate-500">Phone</span>{lead.phone ? <a href={`tel:${lead.phone}`} className="break-words font-medium text-[#173b65] hover:underline">{lead.phone}</a> : <span className="text-slate-500">Not provided</span>}</div>
      <ProspectStatusEditor key={`${lead.id}:${lead.contactStatus}:${lead.responseText || ""}`} id={lead.id} businessName={lead.businessName} initialStatus={lead.contactStatus} initialResponse={lead.responseText} action={<RemoveProspectButton id={lead.id} businessName={lead.businessName} onRemoved={() => prospectRemoved(lead.id)} />} />
    </div>)}</div> : <p className="p-12 text-center text-sm text-slate-600">{emptyMessage}</p>}

    <dialog ref={dialog} aria-labelledby="lead-details-title" onClose={() => setSelected(null)} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close() }} className="m-auto max-h-[85dvh] w-[92vw] max-w-2xl overflow-y-auto rounded-2xl border-[1px] border-black/30 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm">
      {selected && <div>
        <header className="flex items-start justify-between gap-4 bg-violet-800 p-5 text-white sm:p-6"><div><p className="text-xs text-violet-100">Prospect information</p><h2 id="lead-details-title" className="mt-1 break-words text-2xl font-bold">{selected.businessName}</h2><p className="mt-2 text-xs text-violet-100">{contactLabel(selected.contactStatus)} / {selected.ownerName || selected.ownerEmail || 'Unassigned'}</p></div><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Close prospect details" className="shrink-0 rounded-lg p-2 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"><X className="size-5" /></button></header>
        <div className="space-y-6 p-5 sm:p-6">
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs font-semibold text-slate-500">Contact person</dt><dd className="mt-1 break-words">{selected.contactName || 'Not provided'}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Email</dt><dd className="mt-1 break-all">{selected.email ? <a href={`mailto:${selected.email}`} className="font-medium text-violet-700 underline">{selected.email}</a> : 'Not provided'}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Phone</dt><dd className="mt-1">{selected.phone ? <a href={`tel:${selected.phone}`} className="font-medium text-violet-700 underline">{selected.phone}</a> : 'Not provided'}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Website</dt><dd className="mt-1 break-all">{website ? <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-violet-700 underline">{website}<ExternalLink className="size-3 shrink-0" /></a> : 'Not provided'}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Industry</dt><dd className="mt-1">{selected.industry || 'Not provided'}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Category</dt><dd className="mt-1">{selected.categoryName || 'Uncategorized'}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Assigned teammate</dt><dd className="mt-1">{selected.ownerName || selected.ownerEmail || 'Unassigned'}</dd>{selected.ownerName && selected.ownerEmail && <dd className="mt-0.5 break-all text-xs text-slate-600">{selected.ownerEmail}</dd>}</div>
            <div><dt className="text-xs font-semibold text-slate-500">Status</dt><dd className="mt-1 font-semibold">{contactLabel(selected.contactStatus)}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Last outreach</dt><dd className="mt-1">{selected.channel ? stageLabel(selected.channel) : 'No contact logged'}{selected.occurredAt && <span className="mt-0.5 block text-xs text-slate-600">{dateLabel(selected.occurredAt)}</span>}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Created</dt><dd className="mt-1">{dateLabel(selected.createdAt)}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">Last updated</dt><dd className="mt-1">{dateLabel(selected.updatedAt)}</dd></div>
          </dl>
          {website && <section className="rounded-xl border border-slate-300 bg-slate-50 p-4">
            <button type="button" disabled={checkingContacts} onClick={findContacts} className="rounded-lg bg-[#0b1f3a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{checkingContacts ? 'Checking website and footer…' : 'Find missing contacts'}</button>
            <p className="mt-2 text-xs leading-5 text-slate-600">Checks public website pages and footer contacts, including sites loaded with JavaScript. Existing email and phone details are preserved. Found details may be general company contacts.</p>
            {contactFeedback?.id === selected.id && <p role="status" className="mt-2 text-sm leading-6">{contactFeedback.message}</p>}
          </section>}
          {selected.responseText && <section className="rounded-xl border border-slate-300 bg-blue-50 p-4"><h3 className="text-sm font-semibold">Recorded response</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm">{selected.responseText}</p></section>}
          <section className="rounded-xl border-[1px] border-black/30 bg-slate-50 p-4"><h3 className="text-sm font-semibold">Notes</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{selected.notes || 'No notes added.'}</p></section>
          <section><h3 className="text-sm font-semibold">Source</h3><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{selected.source || 'No source recorded.'}</p>{sourceLinks.length > 0 && <ul className="mt-2 space-y-2">{sourceLinks.map((url) => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-xs font-medium text-violet-700 underline">{url}<ExternalLink className="size-3 shrink-0" /></a></li>)}</ul>}</section>
          <div className="flex flex-wrap items-start justify-between gap-3 border-t-[1px] border-black/30 pt-4"><RemoveProspectButton id={selected.id} businessName={selected.businessName} onRemoved={() => prospectRemoved(selected.id)} /><button type="button" onClick={() => dialog.current?.close()} className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 focus-visible:ring-4 focus-visible:ring-violet-200">Close</button></div>
        </div>
      </div>}
    </dialog>
  </>
}
