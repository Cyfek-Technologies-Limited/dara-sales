import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { SalesStageCounts } from '@/components/sales-dashboard-widgets'

type Staff = { authUserId: string; name: string | null; email: string; outreachToday: number; leadCount: number }
type Business = { id: string; businessName: string; stage: string; industry: string | null; ownerName: string | null }
export type DailyActivity = { label: string; leads: number }
type Props = { organizationName: string; today: string; stageCounts: SalesStageCounts; totalLeads: number; activeStaff: number; totalOutreach: number; totalEmailsSent: number; staff: Staff[]; businesses: Business[]; activity: DailyActivity[]; actions: ReactNode }

const number = (value: number) => new Intl.NumberFormat('en-NG').format(value)
const stages = [
  { key: 'LEAD', label: 'Leads', description: 'Businesses ready for the first conversation.', color: '#ee394f' },
  { key: 'PROSPECT', label: 'Prospects', description: 'Qualified opportunities worth pursuing.', color: '#f38b3c' },
  { key: 'CLIENT', label: 'Clients', description: 'Businesses that have chosen to work with you.', color: '#ebc736' },
  { key: 'ONBOARDED', label: 'Onboarded', description: 'Clients getting ready for service delivery.', color: '#28ae77' },
  { key: 'CAMPAIGN_SUCCESSFUL', label: 'Completed deals', description: 'Successfully completed client engagements.', color: '#4761a9' },
] as const

function GrowthChart({ activity }: { activity: DailyActivity[] }) {
  const max = Math.max(1, ...activity.map((day) => day.leads))
  const points = activity.map((day, index) => ({ x: 8 + index / Math.max(1, activity.length - 1) * 584, y: 145 - day.leads / max * 125 }))
  const path = points.map((point, index) => {
    if (!index) return `M ${point.x} ${point.y}`
    const previous = points[index - 1]
    const middle = (previous.x + point.x) / 2
    return `C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`
  }).join(' ')
  const area = points.length ? `${path} L ${points[points.length - 1].x} 155 L ${points[0].x} 155 Z` : ''
  return <>
    <div className="dashboard-chart"><svg viewBox="0 0 600 160" preserveAspectRatio="none" role="img" aria-label={`Leads added in the past seven days: ${activity.map((day) => `${day.label}: ${day.leads}`).join(', ')}`}>
      <defs><linearGradient id="overview-growth-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#cd75b0" stopOpacity="0.55" /><stop offset="100%" stopColor="#cd75b0" stopOpacity="0.02" /></linearGradient></defs>
      {[20, 52, 84, 116, 148].map((y) => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="#e8e4eb" strokeWidth="1" />)}
      {area && <path d={area} fill="url(#overview-growth-fill)" />}
      {path && <path d={path} stroke="#985ba8" strokeWidth="2.5" fill="none" />}
      {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3" fill="#985ba8"><title>{activity[index].label}: {activity[index].leads} leads</title></circle>)}
    </svg></div>
    <div className="dashboard-chart-labels">{activity.map((day) => <span key={day.label}>{day.label}</span>)}</div>
  </>
}

export function AdminDashboardOverview({ organizationName, today, stageCounts, totalLeads, activeStaff, totalOutreach, totalEmailsSent, staff, businesses, activity, actions }: Props) {
  const coverage = totalLeads ? Math.round(totalEmailsSent / totalLeads * 1000) / 10 : 0
  const circumference = 2 * Math.PI * 63
  const maxDailyLeads = Math.max(1, ...activity.map(day => day.leads))
  const leadsToday = activity[activity.length - 1]?.leads || 0
  const dailyColors = ['#985ba8', '#4761a9', '#28ae77', '#f38b3c', '#c66aac', '#ee394f', '#8a509b']
  const weeklyLeads = activity.reduce((sum, day) => sum + day.leads, 0)
  return <>
    <div className="dashboard-overview-heading"><div><h1>Dashboard</h1><p>{organizationName} / {today}</p></div><div className="flex flex-wrap items-center gap-3"><Link href="/admin/prospecting" className="inline-flex items-center gap-2 rounded-[5px] border-[1px] border-black/30 bg-white px-4 py-2.5 text-xs font-medium text-[#875095]">Find prospects<ArrowUpRight className="size-3.5" /></Link>{actions}</div></div>
    <div className="dashboard-overview-grid">
      <section className="dashboard-panel dashboard-conversion"><h2 className="dashboard-panel-title">Email coverage</h2><div className="dashboard-ring"><svg viewBox="0 0 165 165" aria-hidden="true"><circle cx="82.5" cy="82.5" r="63" fill="none" stroke="#30263f" strokeWidth="23" /><circle cx="82.5" cy="82.5" r="63" fill="none" stroke="#443451" strokeWidth="12" /><circle cx="82.5" cy="82.5" r="63" fill="none" stroke="#c66aac" strokeWidth="12" strokeDasharray={`${Math.min(coverage, 100) / 100 * circumference} ${circumference}`} strokeLinecap={coverage ? 'round' : 'butt'} /></svg><strong>{coverage}%</strong></div><p className="dashboard-panel-caption text-center">{number(totalEmailsSent)} emails sent / {number(totalLeads)} saved leads</p></section>

      <section className="dashboard-panel dashboard-spend"><h2 className="dashboard-panel-title">Leads saved</h2><p className="dashboard-panel-caption">Added to your pipeline today</p><p className="dashboard-spend-value">{number(leadsToday)}</p><p className="dashboard-panel-caption">{number(weeklyLeads)} saved in the last 7 days</p><div className="dashboard-mini-bars" role="img" aria-label={`Daily leads saved: ${activity.map(day => `${day.label}: ${day.leads}`).join(', ')}`}>{activity.map((day, index) => <div key={day.label} title={`${day.label}: ${day.leads} leads saved`}><span style={{ height: `${day.leads / maxDailyLeads * 60}px`, background: dailyColors[index % dailyColors.length] }} /><small>{number(day.leads)}</small><small>{day.label}</small></div>)}</div><p className="dashboard-panel-caption mt-2">Daily additions - last 7 days</p><Link href="/admin/leads" className="dashboard-panel-link mt-2 inline-block">View saved leads</Link></section>

      <section className="dashboard-panel dashboard-trend"><div className="dashboard-panel-heading"><div><h2 className="dashboard-panel-title">Lead activity</h2><p className="dashboard-panel-caption">{number(weeklyLeads)} businesses added in the last 7 days</p></div><span className="dashboard-panel-caption">Last 7 days</span></div><GrowthChart activity={activity} /></section>

      <section className="dashboard-panel dashboard-timeline"><div className="dashboard-panel-heading"><h2 className="dashboard-panel-title">Your pipeline</h2><Link href="/admin/leads" className="dashboard-panel-link">View all</Link></div><p className="dashboard-panel-caption mt-1">{number(totalLeads)} businesses, every step of the way</p><div className="dashboard-timeline-list">{stages.map((stage) => <div key={stage.key} className="dashboard-timeline-item"><span className="dashboard-timeline-dot" style={{ background: stage.color }} /><div className="flex items-center justify-between gap-2"><h3>{stage.label}</h3><strong className="text-sm font-medium">{number(stageCounts[stage.key])}</strong></div><p>{stage.description}</p></div>)}</div></section>

      <div className="dashboard-center-stack"><section className="dashboard-panel"><div className="dashboard-panel-heading"><h2 className="dashboard-panel-title">Recent businesses</h2><Link href="/admin/leads" className="dashboard-panel-link">View leads <span aria-hidden="true">↗</span></Link></div>{businesses.length ? <div className="mt-2">{businesses.map((business) => <Link key={business.id} href="/admin/leads" className="dashboard-recent-row"><div className="min-w-0"><p className="dashboard-business-name truncate">{business.businessName}</p><p className="dashboard-recent-detail truncate">{business.industry || 'Industry not set'} / {business.ownerName || 'Unassigned'}</p></div><span className="dashboard-stage-tag">{stages.find((stage) => stage.key === business.stage)?.label || business.stage}</span></Link>)}</div> : <div className="dashboard-empty">Your next opportunity starts here. <Link href="/admin/prospecting" className="dashboard-panel-link">Discover businesses</Link> to build your pipeline.</div>}</section>
        <section className="dashboard-panel grow"><div className="dashboard-panel-heading"><div><h2 className="dashboard-panel-title">Team outreach</h2><p className="dashboard-panel-caption">Today’s progress / 20 touches per teammate</p></div><Link href="/admin/team" className="dashboard-panel-link">View team</Link></div>{staff.length ? staff.slice(0, 4).map((member) => <div key={member.authUserId} className="dashboard-progress-row"><div className="dashboard-progress-label"><span className="truncate">{member.name || member.email}</span><span className="shrink-0 text-[#9d6aa8]">{member.outreachToday} / 20</span></div><div className="dashboard-progress-track" role="progressbar" aria-label={`${member.name || member.email} daily outreach`} aria-valuenow={Math.min(member.outreachToday, 20)} aria-valuemin={0} aria-valuemax={20}><div className="dashboard-progress-fill" style={{ width: `${Math.min(member.outreachToday / 20 * 100, 100)}%` }} /></div></div>) : <p className="dashboard-empty">Invite your first teammate to start tracking outreach.</p>}</section>
      </div>

      <div className="dashboard-metric-stack">{[
        { label: 'Businesses tracked', description: 'Your complete sales pipeline', value: totalLeads },
        { label: 'Outreach today', description: `Daily team target: ${number(activeStaff * 20)}`, value: totalOutreach },
        { label: 'Active teammates', description: 'Building your next client relationships', value: activeStaff },
      ].map((metric) => <section className="dashboard-gradient-metric" key={metric.label}><div><h3>{metric.label}</h3><p>{metric.description}</p></div><strong>{number(metric.value)}</strong></section>)}</div>
    </div>
  </>
}
