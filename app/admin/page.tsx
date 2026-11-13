import { workspaceReader } from '@/lib/workspace-reader'
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { InviteLinkButton } from "@/components/invite-link-button";
import { UpgradePlanButton } from "@/components/upgrade-plan-button";
import type { SalesStageCounts } from "@/components/sales-dashboard-widgets";
import { AdminDashboardOverview, type DailyActivity } from "@/components/admin-dashboard-overview";

export default async function AdminDashboard() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  const organization = (
    await pool.query(
      `SELECT m."role", o.* FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId" = o."id"
     WHERE m."authUserId" = $1 AND m."role" IN ('ADMIN','STAFF') AND m."status" = 'ACTIVE' ORDER BY o."createdAt" DESC LIMIT 1`,
      [session.user.id]
    )
  ).rows[0];
  if (!organization) redirect("/onboarding");
  const reader = workspaceReader(organization, session.user.id)

  const [staffResult, stagesResult, outreachResult, recentResult, activityResult, emailResult] =
    await Promise.all([
      reader.query(
        `SELECT m."authUserId", m."jobTitle", u."name", u."email",
        (SELECT COUNT(*)::int FROM "VisibleSalesLead" l WHERE l."organizationId"=m."organizationId" AND l."ownerId"=m."authUserId") AS "leadCount",
        (SELECT COUNT(*)::int FROM "VisibleSalesOutreach" s WHERE s."organizationId"=m."organizationId" AND s."ownerId"=m."authUserId"
          AND s."occurredAt">=(DATE_TRUNC('day',NOW() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')
          AND s."occurredAt"<((DATE_TRUNC('day',NOW() AT TIME ZONE 'Africa/Lagos')+INTERVAL '1 day') AT TIME ZONE 'Africa/Lagos')) AS "outreachToday"
       FROM "OrganizationMember" m JOIN "user" u ON u."id"=m."authUserId"
       WHERE m."organizationId"=$1 AND m."role"='STAFF' AND m."status"='ACTIVE'
       ORDER BY "outreachToday" DESC, "leadCount" DESC LIMIT 5`,
        [organization.id]
      ),
      reader.query(
        `SELECT COUNT(*) FILTER (WHERE "stage"='LEAD')::int AS lead,
              COUNT(*) FILTER (WHERE "stage"='PROSPECT')::int AS prospect,
              COUNT(*) FILTER (WHERE "stage"='CLIENT')::int AS client,
              COUNT(*) FILTER (WHERE "stage"='ONBOARDED')::int AS onboarded,
              COUNT(*) FILTER (WHERE "stage"='CAMPAIGN_SUCCESSFUL')::int AS successful,
              COUNT(*)::int AS total
       FROM "VisibleSalesLead" WHERE "organizationId"=$1`,
        [organization.id]
      ),
      reader.query(
        `SELECT COUNT(*)::int AS count FROM "VisibleSalesOutreach" WHERE "organizationId"=$1
       AND "occurredAt">=(DATE_TRUNC('day',NOW() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')
       AND "occurredAt"<((DATE_TRUNC('day',NOW() AT TIME ZONE 'Africa/Lagos')+INTERVAL '1 day') AT TIME ZONE 'Africa/Lagos')`,
        [organization.id]
      ),
      reader.query(
        `SELECT l."id", l."businessName", l."contactName", l."industry", l."stage", u."name" AS "ownerName", u."email" AS "ownerEmail", o."channel" AS "outreachChannel", o."occurredAt" AS "outreachAt"
       FROM "VisibleSalesLead" l LEFT JOIN "user" u ON u."id"=l."ownerId"
       LEFT JOIN LATERAL (SELECT "channel","occurredAt" FROM "VisibleSalesOutreach" WHERE "leadId"=l."id" ORDER BY "occurredAt" DESC LIMIT 1) o ON true
       WHERE l."organizationId"=$1 ORDER BY l."createdAt" DESC LIMIT 4`,
        [organization.id]
      ),
      reader.query(
        `WITH days AS (SELECT generate_series((NOW() AT TIME ZONE 'Africa/Lagos')::date - 6, (NOW() AT TIME ZONE 'Africa/Lagos')::date, INTERVAL '1 day') AS day)
         SELECT TO_CHAR(days.day, 'Dy') AS label, COUNT(l."id")::int AS leads
         FROM days LEFT JOIN "VisibleSalesLead" l ON l."organizationId"=$1
           AND (l."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Lagos')::date = days.day::date
         GROUP BY days.day ORDER BY days.day`, [organization.id]
      ),
      reader.query(
        `SELECT COUNT(*)::int AS count FROM "VisibleEmailSyncJob" WHERE "organizationId" = $1 AND "status" = 'SENT'`, [organization.id]
      ),
    ]);

  const totalEmailsSent = Number(emailResult.rows[0]?.count || 0);
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
      await reader.query(
        `SELECT COUNT(*)::int AS count FROM "OrganizationMember" WHERE "organizationId"=$1 AND "role"='STAFF' AND "status"='ACTIVE'`,
        [organization.id]
      )
    ).rows[0].count
  );
  const planExceeded =
    Number(organization.staffCount || 0) > 0 &&
    activeStaff >= Number(organization.staffCount);
  const activity: DailyActivity[] = activityResult.rows.map((day: { label: string; leads: number }) => ({ label: day.label, leads: Number(day.leads) }));
  const adminName = session.user.name || "Admin";
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date());

  return (
    <main className="dashboard-page">
      <div className="dashboard-frame">
        <DashboardSidebar role={organization.role} userName={adminName} userEmail={session.user.email} organizationName={organization.name} />
        <section className="dashboard-content">
          <AdminDashboardOverview organizationName={organization.name} today={today} stageCounts={stageCounts} totalLeads={totalLeads} activeStaff={activeStaff} totalOutreach={totalOutreach} totalEmailsSent={totalEmailsSent} staff={staff} businesses={recentResult.rows} activity={activity} actions={<>{planExceeded && <UpgradePlanButton currentPlan={organization.plan || 'FREE'} />}<InviteLinkButton /></>} />
        </section>
      </div>
    </main>
  );
}
