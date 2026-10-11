'use client'

import Link from 'next/link'
import { CalendarDays, LayoutDashboard, Mail, MoreHorizontal, Settings2, SlidersHorizontal, Target, Users } from 'lucide-react'

const items = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: Target },
  { href: '/dashboard/activities', label: 'Activities', icon: CalendarDays },
]

export function StaffSidebar({ active }: { active: string }) {
  return (
    <aside className="hidden w-[228px] shrink-0 flex-col border-r border-[#e7e4dc] bg-[#fbfaf7] px-5 py-6 lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2 px-2"><span className="flex size-8 items-center justify-center rounded-xl bg-[#ff5b35] text-sm font-bold text-white">S</span><span className="font-semibold tracking-tight">sequoia</span></Link>
      <nav aria-label="Staff workspace" className="mt-10 flex flex-1 flex-col gap-1"><p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a19c91]">Workspace</p>{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active === label ? 'bg-[#f0ede5] font-semibold text-[#1b1b1b]' : 'text-[#77736c] hover:bg-[#f4f1ea]'}`}><Icon className="size-[17px]" />{label}</Link>)}<div className="my-6 h-px bg-[#e7e4dc]" /><p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a19c91]">Manage</p><Link href="/dashboard/pipeline" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#77736c] hover:bg-[#f4f1ea]"><Mail className="size-[17px]" />Inbox<span className="ml-auto rounded-full bg-[#ff5b35] px-1.5 py-0.5 text-[10px] font-semibold text-white">8</span></Link><Link href="/dashboard/pipeline" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#77736c] hover:bg-[#f4f1ea]"><SlidersHorizontal className="size-[17px]" />Reports</Link></nav>
      <div className="border-t border-[#e7e4dc] pt-4"><Link href="/dashboard" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#77736c] hover:bg-[#f4f1ea]"><Settings2 className="size-[17px]" />Settings</Link><div className="mt-4 flex items-center gap-3 px-2"><div className="flex size-8 items-center justify-center rounded-full bg-[#1d2939] text-xs font-semibold text-white">JD</div><div className="min-w-0"><p className="truncate text-xs font-semibold">Staff member</p><p className="truncate text-[11px] text-[#99958c]">Staff</p></div><MoreHorizontal className="ml-auto size-4 text-[#aaa59b]" /></div></div>
    </aside>
  )
}
