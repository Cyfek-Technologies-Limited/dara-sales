'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CircleHelp, ContactRound, LayoutDashboard, LogOut, Settings, Sparkles, TrendingUp, Users, Target, Tags, Search, Menu, X, ArrowUpRight, Radar, Mail } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { InviteLinkButton } from '@/components/invite-link-button'

type DashboardRole = 'ADMIN' | 'STAFF'

const adminWorkspaceLinks = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Prospects', href: '/admin/leads', icon: ContactRound },
  { label: 'AI Prospecting', href: '/admin/prospecting', icon: Search },
  { label: 'Email outreach', href: '/admin/email-outreach', icon: Mail },
  { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { label: 'Team', href: '/admin/team', icon: Users },
  { label: 'Industries', href: '/admin/industries', icon: Tags },
]

const staffWorkspaceLinks = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: "Today's prospects", href: '/dashboard/leads', icon: ContactRound },
  { label: 'All prospects & leads', href: '/dashboard/leads/all', icon: Users },
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navSearch, setNavSearch] = useState('')
  const pathname = usePathname()
  const router = useRouter()
  const workspaceLinks = role === 'ADMIN' ? adminWorkspaceLinks : staffWorkspaceLinks

  async function signOut() {
    await authClient.signOut()
    router.replace('/sign-in')
    router.refresh()
  }

  const initials = userName.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase()
  const InviteIcon = pathname.startsWith('/admin/prospecting') ? Radar : Sparkles
  const currentPage = [...workspaceLinks, ...generalLinks].find((link) => link.href === pathname)?.label || 'Workspace'
  const shownLinks = workspaceLinks.filter((link) => link.label.toLowerCase().includes(navSearch.toLowerCase()))

  return <>
    {mobileOpen && <button type="button" className="dashboard-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside id="dashboard-navigation" className={`dashboard-sidebar ${mobileOpen ? 'is-open' : ''}`}>
      <div className="dashboard-brand-row"><Link href={role === 'ADMIN' ? '/admin' : '/dashboard'} className="dashboard-brand" aria-label="Dara dashboard">Dara<span>.</span></Link><button type="button" className="dashboard-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="size-5" /></button></div>
      <div className="dashboard-workspace-name" title={organizationName}>{organizationName || 'Your workspace'}</div>
      <label className="dashboard-nav-search"><Search className="size-5 shrink-0" strokeWidth={1.6} /><input value={navSearch} onChange={(event) => setNavSearch(event.target.value)} placeholder="Search navigation" aria-label="Search dashboard navigation" /></label>
      <nav aria-label="Workspace navigation" className="dashboard-nav-links">
        {shownLinks.map(({ label, href, icon: Icon }) => {
          const active = !href.includes('#') && (pathname === href || role === 'ADMIN' && href !== '/admin' && pathname.startsWith(href + '/'))
          return <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined} className={`dashboard-nav-link ${active ? 'is-active' : ''}`}><Icon className="size-[21px] shrink-0" strokeWidth={1.6} /><span>{label}</span>{active && <span className="dashboard-nav-dot" />}</Link>
        })}
        {!shownLinks.length && <p className="px-6 py-4 text-xs text-white/70">No matching pages.</p>}
      </nav>
      {role === 'ADMIN' && <nav aria-label="General navigation" className="dashboard-general-links">{generalLinks.map(({label, href, icon: Icon}) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-current={pathname === href ? 'page' : undefined} className={`dashboard-nav-link ${pathname === href ? 'is-active' : ''}`}><Icon className="size-[21px] shrink-0" strokeWidth={1.6} /><span>{label}</span></Link>)}</nav>}
      <div className="dashboard-sidebar-footer">
        {role === 'STAFF' && <div className="mb-5 text-xs leading-5 text-white/70"><p className="font-semibold text-white">{jobTitle || 'Sales team'}</p><p>{industry || 'Industry not assigned'}</p></div>}
        {role === 'ADMIN' && <div className="dashboard-invite-panel"><InviteIcon className="mb-2 size-5 text-[#e3a7cc]" /><p className="text-sm font-semibold text-white">Better, together.</p><p className="mb-3 mt-1 text-xs leading-5 text-white/65">Bring your team into the conversation.</p><InviteLinkButton /></div>}
        <button type="button" onClick={signOut} className="dashboard-signout"><LogOut className="size-[18px]" />Sign out<ArrowUpRight className="ml-auto size-4 opacity-50" /></button>
      </div>
    </aside>
    <header className="dashboard-topbar">
      <div className="flex min-w-0 items-center gap-3"><button type="button" className="dashboard-mobile-toggle" aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="dashboard-navigation" onClick={() => setMobileOpen(true)}><Menu className="size-5" /></button><div className="min-w-0"><p className="dashboard-topbar-eyebrow">YOUR WORKSPACE</p><p className="truncate text-sm font-medium">{currentPage}</p></div></div>
      <div className="dashboard-profile"><span className="dashboard-profile-avatar">{initials}</span><div className="hidden min-w-0 sm:block"><p className="max-w-60 truncate text-sm font-medium">{userName}</p><p className="max-w-60 truncate text-[11px] text-[#8c8694]" title={userEmail}>{role === 'ADMIN' ? 'Administrator' : jobTitle || 'Sales team member'}</p></div><span className="dashboard-online-dot" aria-label="Signed in" /></div>
    </header>
  </>
}
