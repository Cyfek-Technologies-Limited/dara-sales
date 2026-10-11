'use client'

import { FormEvent, useState } from 'react'
import useSWR from 'swr'
import { ArrowLeft, Check, Loader2, Plus } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((response) => response.json())
const stages = ['LEAD', 'PROSPECT', 'CLIENT'] as const
const stageLabels = { LEAD: 'Lead', PROSPECT: 'Prospect', CLIENT: 'Client' }

export default function LeadsPage() {
  const { data, mutate } = useSWR('/api/staff/leads', fetcher)
  const [form, setForm] = useState({ name: '', company: '', email: '' })
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  async function addLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/staff/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const result = await response.json()
      if (!response.ok) return setMessage(`${result.code}: ${result.message}`)
      setForm({ name: '', company: '', email: '' })
      setMessage('Lead added to your pipeline.')
      await mutate()
    } finally { setSaving(false) }
  }

  async function updateStage(id: string, stage: string) {
    setUpdating(id)
    await fetch('/api/staff/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, stage }) })
    await mutate()
    setUpdating(null)
  }

  return <main className="min-h-screen bg-[#f7f6f2] px-5 py-7 text-[#151515] sm:px-10 sm:py-10"><div className="mx-auto max-w-6xl"><a href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-[#77736c]"><ArrowLeft className="size-4" />Back to dashboard</a><div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5b35]">Pipeline</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Your leads</h1><p className="mt-2 text-sm text-[#817d75]">Move each contact from lead to prospect to client as the relationship develops.</p></div><div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]"><form onSubmit={addLead} className="rounded-2xl border border-[#e1ded6] bg-white p-6 shadow-[0_8px_24px_rgba(20,34,28,0.04)]"><h2 className="font-semibold">Add a new lead</h2><div className="mt-5 grid gap-3">{[['name', 'Full name'], ['company', 'Company'], ['email', 'Email address']].map(([key, label]) => <label key={key} className="grid gap-1.5 text-xs font-medium text-[#77736c]">{label}<input required type={key === 'email' ? 'email' : 'text'} value={form[key as keyof typeof form]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="rounded-xl border border-[#e5e1d9] bg-[#fcfbf9] px-3 py-2.5 text-sm outline-none focus:border-[#ff5b35]" /></label>)}</div><button disabled={saving} className="mt-5 flex items-center gap-2 rounded-xl bg-[#ff5b35] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}{saving ? 'Adding lead...' : 'Add lead'}</button>{message && <p className="mt-3 text-xs text-[#a3462b]">{message}</p>}</form><section className="rounded-2xl border border-[#e1ded6] bg-white p-6 shadow-[0_8px_24px_rgba(20,34,28,0.04)]"><div className="flex items-center justify-between"><h2 className="font-semibold">My pipeline</h2><span className="text-xs text-[#99958d]">{data?.leads?.length ?? 0} contacts</span></div><div className="mt-5 grid gap-3">{data?.leads?.length ? data.leads.map((lead: any) => <article key={lead.id} className="rounded-xl border border-[#ece9e2] p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="font-medium">{lead.name}</h3><p className="mt-1 text-xs text-[#99958d]">{lead.company} · {lead.email}</p></div><div className="flex items-center gap-2">{updating === lead.id && <Loader2 className="size-4 animate-spin text-[#ff5b35]" />}<select value={lead.stage || 'LEAD'} disabled={updating === lead.id} onChange={(event) => updateStage(lead.id, event.target.value)} className="rounded-lg border border-[#e5e1d9] bg-[#fcfbf9] px-2.5 py-2 text-xs font-semibold outline-none"><option value="LEAD">Lead</option><option value="PROSPECT">Prospect</option><option value="CLIENT">Client</option></select></div></div><div className="mt-3 flex items-center gap-2 text-[11px] text-[#817d75]">{stages.map((stage, index) => <span key={stage} className="flex items-center gap-1"><span className={`size-2 rounded-full ${stages.indexOf(lead.stage || 'LEAD') >= index ? 'bg-[#ff5b35]' : 'bg-[#dedbd4]'}`} />{stageLabels[stage]}{index < 2 && <span className="mx-1 text-[#d5d1c9]">→</span>}</span>)}</div></article>) : <div className="rounded-xl border border-dashed border-[#ddd9d1] p-8 text-center text-sm text-[#99958d]">Your added leads will appear here.</div>}</div></section></div></div></main>
}
