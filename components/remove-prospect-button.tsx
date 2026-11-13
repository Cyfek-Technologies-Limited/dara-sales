'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  return <div><button type="button" disabled={busy} onClick={remove} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">{busy ? 'Removing…' : 'Remove prospect'}</button>{error && <p role="alert" className="mt-2 max-w-xs text-xs leading-5 text-red-800">{error}</p>}</div>
}
