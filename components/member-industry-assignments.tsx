'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MemberIndustryAssignments({ userId, name, industries, assignedIds, canAssign }: { userId: string; name: string; industries: { id: string; name: string }[]; assignedIds: string[]; canAssign: boolean }) {
  const router = useRouter()
  const [selected, setSelected] = useState(assignedIds)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const pending = useRef(false)
  const changed = JSON.stringify([...selected].sort()) !== JSON.stringify([...assignedIds].sort())
  async function save() {
    if (pending.current) return
    pending.current = true; setBusy(true); setFeedback('')
    try {
      const response = await fetch('/api/admin/industries/assign', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, industryIds: selected }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save assignments.')
      setFeedback('Assignments saved'); router.refresh()
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Could not save assignments.') }
    finally { pending.current = false; setBusy(false) }
  }
  if (!canAssign) return <span className="text-xs">{industries.filter(industry => assignedIds.includes(industry.id)).map(industry => industry.name).join(', ') || 'Unassigned'}</span>
  return <div className="max-w-md space-y-3">
    <fieldset disabled={busy} aria-label={`Assigned industries for ${name}`} className="grid max-h-48 gap-2 overflow-y-auto rounded-lg border border-slate-300 bg-slate-50 p-3">
      {industries.map(industry => <label key={industry.id} className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" checked={selected.includes(industry.id)} onChange={event => { setSelected(current => event.target.checked ? [...current, industry.id] : current.filter(id => id !== industry.id)); setFeedback('') }} className="mt-1 accent-[#0b1f3a]" />{industry.name}</label>)}
      {!industries.length && <p className="text-xs text-slate-500">Add industries first.</p>}
    </fieldset>
    {changed && <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-[#0b1f3a] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Save assignments'}</button>}
    {feedback && <p role="status" className="text-xs text-slate-600">{feedback}</p>}
  </div>
}
