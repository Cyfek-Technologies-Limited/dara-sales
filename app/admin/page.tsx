```tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { InviteLinkButton } from '@/components/invite-link-button'

function money(value: string | number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function number(value: string | number) {
  return new Intl.NumberFormat('en-NG').format(Number(value || 0))
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}

const avatarColors = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
]

export default async function AdminDashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) redirect('/sign-in')

  const organizationResult = await pool.query(
    `SELECT o.*
     FROM "Organization" o
     JOIN "OrganizationMember" m
       ON m."organizationId" = o."id"
     WHERE m."authUserId" = $1
       AND m."role" = 'ADMIN'
     ORDER BY o."createdAt" DESC
     LIMIT 1`,
    [session.user.id],
  )

  const organization = organizationResult.rows[0]

  if (!organization) redirect('/onboarding')

  const staffResult = await pool.query(
    `SELECT
       m."authUserId",
       m."jobTitle",
       m."joinedAt",
       m."lastActiveAt",
       u."name",
       u."email",
       COALESCE(SUM(p."leadsCreated"), 0) AS "leadsCreated",
       COALESCE(SUM(p."qualifiedLeads"), 0) AS "qualifiedLeads",
       COALESCE(SUM(p."dealsWon"), 0) AS "dealsWon",
       COALESCE(SUM(p."revenue"), 0) AS "revenue"
     FROM "OrganizationMember" m
     JOIN "user" u
       ON u."id" = m."authUserId"
     LEFT JOIN "StaffPerformance" p
       ON p."organizationId" = m."organizationId"
       AND p."authUserId" = m."authUserId"
     WHERE m."organizationId" = $1
       AND m."role" = 'STAFF'
     GROUP BY
       m."authUserId",
       m."jobTitle",
       m."joinedAt",
       m."lastActiveAt",
       u."name",
       u."email"
     ORDER BY SUM(p."revenue") DESC NULLS LAST`,
    [organization.id],
  )

  const staff = staffResult.rows

  const totals = staff.reduce(
    (result, member) => ({
      leads: result.leads + Number(member.leadsCreated || 0),
      qualified:
        result.qualified + Number(member.qualifiedLeads || 0),
      deals: result.deals + Number(member.dealsWon || 0),
      revenue: result.revenue + Number(member.revenue || 0),
    }),
    { leads: 0, qualified: 0, deals: 0, revenue: 0 },
  )

  const qualificationRate =
    totals.leads > 0
      ? Math.round((totals.qualified / totals.leads) * 100)
      : 0

  const winRate =
    totals.leads > 0
      ? Math.round((totals.deals / totals.leads) * 100)
      : 0

  const metrics = [
    {
      label: 'Total team members',
      value: number(staff.length),
      detail: 'Registered sales staff',
      icon: '01',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Leads generated',
      value: number(totals.leads),
      detail: `${qualificationRate}% qualification rate`,
      icon: '02',
      color: 'bg-violet-50 text-violet-700',
    },
    {
      label: 'Deals closed',
      value: number(totals.deals),
      detail: `${winRate}% of generated leads`,
      icon: '03',
      color: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Revenue generated',
      value: money(totals.revenue),
      detail: 'Total recorded revenue',
      icon: '04',
      color: 'bg-orange-50 text-orange-700',
    },
  ]

  const adminName = session.user.name || 'Admin'

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Top navigation */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
              S
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-slate-950">
                Sequoia
              </p>
              <p className="text-xs text-slate-500">
                Admin workspace
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium capitalize text-slate-600 sm:inline-flex">
              {organization.plan || 'Free'} plan
            </span>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                {initials(adminName)}
              </div>

              <div className="hidden sm:block">
                <p className="max-w-36 truncate text-sm font-semibold text-slate-800">
                  {adminName}
                </p>
                <p className="text-xs text-slate-500">
                  Administrator
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        {/* Page introduction */}
        <section className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span>Workspace</span>
              <span>/</span>
              <span className="text-slate-800">
                {organization.name}
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Get a clear view of your sales team, track performance,
              and see how your team is progressing toward its goals.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Workspace active
              </span>

              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                {organization.industry || 'Industry not set'}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <InviteLinkButton />
          </div>
        </section>

        {/* Performance overview */}
        <section className="mt-9">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Performance overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your team's overall sales performance.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-500">
                    {metric.label}
                  </p>

                  <span
                    className={`flex size-9 items-center justify-center rounded-xl text-[10px] font-bold ${metric.color}`}
                  >
                    {metric.icon}
                  </span>
                </div>

                <p className="mt-5 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {metric.value}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {metric.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Conversion summary */}
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Lead qualification
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Share of leads marked as qualified
                </p>
              </div>

              <span className="text-2xl font-bold tracking-tight text-violet-700">
                {qualificationRate}%
              </span>
            </div>

            <div
              className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Lead qualification rate"
              aria-valuenow={qualificationRate}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{
                  width: `${Math.min(100, qualificationRate)}%`,
                }}
              />
            </div>

            <div className="mt-3 flex justify-between text-xs text-slate-500">
              <span>{number(totals.qualified)} qualified</span>
              <span>{number(totals.leads)} total leads</span>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Lead-to-deal conversion
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Share of leads that resulted in a deal
                </p>
              </div>

              <span className="text-2xl font-bold tracking-tight text-emerald-700">
                {winRate}%
              </span>
            </div>

            <div
              className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Lead-to-deal conversion rate"
              aria-valuenow={winRate}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${Math.min(100, winRate)}%`,
                }}
              />
            </div>

            <div className="mt-3 flex justify-between text-xs text-slate-500">
              <span>{number(totals.deals)} deals won</span>
              <span>{number(totals.leads)} total leads</span>
            </div>
          </article>
        </section>

        {/* Staff performance table */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.02]">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-bold text-slate-950">
                Team performance
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review individual results and identify your top performers.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {staff.length} {staff.length === 1 ? 'member' : 'members'}
            </div>
          </div>

          {staff.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Staff member
                      </th>
                      <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Leads
                      </th>
                      <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Qualified
                      </th>
                      <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Deals won
                      </th>
                      <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Revenue
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {staff.map((member, index) => {
                      const leads = Number(member.leadsCreated || 0)
                      const qualified = Number(
                        member.qualifiedLeads || 0,
                      )
                      const deals = Number(member.dealsWon || 0)
                      const revenue = Number(member.revenue || 0)

                      const memberQualification = leads > 0
                        ? Math.round((qualified / leads) * 100)
                        : 0

                      const memberWinRate = leads > 0
                        ? Math.round((deals / leads) * 100)
                        : 0

                      return (
                        <tr
                          key={member.authUserId}
                          className="transition-colors hover:bg-slate-50/80"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                  avatarColors[
                                    index % avatarColors.length
                                  ]
                                }`}
                              >
                                {initials(member.name || member.email || 'S')}
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-56 truncate text-sm font-semibold text-slate-900">
                                  {member.name || 'Unnamed member'}
                                </p>
                                <p className="mt-1 max-w-56 truncate text-xs text-slate-500">
                                  {member.email}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {member.jobTitle || 'Sales staff'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-right">
                            <span className="text-sm font-semibold text-slate-800">
                              {number(leads)}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-right">
                            <div className="inline-flex flex-col items-end gap-1">
                              <span className="text-sm font-semibold text-slate-800">
                                {number(qualified)}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {memberQualification}% of leads
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-right">
                            <div className="inline-flex flex-col items-end gap-1">
                              <span className="text-sm font-semibold text-slate-800">
                                {number(deals)}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {memberWinRate}% of leads
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <span className="whitespace-nowrap text-sm font-bold text-slate-950">
                              {money(revenue)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Showing {staff.length} registered{' '}
                  {staff.length === 1 ? 'member' : 'members'}
                </p>

                <p className="text-xs text-slate-500">
                  Total tracked revenue:{' '}
                  <span className="font-bold text-slate-800">
                    {money(totals.revenue)}
                  </span>
                </p>
              </div>
            </>
          ) : (
            <div className="px-5 py-16 text-center sm:px-10">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="size-7"
                  aria-hidden="true"
                >
                  <path
                    d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="10" cy="7" r="4" />
                  <path
                    d="M20 8v6m3-3h-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-950">
                Build your sales team
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Invite your sales staff to start tracking leads,
                qualified opportunities, closed deals, and revenue.
                Your team's performance will appear here as results
                are recorded.
              </p>

              <div className="mt-6 flex justify-center">
                <InviteLinkButton />
              </div>
            </div>
          )}
        </section>

        {/* Workspace footer */}
        <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200/80 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {organization.name} · Sales performance workspace
          </p>
          <p>
            Focus on progress. Build a stronger team.
          </p>
        </footer>
      </div>
    </main>
  )
}
