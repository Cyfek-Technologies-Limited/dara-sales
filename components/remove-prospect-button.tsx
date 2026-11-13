'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Trash2 } from 'lucide-react'

export default function RemoveProspectButton({ id, businessName, onRemoved }: { id: string; businessName: string; onRemoved: () => void }) {
  const router = useRouter()
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function remove() {
    if (pending.current || !window.confirm(`Remove ${businessName}? This permanently removes the prospect, its recorded outreach and queued emails. Emails already sent cannot be recalled.`)) return
    pending.current = true; setBusy(true); setError('')
    try {
      const response = await fetch(`/api/admin/leads/${encodeURIComponent(id)}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not remove prospect.')
      onRemoved(); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove prospect.') }
    finally { pending.current = false; setBusy(false) }
  }
  return <div className="relative shrink-0"><button type="button" disabled={busy} onClick={remove} aria-label={`Remove ${businessName}`} title={busy ? 'Removing prospect…' : 'Remove prospect'} className="inline-flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</button>{error && <p role="alert" className="absolute right-0 top-full z-10 mt-1 w-60 rounded-lg border border-red-200 bg-white p-3 text-xs leading-5 text-red-800 shadow-md">{error}</p>}</div>
}
