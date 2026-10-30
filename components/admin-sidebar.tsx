'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, CircleHelp, ClipboardList, ContactRound, LayoutDashboard, LogOut, Settings, Sparkles, TrendingUp, Users } from 'lucide-react'
import { InviteLinkButton } from '@/components/invite-link-button'

const workspaceLinks = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Leads', href: '/admin/leads', icon: ContactRound },
  { label: 'Tasks', href: '/admin/tasks', icon: ClipboardList, badge: '12+' },
  { label: 'Calendar', href: '/admin/calendar', icon: CalendarDays },
  { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { label: 'Team', href: '/admin/team', icon: Users },
]

const generalLinks = [
  { label: 'Settings', href: '/admin/settings', icon: Settings },
  { label: 'Help', href: '/admin/help', icon: CircleHelp },
]

type AdminIcon = (typeof workspaceLinks)[number]['icon']

function SidebarLink({ label, href, icon: Icon, badge }: { label: string; href: string; icon: AdminIcon; badge?: string }) {
  const pathname = usePathname()
  const active = href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active ? 'bg-[#e9eef5] text-[#07121f]' : 'text-[#657286] hover:bg-[#e9eef5]'}`}
    >
      <Icon className="size-[17px]" strokeWidth={1.8} />
      {label}
      {badge && <span className="ml-auto rounded bg-[#07121f] px-1.5 py-0.5 text-[9px] font-bold text-white">{badge}</span>}
    </Link>
  )
}

export function AdminSidebar({ userName, userEmail, organizationName }: { userName?: string; userEmail?: string; organizationName?: string } = {}) {
  return (
    <aside className="hidden w-[220px] shrink-0 flex-col rounded-[24px] border-[1px] border-black/30 bg-white p-5 shadow-[0_10px_30px_rgba(20,34,28,0.035)] lg:flex">
      <Link href="/admin" className="flex items-center gap-3 px-2" aria-label="Dara admin dashboard">
        <span className="flex size-9 items-center justify-center rounded-full border-[1px] border-black/30 text-[#07121f]"><span className="size-3 rounded-full bg-[#07121f]" /></span>
        <span className="font-serif text-lg font-bold tracking-tight">Dara</span>
      </Link>

      {userName && <div className="mt-5 rounded-[20px] bg-[#07121f] p-4 text-white"><span className="flex size-9 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-[#a5f36c]">{userName.split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase()}</span><p className="mt-3 truncate font-serif text-sm font-semibold">{organizationName || 'Dara workspace'}</p><p className="mt-1 truncate text-[10px] text-[#d6deea]">{userName}</p>{userEmail && <p className="mt-0.5 truncate text-[9px] text-[#d6deea]/75">{userEmail}</p>}</div>}

      <p className="mb-3 mt-7 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#657286]">Workspace</p>
      <nav aria-label="Workspace navigation" className="space-y-1">
        {workspaceLinks.map((link) => <SidebarLink key={link.href} {...link} />)}
      </nav>

      <p className="mb-3 mt-10 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#657286]">General</p>
      <nav aria-label="General navigation" className="space-y-1">
        {generalLinks.map((link) => <SidebarLink key={link.href} {...link} />)}
        <Link href="/sign-in" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#657286] hover:bg-[#e9eef5]"><LogOut className="size-[17px]" strokeWidth={1.8} />Logout</Link>
      </nav>

      <div className="mt-auto overflow-hidden rounded-2xl bg-[#07121f] p-4 text-white">
        <Sparkles className="mb-5 size-5 text-[#a5f36c]" />
        <p className="text-sm font-semibold leading-5">Grow your team with Dara</p>
        <p className="mt-1 text-[11px] leading-4 text-[#d6deea]">Invite your sales staff and track every win.</p>
        <InviteLinkButton />
      </div>
    </aside>
  )
}
