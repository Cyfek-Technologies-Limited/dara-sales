'use client'

import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Filter,
  LayoutDashboard,
  ListFilter,
  Mail,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react'

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Contacts', icon: Users },
  { label: 'Pipeline', icon: Target },
  { label: 'Activities', icon: CalendarDays },
]

const contacts = [
  { name: 'Olivia Rhye', company: 'Vertex Labs', email: 'olivia@vertexlabs.com', stage: 'Qualified', value: '$24,000', color: 'bg-rose-100 text-rose-700', initials: 'OR' },
  { name: 'Candice Wu', company: 'Acme Co.', email: 'candice@acme.co', stage: 'Proposal', value: '$18,500', color: 'bg-[#e9eef5] text-[#07121f]', initials: 'CW' },
  { name: 'Drew Cano', company: 'Catalog', email: 'drew@catalog.com', stage: 'Negotiation', value: '$32,000', color: 'bg-amber-100 text-amber-700', initials: 'DC' },
  { name: 'Orlando Diggs', company: 'Penta Systems', email: 'orlando@penta.io', stage: 'New lead', value: '$12,800', color: 'bg-violet-100 text-violet-700', initials: 'OD' },
  { name: 'Andi Lane', company: 'Quotient', email: 'andi@quotient.com', stage: 'Qualified', value: '$9,400', color: 'bg-emerald-100 text-emerald-700', initials: 'AL' },
]

const chart = [42, 49, 46, 58, 54, 67, 63, 78, 73, 86, 82, 94]

export default function Page() {
  const [activeNav, setActiveNav] = useState('Overview')
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const visibleContacts = useMemo(
    () => contacts.filter((contact) => `${contact.name} ${contact.company}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  )

  return (
    <main className="min-h-screen bg-[#f4f6f9] text-[#07121f]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[228px] shrink-0 flex-col border-r border-[#d6deea] bg-[#ffffff] px-5 py-6 lg:flex">
          <div className="flex items-center gap-2 px-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-[#07121f] text-sm font-bold text-white">S</div>
            <span className="font-semibold tracking-tight">Dara</span>
          </div>
          <div className="mt-10 flex flex-1 flex-col gap-1">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#657286]">Workspace</p>
            {navigation.map((item) => {
              const Icon = item.icon
              const active = activeNav === item.label
              return <button key={item.label} onClick={() => setActiveNav(item.label)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? 'bg-[#f4f6f9] font-semibold text-[#07121f]' : 'text-[#657286] hover:bg-[#f4f6f9]'}`}><Icon className="size-[17px]" />{item.label}</button>
            })}
            <div className="my-6 h-px bg-[#d6deea]" />
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#657286]">Manage</p>
            <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#657286] hover:bg-[#f4f6f9]"><Mail className="size-[17px]" />Inbox <span className="ml-auto rounded-full bg-[#07121f] px-1.5 py-0.5 text-[10px] font-semibold text-white">8</span></button>
            <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#657286] hover:bg-[#f4f6f9]"><SlidersHorizontal className="size-[17px]" />Reports</button>
          </div>
          <div className="border-t border-[#d6deea] pt-4">
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#657286] hover:bg-[#f4f6f9]"><Settings2 className="size-[17px]" />Settings</button>
            <div className="mt-4 flex items-center gap-3 px-2"><div className="flex size-8 items-center justify-center rounded-full bg-[#111827] text-xs font-semibold text-white">JD</div><div className="min-w-0"><p className="truncate text-xs font-semibold">Jordan Davis</p><p className="truncate text-[11px] text-[#657286]">Admin</p></div><MoreHorizontal className="ml-auto size-4 text-[#657286]" /></div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-[76px] items-center justify-between border-b border-[#d6deea] bg-[#ffffff] px-5 sm:px-8">
            <div className="flex items-center gap-3"><button className="lg:hidden"><Menu className="size-5" /></button><div><p className="text-xs text-[#657286]">Wednesday, October 7, 2026</p><h1 className="text-lg font-semibold tracking-tight">Good morning, Jordan</h1></div></div>
            <div className="flex items-center gap-3"><button className="hidden rounded-xl border border-[#d6deea] bg-white px-3 py-2 text-xs font-medium text-[#596579] sm:flex sm:items-center sm:gap-2"><CircleHelp className="size-4" />Help center</button><button className="relative rounded-xl border border-[#d6deea] bg-white p-2.5"><Bell className="size-4" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#07121f]" /></button><button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 rounded-xl border border-[#d6deea] bg-white p-1.5 pr-2.5"><div className="flex size-7 items-center justify-center rounded-full bg-[#111827] text-[10px] font-semibold text-white">JD</div><ChevronDown className="size-3.5 text-[#657286]" /></button></div>
          </header>

          <div className="px-5 py-7 sm:px-8 sm:py-9">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#657286]"><span className="size-1.5 rounded-full bg-[#07121f]" />Sales workspace</div><h2 className="text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-none tracking-[-0.055em]">Your revenue, <span className="font-serif font-normal italic text-[#07121f]">in motion.</span></h2><p className="mt-3 max-w-lg text-sm leading-6 text-[#657286]">Turn every conversation into a clear next step. Here&apos;s how your team is performing this week.</p></div><button className="flex w-fit items-center gap-2 rounded-xl bg-[#07121f] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(7,18,31,0.2)] transition hover:bg-[#07121f]"><Plus className="size-4" />Add opportunity</button></div>

            <div className="grid gap-4 md:grid-cols-3">
              {[['Pipeline value', '$184,620', '+18.4%', ArrowUpRight], ['Won this month', '$46,280', '+12.8%', ArrowUpRight], ['Win rate', '42.6%', '-3.2%', ArrowDownRight]].map(([label, value, change, Icon], index) => <div key={label as string} className="rounded-2xl border border-[#d6deea] bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs font-medium text-[#657286]">{label as string}</p><span className="rounded-lg bg-[#f4f6f9] p-2 text-[#657286]"><Icon className="size-4" /></span></div><div className="mt-5 flex items-end justify-between"><p className="text-2xl font-semibold tracking-tight">{value as string}</p><p className={`text-xs font-semibold ${index === 2 ? 'text-[#07121f]' : 'text-[#a5f36c]'}`}>{change as string}</p></div><div className="mt-4 h-1 overflow-hidden rounded-full bg-[#f4f6f9]"><div className={`h-full rounded-full ${index === 2 ? 'bg-[#a5f36c]' : 'bg-[#07121f]'}`} style={{ width: `${[78, 61, 43][index]}%` }} /></div></div>)}
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
              <div className="rounded-2xl border border-[#d6deea] bg-white p-5 sm:p-6"><div className="flex items-start justify-between"><div><h3 className="font-semibold">Revenue overview</h3><p className="mt-1 text-xs text-[#657286]">Track your team&apos;s revenue performance</p></div><button className="flex items-center gap-2 rounded-lg border border-[#d6deea] px-3 py-2 text-xs font-medium text-[#657286]"><CalendarDays className="size-3.5" />Last 12 months<ChevronDown className="size-3" /></button></div><div className="mt-8 flex h-48 items-end gap-2 sm:gap-4"><div className="flex h-full flex-col justify-between pb-1 text-[10px] text-[#657286]"><span>$50k</span><span>$40k</span><span>$30k</span><span>$20k</span><span>$10k</span><span>$0</span></div><div className="relative flex h-full flex-1 items-end justify-between gap-1 border-b border-l border-[#e9eef5] pl-3"><div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: '100%' }}>{[0,1,2,3,4].map((line) => <span key={line} className="border-t border-dashed border-[#f4f6f9]" />)}</div>{chart.map((height, i) => <div key={i} className="group relative flex h-full flex-1 items-end"><div className={`relative z-10 w-full rounded-t-md transition hover:bg-[#07121f] ${i === chart.length - 1 ? 'bg-[#07121f]' : 'bg-[#e9eef5]'}`} style={{ height: `${height}%` }}><span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md bg-[#07121f] px-1.5 py-1 text-[10px] text-white group-hover:block">${height}k</span></div></div>)}</div></div><div className="mt-3 flex justify-between pl-10 text-[10px] text-[#657286]"><span>Nov</span><span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span></div></div>
              <div className="rounded-2xl border border-[#d6deea] bg-[#07121f] p-6 text-white"><div className="flex items-start justify-between"><div><div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-[#07121f]"><Sparkles className="size-5" /></div><h3 className="text-lg font-semibold tracking-tight">Your AI sales copilot</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[#657286]">Get a quick read on your pipeline and find the next best action.</p></div><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-[#657286]">BETA</span></div><div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-3.5"><p className="text-xs font-medium text-[#d6deea]">Today&apos;s insight</p><p className="mt-1.5 text-xs leading-5 text-[#657286]">Your qualified leads are up 24%. Follow up with 3 stalled opportunities to stay on target.</p></div><button className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#a5f36c]">View recommendations <ArrowUpRight className="size-3.5" /></button></div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#d6deea] bg-white"><div className="flex flex-col gap-4 border-b border-[#e9eef5] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">Recent opportunities</h3><p className="mt-1 text-xs text-[#657286]">The latest movement across your pipeline</p></div><div className="flex items-center gap-2"><div className="flex items-center rounded-lg border border-[#d6deea] px-2.5"><Search className="size-3.5 text-[#657286]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-20 bg-transparent px-2 py-2 text-xs outline-none placeholder:text-[#657286] sm:w-28" />{query && <button onClick={() => setQuery('')}><X className="size-3 text-[#657286]" /></button>}</div><button className="rounded-lg border border-[#d6deea] p-2 text-[#657286]"><Filter className="size-3.5" /></button><button className="rounded-lg border border-[#d6deea] p-2 text-[#657286]"><ListFilter className="size-3.5" /></button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-[#ffffff] text-[10px] uppercase tracking-[0.12em] text-[#657286]"><tr><th className="px-5 py-3 font-semibold">Contact</th><th className="px-5 py-3 font-semibold">Stage</th><th className="px-5 py-3 font-semibold">Value</th><th className="px-5 py-3 font-semibold">Last activity</th><th className="px-5 py-3" /></tr></thead><tbody>{visibleContacts.map((contact, i) => <tr key={contact.email} className="border-t border-[#f4f6f9] transition hover:bg-[#ffffff]"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className={`flex size-8 items-center justify-center rounded-full text-[10px] font-semibold ${contact.color}`}>{contact.initials}</div><div><p className="font-semibold">{contact.name}</p><p className="mt-0.5 text-[11px] text-[#657286]">{contact.company}</p></div></div></td><td className="px-5 py-3.5"><span className="rounded-full bg-[#f4f6f9] px-2.5 py-1 text-[10px] font-medium text-[#657286]">{contact.stage}</span></td><td className="px-5 py-3.5 font-semibold">{contact.value}</td><td className="px-5 py-3.5 text-[#657286]">{['2 hours ago', 'Yesterday', 'Yesterday', '2 days ago', '3 days ago'][i]}</td><td className="px-5 py-3.5 text-right"><button className="rounded-lg p-1.5 text-[#657286] hover:bg-[#f4f6f9]"><MoreHorizontal className="size-4" /></button></td></tr>)}</tbody></table></div></div>
          </div>
        </section>
      </div>
      {menuOpen && <button aria-label="Close profile menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-10 cursor-default" />}
    </main>
  )
}
