'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Phone } from 'lucide-react'

export default function FindMissingPhones({ prospects }: { prospects: { id: string; businessName: string }[] }) {
  const router = useRouter()
  const pending = useRef(false)
  const stop = useRef(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, found: 0, failed: 0 })
  useEffect(() => () => { stop.current = true }, [])
  async function find() {
    if (pending.current || !prospects.length) return
    pending.current = true; stop.current = false; setRunning(true)
    const items = [...prospects]
    setProgress({ done: 0, total: items.length, found: 0, failed: 0 })
    let cursor = 0
    try {
      await Promise.all(Array.from({ length: Math.min(2, items.length) }, async () => {
        while (cursor < items.length && !stop.current) {
          const prospect = items[cursor++]
          let found = false, failed = false
          try {
            const response = await fetch(`/api/admin/leads/${encodeURIComponent(prospect.id)}/contacts`, { method: 'POST', signal: AbortSignal.timeout(55000) })
            const result = await response.json()
            if (!response.ok) throw new Error('Lookup failed')
            found = Boolean(result.phone)
          } catch { failed = true }
          setProgress(current => ({ ...current, done: current.done + 1, found: current.found + Number(found), failed: current.failed + Number(failed) }))
          if (found) router.refresh()
        }
      }))
    } finally { pending.current = false; setRunning(false); router.refresh() }
  }
  if (!prospects.length && !progress.total) return null
  return <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Research missing phone numbers</p><p className="mt-1 text-slate-600">Checks company websites and their search-indexed contact pages. Existing details are preserved.</p></div><button type="button" disabled={running || !prospects.length} onClick={find} className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3a] px-3 py-2 font-semibold text-white disabled:opacity-60">{running ? <LoaderCircle className="size-4 animate-spin" /> : <Phone className="size-4" />}{running ? `Checking ${progress.done} / ${progress.total}…` : `Find missing numbers (${prospects.length})`}</button></div>
    {!!progress.total && <p role="status" className="mt-3 text-slate-600">{progress.done} of {progress.total} checked · {progress.found} numbers found · {progress.failed} checks unavailable{!running && progress.done - progress.found - progress.failed > 0 ? ` · ${progress.done - progress.found - progress.failed} without a sourced number` : ''}</p>}
    {running && <button type="button" onClick={() => { stop.current = true }} className="mt-2 underline">Stop after current checks</button>}
  </section>
}
