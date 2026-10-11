'use client'

import useSWR from 'swr'
import { useMemo, useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((response) => response.json())
const stages = ['ALL', 'LEAD', 'PROSPECT', 'CLIENT'] as const
const labels = { LEAD: 'Lead', PROSPECT: 'Prospect', CLIENT: 'Client' }

export default function PipelinePage() {
  const { data, mutate } = useSWR('/api/staff/pipeline', fetcher)
  const [filter, setFilter] = useState<(typeof stages)[number]>('ALL')
  const [query, setQuery] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const leads = data?.leads ?? []
  const visible = useMemo(() => leads.filter((lead: any) => (filter === 'ALL' || lead.stage === filter) && `${lead.name} ${lead.company} ${lead.email}`.toLowerCase().includes(query.toLowerCase())), [leads, filter, query])
  const counts = Object.fromEntries(stages.map((stage) => [stage, stage === 'ALL' ? leads.length : leads.filter((lead: any) => lead.stage === stage).length]))

  async function updateStage(id: string, stage: string) {
    setUpdating(id)
    await fetch('/api/staff/pipeline', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, stage }) })
    await mutate()
    setUpdating(null)
  }

  return <main className="min-h-screen bg-[#f7f6f2] px-5 py-7 text-[#151515] sm:px-10 sm:py-10"><div className="mx-auto max-w-6xl"><a href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-[#77736c]"><ArrowLeft className="size-4" />Back to dashboard</a><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5b35]">Pipeline</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">All opportunities</h1><p className="mt-2 text-sm text-[#817d75]">Track every lead across every day as they become prospects and clients.</p></div><a href="/dashboard/leads" className="rounded-xl bg-[#ff5b35] px-4 py-2.5 text-sm font-semibold text-white">Add daily lead</a></div><div className="grid gap-3 sm:grid-cols-4">{stages.map((stage) => <button key={stage} onClick={() => setFilter(stage)} className={`rounded-2xl border p-4 text-left ${filter === stage ? 'border-[#ff5b35] bg-[#fff0eb]' : 'border-[#e1ded6] bg-white'}`}><p className="text-xs text-[#817d75]">{stage === 'ALL' ? 'All records' : labels[stage]}</p><p className="mt-1 text-2xl font-semibold">{counts[stage]}</p></button>)}</div><div className="mt-5 rounded-2xl border border-[#e1ded6] bg-white p-4"><div className="flex items-center gap-3 rounded-xl border border-[#e5e1d9] px-3 py-2"><Search className="size-4 text-[#aaa59c]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your pipeline" className="w-full bg-transparent text-sm outline-none" /></div><div className="mt-4 grid gap-3">{visible.map((lead: any) => <article key={lead.id} className="rounded-2xl border border-[#ebe8e1] p-4"><div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start"><div><h2 className="font-semibold">{lead.name}</h2><p className="mt-1 text-sm text-[#817d75]">{lead.company} · {lead.email} · {lead.phone}</p><p className="mt-1 text-xs text-[#99958d]">Added {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(lead.createdAt))} · {lead.companyAddress}</p></div><select value={lead.stage} disabled={updating === lead.id} onChange={(event) => updateStage(lead.id, event.target.value)} className="rounded-xl border border-[#e5e1d9] bg-[#fcfbf9] px-3 py-2 text-sm font-medium outline-none"><option value="LEAD">Lead</option><option value="PROSPECT">Prospect</option><option value="CLIENT">Client</option></select></div></article>)}{visible.length === 0 && <p className="py-12 text-center text-sm text-[#817d75]">No pipeline records match this view.</p>}</div></div></div></main>
}
