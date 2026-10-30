import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Mail,
  Search,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { InviteLinkButton } from "@/components/invite-link-button";
import { UpgradePlanButton } from "@/components/upgrade-plan-button";
import {
  RecentLeadRow,
  SalesStageTracker,
  type RecentLead,
  type SalesStageCounts,
} from "@/components/sales-dashboard-widgets";

function money(value: string | number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
function number(value: string | number) {
  return new Intl.NumberFormat("en-NG").format(Number(value || 0));
}
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export default async function AdminDashboard() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  const organization = (
    await pool.query(
      `SELECT o.* FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId" = o."id"
     WHERE m."authUserId" = $1 AND m."role" = 'ADMIN' ORDER BY o."createdAt" DESC LIMIT 1`,
      [session.user.id]
    )
  ).rows[0];
  if (!organization) redirect("/onboarding");

  const [staffResult, stagesResult, outreachResult, recentResult] =
    await Promise.all([
      pool.query(
        `SELECT m."authUserId", m."jobTitle", u."name", u."email",
        (SELECT COUNT(*)::int FROM "SalesLead" l WHERE l."organizationId"=m."organizationId" AND l."ownerId"=m."authUserId") AS "leadCount",
        (SELECT COUNT(*)::int FROM "SalesOutreach" s WHERE s."organizationId"=m."organizationId" AND s."ownerId"=m."authUserId"
          AND s."occurredAt">=(DATE_TRUNC('day',NOW() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')
          AND s."occurredAt"<((DATE_TRUNC('day',NOW() AT TIME ZONE 'Africa/Lagos')+INTERVAL '1 day') AT TIME ZONE 'Africa/Lagos')) AS "outreachToday"
       FROM "OrganizationMember" m JOIN "user" u ON u."id"=m."authUserId"
       WHERE m."organizationId"=$1 AND m."role"='STAFF' AND m."status"='ACTIVE'
       ORDER BY "outreachToday" DESC, "leadCount" DESC LIMIT 5`,
        [organization.id]
      ),
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE "stage"='LEAD')::int AS lead,
              COUNT(*) FILTER (WHERE "stage"='PROSPECT')::int AS prospect,
              COUNT(*) FILTER (WHERE "stage"='CLIENT')::int AS client,
              COUNT(*) FILTER (WHERE "stage"='ONBOARDED')::int AS onboarded,
              COUNT(*) FILTER (WHERE "stage"='CAMPAIGN_SUCCESSFUL')::int AS successful,
              COUNT(*)::int AS total,
              COALESCE(SUM("advertiserSpend") FILTER (WHERE "stage"='CAMPAIGN_SUCCESSFUL'),0)::text AS spend
       FROM "SalesLead" WHERE "organizationId"=$1`,
        [organization.id]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM "SalesOutreach" WHERE "organizationId"=$1
       AND "occurredAt">=(DATE_TRUNC('day',NOW() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')
       AND "occurredAt"<((DATE_TRUNC('day',NOW() AT TIME ZONE 'Africa/Lagos')+INTERVAL '1 day') AT TIME ZONE 'Africa/Lagos')`,
        [organization.id]
      ),
      pool.query(
        `SELECT l."businessName", l."contactName", l."industry", l."stage", u."name" AS "ownerName", u."email" AS "ownerEmail", o."channel" AS "outreachChannel", o."occurredAt" AS "outreachAt"
       FROM "SalesLead" l LEFT JOIN "user" u ON u."id"=l."ownerId"
       LEFT JOIN LATERAL (SELECT "channel","occurredAt" FROM "SalesOutreach" WHERE "leadId"=l."id" ORDER BY "occurredAt" DESC LIMIT 1) o ON true
       WHERE l."organizationId"=$1 ORDER BY l."createdAt" DESC LIMIT 1`,
        [organization.id]
      ),
    ]);

  const staff = staffResult.rows;
  const stageRow = stagesResult.rows[0];
  const stageCounts: SalesStageCounts = {
    LEAD: Number(stageRow.lead),
    PROSPECT: Number(stageRow.prospect),
    CLIENT: Number(stageRow.client),
    ONBOARDED: Number(stageRow.onboarded),
    CAMPAIGN_SUCCESSFUL: Number(stageRow.successful),
  };
  const totalOutreach = Number(outreachResult.rows[0].count);
  const totalLeads = Number(stageRow.total);
  const activeStaff = Number(
    (
      await pool.query(
        `SELECT COUNT(*)::int AS count FROM "OrganizationMember" WHERE "organizationId"=$1 AND "role"='STAFF' AND "status"='ACTIVE'`,
        [organization.id]
      )
    ).rows[0].count
  );
  const planExceeded =
    Number(organization.staffCount || 0) > 0 &&
    activeStaff >= Number(organization.staffCount);
  const recentLead = recentResult.rows[0] as RecentLead | undefined;
  const adminName = session.user.name || "Admin";
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date());

  return (
    <main className="min-h-screen bg-[#f4f6f9] p-3 text-[#07121f] md:p-4">
      <div className="flex min-h-screen gap-3">
        <DashboardSidebar
          role="ADMIN"
          userName={adminName}
          userEmail={session.user.email}
          organizationName={organization.name}
        />
        <section className="min-w-0 flex-1 rounded-[26px] border-[1px] border-black/30 bg-[#fbfcfe] px-4 py-4 shadow-[0_10px_30px_rgba(7,18,31,0.04)] sm:px-7 sm:py-6">
          <header className="flex items-center justify-between border-b-[1px] border-black/30 pb-4">
            <div>
              <p className="text-[11px] text-[#657286]">{today}</p>
              <h1 className="mt-1 font-serif text-xl font-semibold">
                Good morning, {adminName.split(/\s+/)[0]}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Search dashboard"
                className="rounded-full border-[1px] border-black/30 bg-white p-2.5 text-[#657286]"
              >
                <Search className="size-4" />
              </button>
              <button
                aria-label="Notifications"
                className="rounded-full border-[1px] border-black/30 bg-white p-2.5 text-[#657286]"
              >
                <Bell className="size-4" />
              </button>
              <span className="ml-1 hidden border-l-[1px] border-black/30 pl-3 text-right sm:block">
                <span className="block text-xs font-semibold">{adminName}</span>
                <span className="text-[10px] text-[#657286]">
                  Administrator
                </span>
              </span>
              <span className="flex size-9 items-center justify-center rounded-full bg-[#07121f] text-xs font-bold text-white">
                {initials(adminName)}
              </span>
            </div>
          </header>

          <div className="py-6">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-medium text-[#657286]">
                  {organization.name} · Sales workspace
                </p>
                <h2 className="mt-1 font-serif text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  Sales overview
                </h2>
                <p className="mt-1 text-sm text-[#657286]">
                  Keep outreach, pipeline progress, and successful campaigns in
                  view.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {planExceeded && (
                  <UpgradePlanButton
                    currentPlan={organization.plan || "FREE"}
                  />
                )}
                <InviteLinkButton />
              </div>
            </div>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Sales interns",
                  value: activeStaff,
                  detail: `${organization.staffCount || 0} seats available`,
                  icon: Users,
                },
                {
                  label: "Businesses in pipeline",
                  value: totalLeads,
                  detail: `${stageCounts.PROSPECT} prospects · ${stageCounts.CLIENT} clients`,
                  icon: Target,
                },
                {
                  label: "Outreach today",
                  value: totalOutreach,
                  detail: `Target ${activeStaff * 20} across the team`,
                  icon: Mail,
                },
                {
                  label: "Successful ad spend",
                  value: money(stageRow.spend),
                  detail: `${stageCounts.CAMPAIGN_SUCCESSFUL} successful campaigns`,
                  icon: Zap,
                },
              ].map(({ label, value, detail, icon: Icon }, index) => (
                <article
                  key={label}
                  className={`rounded-[20px] border-[1px] p-4 shadow-[0_5px_18px_rgba(7,18,31,0.035)] ${
                    index === 0
                      ? "border-black/30 bg-[#07121f] text-white"
                      : "border-black/30 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs font-medium ${
                        index === 0 ? "text-[#d6deea]" : "text-[#657286]"
                      }`}
                    >
                      {label}
                    </p>
                    <span
                      className={`rounded-xl p-2 ${
                        index === 0
                          ? "bg-white/10 text-[#a5f36c]"
                          : "bg-[#e9eef5] text-[#07121f]"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                  </div>
                  <p className="mt-4 font-serif text-3xl font-semibold">
                    {typeof value === "number" ? number(value) : value}
                  </p>
                  <p
                    className={`mt-1 text-[10px] ${
                      index === 0 ? "text-[#d6deea]" : "text-[#657286]"
                    }`}
                  >
                    {detail}
                  </p>
                </article>
              ))}
            </section>

            <div className="mt-4">
              <SalesStageTracker counts={stageCounts} />
            </div>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_.9fr]">
              <article className="rounded-[24px] border-[1px] border-black/30 bg-white p-5 shadow-[0_8px_24px_rgba(7,18,31,0.035)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-lg font-semibold">
                      Recent leads
                    </h3>
                    <p className="mt-1 text-xs text-[#657286]">
                      The latest business added to your team pipeline.
                    </p>
                  </div>
                  <Link
                    href="/admin/leads"
                    className="shrink-0 rounded-full border-[1px] border-black/30 px-3 py-2 text-[10px] font-semibold text-[#07121f] hover:bg-[#f4f6f9]"
                  >
                    View more
                  </Link>
                </div>
                {recentLead ? (
                  <RecentLeadRow lead={recentLead} />
                ) : (
                  <p className="mt-5 border-t-[1px] border-black/30 py-6 text-sm text-[#657286]">
                    New team leads will appear here.
                  </p>
                )}
              </article>
              <article className="rounded-[24px] border-[1px] border-black/30 bg-white p-5 shadow-[0_8px_24px_rgba(7,18,31,0.035)] sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-semibold">
                      Team outreach
                    </h3>
                    <p className="mt-1 text-xs text-[#657286]">
                      Daily progress · target 20 per intern
                    </p>
                  </div>
                  <CalendarDays className="size-4 text-[#07121f]" />
                </div>
                <div className="mt-3 divide-y divide-black/30">
                  {staff.slice(0, 3).map((member) => (
                    <div
                      key={member.authUserId}
                      className="flex items-center gap-3 py-3"
                    >
                      <span className="flex size-8 items-center justify-center rounded-full bg-[#e9eef5] text-[10px] font-bold">
                        {initials(member.name || member.email)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2">
                          <p className="truncate text-xs font-semibold">
                            {member.name || member.email}
                          </p>
                          <span className="text-[10px] font-semibold">
                            {number(member.outreachToday)}/20
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e9eef5]">
                          <div
                            className="h-full rounded-full bg-[#07121f]"
                            style={{
                              width: `${Math.min(
                                (Number(member.outreachToday) / 20) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {staff.length === 0 && (
                    <p className="py-6 text-xs text-[#657286]">
                      Invite interns to start tracking outreach.
                    </p>
                  )}
                </div>
                <Link
                  href="/admin/team"
                  className="mt-2 inline-block text-[11px] font-semibold text-[#07121f] underline"
                >
                  View team progress
                </Link>
              </article>
            </section>

            <section className="mt-4 flex flex-col justify-between gap-4 rounded-[22px] bg-[#07121f] p-5 text-white sm:flex-row sm:items-center sm:px-7">
              <div>
                <p className="font-serif text-lg font-semibold">
                  Build a steady sales pipeline
                </p>
                <p className="mt-1 text-xs text-[#d6deea]">
                  Your team earns 10% commission on advertiser spend after a
                  campaign succeeds.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#a5f36c]">
                <CheckCircle2 className="size-4" />
                {number(totalLeads)} businesses tracked
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
