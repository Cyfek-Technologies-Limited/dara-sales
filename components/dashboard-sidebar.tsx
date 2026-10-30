'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CircleHelp, ContactRound, LayoutDashboard, LogOut, Settings, Sparkles, TrendingUp, Users, Target, Tags } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { InviteLinkButton } from '@/components/invite-link-button'

type DashboardRole = 'ADMIN' | 'STAFF'

const adminWorkspaceLinks = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Leads', href: '/admin/leads', icon: ContactRound },
  { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { label: 'Team', href: '/admin/team', icon: Users },
  { label: 'Industries', href: '/admin/industries', icon: Tags },
]

const staffWorkspaceLinks = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: "Today's leads", href: '/dashboard/leads', icon: ContactRound },
  { label: 'All leads & prospects', href: '/dashboard/leads/all', icon: Users },
  { label: 'Pipeline', href: '/dashboard#pipeline', icon: Target },
]

const generalLinks = [
  { label: 'Settings', href: '/admin/settings', icon: Settings },
  { label: 'Help', href: '/admin/help', icon: CircleHelp },
]

export function DashboardSidebar({
  role,
  userName,
  userEmail,
  organizationName,
  jobTitle,
  industry,
}: {
  role: DashboardRole
  userName: string
  userEmail: string
  organizationName: string
  jobTitle?: string
  industry?: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const workspaceLinks = role === 'ADMIN' ? adminWorkspaceLinks : staffWorkspaceLinks

  async function signOut() {
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <aside className="hidden w-[220px] shrink-0 flex-col rounded-[24px] border-[1px] border-black/30 bg-white p-5 shadow-[0_10px_30px_rgba(20,34,28,0.035)] lg:flex">
      <Link href={role === 'ADMIN' ? '/admin' : '/dashboard'} className="flex items-center gap-3 px-2" aria-label="Dara dashboard">
        <span className="flex size-9 items-center justify-center rounded-full border-[1px] border-black/30 text-[#07121f]"><span className="size-3 rounded-full bg-[#07121f]" /></span>
        <span className="font-serif text-lg font-bold tracking-tight">Dara</span>
      </Link>

      <div className="mt-5 rounded-[20px] bg-[#07121f] p-4 text-white">
        <span className="flex size-9 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-[#a5f36c]">{userName.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase()}</span>
        <p className="mt-3 truncate font-serif text-sm font-semibold">{organizationName || 'Dara workspace'}</p>
        <p className="mt-1 truncate text-[10px] text-[#d6deea]">{userName}</p>
        <p className="mt-0.5 truncate text-[9px] text-[#d6deea]/75">{userEmail}</p>
        {jobTitle && <span className="mt-3 inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[9px] text-[#a5f36c]">{jobTitle}</span>}
        {role === 'STAFF' && <span className="mt-2 inline-flex max-w-full rounded-full bg-white/10 px-2.5 py-1 text-[9px] text-[#a5f36c]">{industry || 'Industry not assigned'}</span>}
      </div>

      <p className="mb-3 mt-7 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#657286]">Workspace</p>
      <nav aria-label="Workspace navigation" className="space-y-1">
        {workspaceLinks.map(({ label, href, icon: Icon, ...rest }) => {
          const active = href.includes('#') ? false : role === 'STAFF' ? pathname === href : href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active ? 'bg-[#e9eef5] text-[#07121f]' : 'text-[#657286] hover:bg-[#e9eef5]'}`}><Icon className="size-[17px]" strokeWidth={1.8} />{label}{'badge' in rest && rest.badge && <span className="ml-auto rounded bg-[#07121f] px-1.5 py-0.5 text-[9px] font-bold text-white">{rest.badge}</span>}</Link>
        })}
      </nav>

      {role === 'ADMIN' && <>
        <p className="mb-3 mt-8 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#657286]">General</p>
        <nav aria-label="General navigation" className="space-y-1">
          {generalLinks.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active ? 'bg-[#e9eef5] text-[#07121f]' : 'text-[#657286] hover:bg-[#e9eef5]'}`}><Icon className="size-[17px]" strokeWidth={1.8} />{label}</Link>
          })}
        </nav>
      </>}

      <div className="mt-auto border-t-[1px] border-black/30 pt-4">
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-[#657286] hover:bg-[#f4f6f9]"><LogOut className="size-4" />Sign out</button>
        {role === 'ADMIN' && <div className="mt-4 overflow-hidden rounded-2xl bg-[#07121f] p-4 text-white"><Sparkles className="mb-4 size-5 text-[#a5f36c]" /><p className="text-sm font-semibold leading-5">Grow your team with Dara</p><p className="mt-1 text-[11px] leading-4 text-[#d6deea]">Invite your sales staff and track every win.</p><InviteLinkButton /></div>}
      </div>
    </aside>
  )
}
