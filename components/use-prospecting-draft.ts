'use client'

import { useEffect, useRef, useState } from 'react'
import { cleanProspectingDraft, type ProspectingDraft } from '@/lib/prospecting-draft'

export function useProspectingDraft(storageKey: string, initial: ProspectingDraft, serverUpdatedAt: number) {
  const [form, setForm] = useState(initial)
  const current = useRef(initial)
  const lastSynced = useRef(JSON.stringify(initial))
  const lastChange = useRef(serverUpdatedAt)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState('Your inputs are saved automatically.')
  const [retry, setRetry] = useState(0)
  const inFlight = useRef<Promise<void> | null>(null)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || 'null')
      if (stored && typeof stored.updatedAt === 'number' && (stored.pending === true || stored.updatedAt > serverUpdatedAt)) {
        current.current = cleanProspectingDraft(stored.form)
        lastChange.current = stored.updatedAt
        setForm(current.current)
      }
    } catch { /* Storage may be unavailable; account sync still works. */ }
    setReady(true)
  }, [storageKey, serverUpdatedAt])

  function update<K extends keyof ProspectingDraft>(key: K, value: ProspectingDraft[K]) {
    const next = { ...current.current, [key]: value }
    current.current = next
    lastChange.current = Date.now()
    const pending = JSON.stringify(next) !== lastSynced.current
    try { localStorage.setItem(storageKey, JSON.stringify({ form: next, updatedAt: lastChange.current, pending })) } catch { /* Account autosave remains available. */ }
    setForm(next)
    setStatus(pending ? 'Saving your inputs…' : 'Inputs saved. You can leave and return anytime.')
  }

  useEffect(() => {
    if (!ready || JSON.stringify(form) === lastSynced.current) return
    let active = true
    const timer = setTimeout(async () => {
      // Serialize saves so an older request cannot overwrite a newer edit.
      await inFlight.current
      if (!active) return
      const snapshot = JSON.stringify(current.current)
      const save = async () => {
        try {
          const response = await fetch('/api/admin/prospecting/preferences', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ form: JSON.parse(snapshot) }), keepalive: true,
            signal: AbortSignal.timeout(15000),
          })
          if (!response.ok) throw new Error('Autosave failed')
          const result = await response.json()
          lastSynced.current = snapshot
          if (snapshot === JSON.stringify(current.current)) {
            try { localStorage.setItem(storageKey, JSON.stringify({ form: current.current, updatedAt: new Date(result.updatedAt).getTime(), pending: false })) } catch { /* Saved to account. */ }
            setStatus('Inputs saved. You can leave and return anytime.')
          }
        } catch {
          if (snapshot === JSON.stringify(current.current)) setStatus('Account sync unavailable. Retrying; your browser draft is retained when storage is available.')
          if (active) setTimeout(() => { if (active) setRetry(value => value + 1) }, 10000)
        }
      }
      inFlight.current = save()
      await inFlight.current
    }, 600)
    return () => { active = false; clearTimeout(timer) }
  }, [form, ready, retry])

  return { form, update, status, ready }
}
