'use client'

import { FormEvent, useState } from 'react'
import useSWR from 'swr'
import { ArrowLeft, Plus } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((response) => response.json())

export default function LeadsPage() {
  const { data, mutate } = useSWR('/api/staff/leads', fetcher)
  const [form, setForm] = useState({ name: '', company: '', email: '', value: '' })
  const [message, setMessage] = useState('')

  async function addLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    const response = await fetch('/api/staff/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const result = await response.json()
    if (!response.ok) return setMessage(`${result.code}: ${result.message}`)
    setForm({ name: '', company: '', email: '', value: '' })
    setMessage('Lead added to your pipeline.')
    mutate()
  }

  return <main className="min-h-screen bg-[#f7f6f2] px-5 py-7 text-[#151515] sm:px-10 sm:py-10"><div className="mx-auto max-w-6xl"><a href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-[#77736c]"><ArrowLeft className="size-4" />Back to dashboard</a><div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5b35]">Pipeline</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Your leads</h1><p className="mt-2 text-sm text-[#817d75]">Add and manage the people you are actively reaching out to.</p></div></div><div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><form onSubmit={addLead} className="rounded-2xl border border-[#e1ded6] bg-white p-6 shadow-[0_8px_24px_rgba(20,34,28,0.04)]"><h2 className="font-semibold">Add a new lead</h2><div className="mt-5 grid gap-3">{[['name', 'Full name'], ['company', 'Company'], ['email', 'Email address'], ['value', 'Estimated value']].map(([key, label]) => <label key={key} className="grid gap-1.5 text-xs font-medium text-[#77736c]">{label}<input required={key !== 'value'} type={key === 'email' ? 'email' : key === 'value' ? 'number' : 'text'} value={form[key as keyof typeof form]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="rounded-xl border border-[#e5e1d9] bg-[#fcfbf9] px-3 py-2.5 text-sm outline-none focus:border-[#ff5b35]" /></label>)}</div><button className="mt-5 flex items-center gap-2 rounded-xl bg-[#ff5b35] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="size-4" />Save lead</button>{message && <p className="mt-3 text-xs text-[#a3462b]">{message}</p>}</form><section className="rounded-2xl border border-[#e1ded6] bg-white p-6 shadow-[0_8px_24px_rgba(20,34,28,0.04)]"><div className="flex items-center justify-between"><h2 className="font-semibold">My leads</h2><span className="text-xs text-[#99958d]">{data?.leads?.length ?? 0} total</span></div><div className="mt-5 divide-y divide-[#f0ede8]">{data?.leads?.length ? data.leads.map((lead: any) => <div key={lead.id} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-semibold">{lead.name}</p><p className="mt-1 text-xs text-[#99958d]">{lead.company} · {lead.email}</p></div><span className="rounded-full bg-[#fff0eb] px-2.5 py-1 text-[11px] font-semibold capitalize text-[#a3462b]">{lead.stage.replaceAll('_', ' ')}</span></div>) : <p className="py-10 text-center text-sm text-[#99958d]">No leads yet. Add your first lead.</p>}</div></section></div></div></main>
}
