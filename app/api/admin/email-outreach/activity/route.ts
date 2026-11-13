import { NextResponse } from 'next/server'
import { getWorkspaceSession } from '@/lib/admin-session'
import { pool } from '@/lib/db'
import { smtpReady } from '@/lib/smtp-mailbox'

export async function GET(request: Request) {
  const admin = await getWorkspaceSession()
  if (!admin) return NextResponse.json({ error: 'Sign in as an active workspace member.' }, { status: 401 })
  const params = new URL(request.url).searchParams
  const page = Math.max(1, Math.min(100000, Number(params.get('page')) || 1)) | 0
  const search = (params.get('search') || '').trim().slice(0, 160)
  const filter = params.get('status') || 'ALL'
  if (!['ALL','QUEUED','SENDING','SENT','FAILED','UNKNOWN','SKIPPED','CANCELLED'].includes(filter)) return NextResponse.json({ error: 'Invalid status filter.' }, { status: 400 })
  try {
    const id = admin.organization.id
    const automation = (await pool.query(`SELECT a."campaignId", a."enabled", a."status", a."subject", s."email" AS "senderEmail"
      FROM "EmailAutomation" a LEFT JOIN "OrganizationEmailSender" s ON s."id" = a."senderId" AND s."organizationId" = a."organizationId"
      WHERE a."organizationId" = $1`, [id])).rows[0]
    const campaign = automation?.campaignId || ''
    const [counts, activity, timing, current, next] = await Promise.all([
      pool.query(`SELECT "status", COUNT(*)::int AS count FROM "EmailSyncJob" WHERE "organizationId" = $1 AND "campaignId" = $2 GROUP BY "status"`, [id, campaign]),
      pool.query(`SELECT j."id", j."email", j."status", j."lastError", j."sentAt", j."updatedAt", l."contactName", l."businessName", l."phone", l."contactJobTitle", l."contactDepartment", COUNT(*) OVER()::int AS "totalRows"
        FROM "EmailSyncJob" j JOIN "SalesLead" l ON l."id" = j."leadId" AND l."organizationId" = j."organizationId"
        WHERE j."organizationId" = $1 AND j."campaignId" = $2 AND ($3 = 'ALL' OR j."status" = $3)
        AND ($4 = '' OR STRPOS(LOWER(CONCAT_WS(' ',l."businessName",l."contactName",j."email",l."phone")),LOWER($4)) > 0)
        ORDER BY CASE WHEN j."status" = 'SENDING' THEN 0 WHEN j."status" = 'QUEUED' THEN 2 ELSE 1 END,
        j."updatedAt" DESC, j."id" LIMIT 25 OFFSET $5`, [id, campaign, filter, search, (page - 1) * 25]),
      pool.query(`SELECT COUNT(*) FILTER (WHERE "sentAt" > NOW() - INTERVAL '24 hours')::int AS "sentToday",
        MIN("sentAt") FILTER (WHERE "sentAt" > NOW() - INTERVAL '24 hours') AS "firstSentToday",
        MAX("updatedAt") FILTER (WHERE "attempts" > 0) AS "lastAttemptAt"
        FROM "EmailSyncJob" WHERE "organizationId" = $1`, [id]),
      pool.query(`SELECT j."email", l."businessName", l."contactName" FROM "EmailSyncJob" j
        JOIN "SalesLead" l ON l."id" = j."leadId" AND l."organizationId" = j."organizationId"
        WHERE j."organizationId" = $1 AND j."campaignId" = $2 AND j."status" = 'SENDING' LIMIT 1`, [id, campaign]),
      pool.query(`SELECT j."email", j."availableAt", l."businessName", l."contactName" FROM "EmailSyncJob" j
        JOIN "SalesLead" l ON l."id" = j."leadId" AND l."organizationId" = j."organizationId"
        WHERE j."organizationId" = $1 AND j."campaignId" = $2 AND j."status" = 'QUEUED'
        ORDER BY j."createdAt", j."id" LIMIT 1`, [id, campaign]),
    ])
    const limits = timing.rows[0]
    const nextAt = Math.max(Date.now(), limits.lastAttemptAt ? new Date(limits.lastAttemptAt).getTime() + 60000 : 0,
      limits.sentToday >= 30 && limits.firstSentToday ? new Date(limits.firstSentToday).getTime() + 86400000 : 0,
      next.rows[0]?.availableAt ? new Date(next.rows[0].availableAt).getTime() : 0)
    return NextResponse.json({ enabled: Boolean(automation?.enabled) && automation?.status === 'READY' && smtpReady() && process.env.EMAIL_AUTOMATION_ENABLED !== 'false',
      senderEmail: automation?.senderEmail || null, subject: automation?.subject || '', counts: counts.rows,
      jobs: activity.rows, totalRows: activity.rows[0]?.totalRows || 0, page, current: current.rows[0] || null,
      next: next.rows[0] || null, nextSendAt: next.rows.length ? new Date(nextAt).toISOString() : null,
      dailyLimitReached: limits.sentToday >= 30, sentToday: limits.sentToday, serverTime: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Live activity could not be refreshed. Please try again.' }, { status: 503 }) }
}
