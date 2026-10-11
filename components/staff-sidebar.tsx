'use client'

import Link from 'next/link'
import { CalendarDays, LayoutDashboard, Target, Users } from 'lucide-react'

const items = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: Target },
  { href: '/dashboard/activities', label: 'Activities', icon: CalendarDays },
]

export function StaffSidebar({ active }: { active: string }) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-[#e7e4dc] bg-[#fbfaf7] p-5 lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 text-lg font-semibold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-xl bg-[#ff5b35] text-sm font-bold text-white">S</span>
        sequoia
      </Link>
      <nav aria-label="Staff workspace" className="mt-10 flex flex-1 flex-col gap-1">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a19c91]">Workspace</p>
        {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active === label ? 'bg-[#fff0eb] font-semibold text-[#a3462b]' : 'text-[#77736c] hover:bg-[#f4f1ea]'}`}><Icon className="size-[17px]" />{label}</Link>)}
      </nav>
    </aside>
  )
}
