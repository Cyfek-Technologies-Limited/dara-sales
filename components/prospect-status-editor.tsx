'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProspectStatusEditor({ id, businessName, initialStatus, initialResponse }: { id: string; businessName: string; initialStatus: string; initialResponse: string | null }) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [response, setResponse] = useState(initialResponse || '')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const lock = useRef(false)
  const changed = status !== initialStatus || status === 'RESPONSE' && response.trim() !== (initialResponse || '')
  async function save() {
    if (lock.current) return
    lock.current = true; setBusy(true); setFeedback('')
    try {
      const result = await fetch(`/api/admin/leads/${encodeURIComponent(id)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, responseText: response }) })
      const data = await result.json()
      if (!result.ok) throw new Error(data.error || 'Could not save status.')
      setFeedback('Saved'); router.refresh()
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Could not save status.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <div className="min-w-40 space-y-2 text-xs">
    <label className="block font-semibold">Status<select aria-label={`Status for ${businessName}`} value={status} disabled={busy} onChange={event => { setStatus(event.target.value); setFeedback('') }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"><option value="PROSPECT">Prospect</option><option value="CONTACTED">Contacted</option><option value="RESPONSE">Response</option></select></label>
    {status === 'RESPONSE' && <label className="block font-semibold">What was their response?<textarea maxLength={2000} value={response} disabled={busy} onChange={event => { setResponse(event.target.value); setFeedback('') }} placeholder="Record what the prospect said…" className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" /></label>}
    {(changed || status === 'RESPONSE' && !initialResponse) && <button type="button" onClick={save} disabled={busy || status === 'RESPONSE' && !response.trim()} className="rounded-lg bg-[#0b1f3a] px-3 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save status'}</button>}
    {feedback && <p role="status" className="break-words text-slate-600">{feedback}</p>}
  </div>
}
