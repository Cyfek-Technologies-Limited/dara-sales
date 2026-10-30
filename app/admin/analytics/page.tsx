import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { DashboardSidebar } from '@/components/dashboard-sidebar'

type Metric = { name: string; leads: number; prospects: number; clients: number }
type MonthMetric = { label: string; leads: number; outreach: number }
const palette = ['#8557e8', '#12c99a', '#ffc928', '#ff512e', '#58b8ee', '#ed6aaa', '#74bd54']
const fmt = (value: number) => new Intl.NumberFormat('en-NG').format(value)
const stageColors = { leads: '#ff512e', prospects: '#8557e8', clients: '#12c99a' }

function Card({ title, subtitle, children, className = '' }: { title: string; subtitle: string; children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-[22px] border border-black/[0.06] bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,0.035)] sm:p-6 ${className}`}><div className="mb-5"><h2 className="text-[15px] font-semibold tracking-tight">{title}</h2><p className="mt-1 text-[11px] text-[#89909b]">{subtitle}</p></div>{children}</section>
}

function ConversionChart({ items }: { items: Metric[] }) {
  const shown = items.slice(0, 6)
  const max = Math.max(1, ...shown.flatMap((item) => [item.leads, item.prospects, item.clients]))
  if (!shown.length || max === 1 && shown.every((item) => !item.leads && !item.prospects && !item.clients)) return <Empty text="Industry results will appear when leads are recorded." />
  return <><div className="flex h-[205px] items-end gap-3 border-b border-dashed border-[#e4e7ec] px-2 sm:gap-5">{shown.map((item, index) => <div key={item.name} className="flex h-full min-w-0 flex-1 flex-col justify-end"><div className="flex h-[170px] items-end justify-center gap-1 sm:gap-1.5">{(['leads', 'prospects', 'clients'] as const).map((key) => <div key={key} title={`${item.name}: ${fmt(item[key])} ${key}`} className="w-[9px] rounded-t-md transition-all sm:w-3" style={{ height: `${Math.max(item[key] > 0 ? 5 : 0, item[key] / max * 100)}%`, backgroundColor: stageColors[key] }} />)}</div><span className="mt-2 w-full truncate text-center text-[9px] text-[#777f8c]" title={item.name}>{item.name}</span></div>)}</div><Legend entries={[[stageColors.leads, 'Leads'], [stageColors.prospects, 'Prospects'], [stageColors.clients, 'Clients']]} /></>
}

function CategoryBars({ items }: { items: Metric[] }) {
  const shown = items.slice(0, 7)
  const max = Math.max(1, ...shown.map((item) => item.leads + item.prospects + item.clients))
  if (!shown.length || shown.every((item) => !item.leads && !item.prospects && !item.clients)) return <Empty text="Category performance will appear as your team adds leads." />
  return <div className="space-y-[14px]">{shown.map((item) => { const total = item.leads + item.prospects + item.clients; return <div key={item.name}><div className="mb-1.5 flex items-center justify-between gap-2"><span className="max-w-[65%] truncate text-[10px] font-medium" title={item.name}>{item.name}</span><span className="text-[10px] tabular-nums text-[#777f8c]">{fmt(item.clients)} clients · {total ? Math.round(item.clients / total * 100) : 0}%</span></div><div className="flex h-3 overflow-hidden rounded-full bg-[#f1f2f5]" title={`${item.leads} leads, ${item.prospects} prospects, ${item.clients} clients`}>{(['leads', 'prospects', 'clients'] as const).map((key) => <span key={key} style={{ width: `${item[key] / max * 100}%`, backgroundColor: stageColors[key] }} />)}</div></div> })}<Legend entries={[[stageColors.leads, 'Leads'], [stageColors.prospects, 'Prospects'], [stageColors.clients, 'Clients']]} /></div>
}

function IndustryPie({ items }: { items: Metric[] }) {
  const rows = items.filter((item) => item.clients > 0).sort((a, b) => b.clients - a.clients)
  const total = rows.reduce((sum, item) => sum + item.clients, 0)
  let at = 0
  const slices = rows.map((item, index) => { const start = at; at += item.clients / total * 100; return `${palette[index % palette.length]} ${start}% ${at}%` })
  if (!total) return <Empty text="Client wins will appear here when prospects convert." />
  return <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8"><div role="img" aria-label={`${total} client wins by industry`} className="relative size-40 shrink-0 rounded-full" style={{ background: `conic-gradient(${slices.join(', ')})` }}><div className="absolute inset-[27px] flex flex-col items-center justify-center rounded-full bg-white"><strong className="text-2xl tracking-tight">{fmt(total)}</strong><span className="text-[10px] text-[#89909b]">client wins</span></div></div><ul className="min-w-[145px] flex-1 space-y-2.5">{rows.slice(0, 7).map((item, index) => <li key={item.name} className="flex items-center gap-2 text-[10px]"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} /><span className="min-w-0 flex-1 truncate">{item.name}</span><strong>{Math.round(item.clients / total * 100)}%</strong></li>)}</ul></div>
}

function ActivityBars({ months }: { months: MonthMetric[] }) {
  const max = Math.max(1, ...months.flatMap((month) => [month.leads, month.outreach]))
  if (!months.some((month) => month.leads || month.outreach)) return <Empty text="Monthly activity will show once leads and outreach are recorded." />
  return <><div className="flex h-[205px] items-end gap-3 border-b border-dashed border-[#e4e7ec] px-1 sm:gap-5">{months.map((month, index) => <div key={month.label} className="flex h-full min-w-0 flex-1 flex-col justify-end"><div className="flex h-[170px] items-end justify-center gap-1.5"><div title={`${fmt(month.leads)} leads added`} className="w-4 rounded-t-md sm:w-6" style={{ height: `${Math.max(month.leads ? 5 : 0, month.leads / max * 100)}%`, backgroundColor: palette[index % palette.length] }} /><div title={`${fmt(month.outreach)} outreach touches`} className="w-4 rounded-t-md opacity-40 sm:w-6" style={{ height: `${Math.max(month.outreach ? 5 : 0, month.outreach / max * 100)}%`, backgroundColor: palette[index % palette.length] }} /></div><span className="mt-2 truncate text-center text-[9px] text-[#777f8c]">{month.label}</span></div>)}</div><Legend entries={[[palette[0], 'Leads added'], [`${palette[0]}66`, 'Outreach touches']]} /></>
}

function Legend({ entries }: { entries: [string, string][] }) {
  return <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">{entries.map(([color, label]) => <span key={label} className="flex items-center gap-1.5 text-[9px] text-[#777f8c]"><i className="size-2 rounded-sm" style={{ backgroundColor: color }} />{label}</span>)}</div>
}

function Empty({ text }: { text: string }) { return <div className="flex min-h-[205px] items-center justify-center rounded-xl bg-[#f8f9fb] px-6 text-center text-xs text-[#89909b]">{text}</div> }

export default async function AnalyticsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const organization = (await pool.query(
    `SELECT o."id", o."name" FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId" = o."id"
     WHERE m."authUserId" = $1 AND m."role" = 'ADMIN' ORDER BY o."createdAt" DESC LIMIT 1`, [session.user.id],
  )).rows[0]
  if (!organization) redirect('/onboarding')

  const [industryRows, categoryRows, totalsRows, activityRows] = await Promise.all([
    pool.query(
      `SELECT i."id", i."name",
        COUNT(l."id") FILTER (WHERE l."stage" = 'LEAD')::int AS leads,
        COUNT(l."id") FILTER (WHERE l."stage" = 'PROSPECT')::int AS prospects,
        COUNT(l."id") FILTER (WHERE l."stage" IN ('CLIENT','ONBOARDED','CAMPAIGN_SUCCESSFUL'))::int AS clients
       FROM "Industry" i LEFT JOIN "SalesLead" l ON l."organizationId" = i."organizationId" AND (
         l."industry" = i."name" OR EXISTS (SELECT 1 FROM "IndustryCategory" c WHERE c."id" = l."industryCategoryId" AND c."industryId" = i."id")
       ) WHERE i."organizationId" = $1 GROUP BY i."id", i."name" ORDER BY clients DESC, prospects DESC, i."name"`, [organization.id],
    ),
    pool.query(
      `SELECT c."id", c."name", i."name" AS "industryName",
        COUNT(l."id") FILTER (WHERE l."stage" = 'LEAD')::int AS leads,
        COUNT(l."id") FILTER (WHERE l."stage" = 'PROSPECT')::int AS prospects,
        COUNT(l."id") FILTER (WHERE l."stage" IN ('CLIENT','ONBOARDED','CAMPAIGN_SUCCESSFUL'))::int AS clients
       FROM "IndustryCategory" c JOIN "Industry" i ON i."id" = c."industryId"
       LEFT JOIN "SalesLead" l ON l."industryCategoryId" = c."id" AND l."organizationId" = i."organizationId"
       WHERE i."organizationId" = $1 GROUP BY c."id", c."name", i."name" ORDER BY clients DESC, prospects DESC, c."name"`, [organization.id],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "stage" = 'LEAD')::int AS leads,
        COUNT(*) FILTER (WHERE "stage" = 'PROSPECT')::int AS prospects,
        COUNT(*) FILTER (WHERE "stage" IN ('CLIENT','ONBOARDED','CAMPAIGN_SUCCESSFUL'))::int AS clients
       FROM "SalesLead" WHERE "organizationId" = $1`, [organization.id],
    ),
    pool.query(
      `SELECT TO_CHAR(m.month, 'Mon') AS label,
        COALESCE(l.leads, 0)::int AS leads, COALESCE(o.outreach, 0)::int AS outreach
       FROM GENERATE_SERIES(DATE_TRUNC('month', NOW()) - INTERVAL '5 months', DATE_TRUNC('month', NOW()), INTERVAL '1 month') m(month)
       LEFT JOIN (SELECT DATE_TRUNC('month', "createdAt") AS month, COUNT(*) AS leads FROM "SalesLead" WHERE "organizationId" = $1 GROUP BY 1) l ON l.month = m.month
       LEFT JOIN (SELECT DATE_TRUNC('month', "occurredAt") AS month, COUNT(*) AS outreach FROM "SalesOutreach" WHERE "organizationId" = $1 GROUP BY 1) o ON o.month = m.month
       ORDER BY m.month`, [organization.id],
    ),
  ])

  const mapMetric = (row: Record<string, unknown>, name: string): Metric => ({ name, leads: Number(row.leads), prospects: Number(row.prospects), clients: Number(row.clients) })
  const industries = industryRows.rows.map((row) => mapMetric(row, row.name))
  const categories = categoryRows.rows.map((row) => mapMetric(row, `${row.name} · ${row.industryName}`))
  const totals = totalsRows.rows[0]
  const leadCount = Number(totals.leads), prospectCount = Number(totals.prospects), clientCount = Number(totals.clients)
  const tracked = Number(totals.total)
  const months: MonthMetric[] = activityRows.rows.map((row) => ({ label: row.label, leads: Number(row.leads), outreach: Number(row.outreach) }))

  return <main className="min-h-screen bg-[#d9dde2] p-3 text-[#111827] md:p-4"><div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-3"><DashboardSidebar role="ADMIN" userName={session.user.name || 'Admin'} userEmail={session.user.email} organizationName={organization.name} /><section className="min-w-0 flex-1 rounded-[28px] border border-white/70 bg-[#f7f7f6] p-4 shadow-[0_14px_45px_rgba(15,23,42,0.06)] sm:p-6 lg:p-8">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9298a2]">{organization.name} · Workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em]">Analytics</h1><p className="mt-1 text-xs text-[#89909b]">A visual look at your pipeline, wins, and team activity.</p></div><span className="rounded-full bg-white px-3 py-2 text-[10px] font-medium text-[#707783] shadow-sm">Current pipeline</span></header>
    <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[['All businesses', tracked, '#8557e8'], ['Leads', leadCount, stageColors.leads], ['Prospects', prospectCount, stageColors.prospects], ['Clients', clientCount, stageColors.clients]].map(([label, value, color]) => <article key={String(label)} className="rounded-2xl border border-black/[0.05] bg-white px-4 py-3 shadow-sm"><p className="text-[10px] text-[#89909b]">{label}</p><div className="mt-1 flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: String(color) }} /><strong className="text-xl tracking-tight">{fmt(Number(value))}</strong></div></article>)}</section>
    <section className="grid gap-4 xl:grid-cols-2"><Card title="Conversion by industry" subtitle="Leads, prospects, and client wins in each industry."><ConversionChart items={industries} /></Card><Card title="Category performance" subtitle="Current pipeline by category, ranked by client share."><CategoryBars items={categories} /></Card><Card title="Client wins by industry" subtitle="How client wins are distributed across industries."><IndustryPie items={industries} /></Card><Card title="Lead & outreach activity" subtitle="Businesses added and outreach touches over the last six months."><ActivityBars months={months} /></Card></section>
    <p className="mt-4 text-[10px] text-[#9298a2]">Client wins include businesses currently at Client, Onboarded, or Campaign successful stage. Pipeline charts show current stages.</p>
  </section></div></main>
}
