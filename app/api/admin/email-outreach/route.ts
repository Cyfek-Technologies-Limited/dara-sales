import { attachmentMetadata, resolveAttachments, type EmailAttachment } from '@/lib/email-attachments'
import { workspaceReader } from '@/lib/workspace-reader'
import { after, NextResponse } from 'next/server'
import { getWorkspaceSession } from '@/lib/admin-session'
import { pool } from '@/lib/db'
import { getEmailServerConfig, processEmailQueue, queueSavedLeads, SmtpError } from '@/lib/email-outreach'

import { activateOrganizationCampaign, pauseOrganizationCampaign } from '@/lib/email-campaigns'
import { smtpReady } from '@/lib/smtp-mailbox'
import { cleanProspectingDraft } from '@/lib/prospecting-draft'

export const maxDuration = 120

export async function GET() {
  const admin = await getWorkspaceSession()
  if (!admin) return NextResponse.json({ error: 'Sign in as an active workspace member.' }, { status: 401 })
  const reader = workspaceReader(admin.organization, admin.user.id)
  try {
    const id = admin.organization.id
    const config = await getEmailServerConfig(id)
    const [jobs, counts, profile, senders, industries, preferences] = await Promise.all([
      reader.query(`SELECT j."id", j."email", j."status", j."lastError", l."businessName"
        FROM "VisibleEmailSyncJob" j JOIN "VisibleSalesLead" l ON l."id" = j."leadId"
        WHERE j."organizationId" = $1 ORDER BY j."updatedAt" DESC LIMIT 50`, [id]),
      reader.query('SELECT "status", COUNT(*)::int AS "count" FROM "VisibleEmailSyncJob" WHERE "organizationId" = $1 GROUP BY "status"', [id]),
      reader.query('SELECT "subject", "message", "companyAddress", "industryId", "senderId", "enabled", "status", "attachments" FROM "EmailAutomation" WHERE "organizationId" = $1', [id]),
      reader.query('SELECT "id", "email" FROM "OrganizationEmailSender" WHERE "organizationId" = $1 AND "smtpPassword" IS NOT NULL ORDER BY "email"', [id]),
      reader.query('SELECT "id", "name" FROM "Industry" WHERE "organizationId" = $1 ORDER BY "name"', [id]),
      reader.query('SELECT "form" FROM "ProspectingPreference" WHERE "organizationId" = $1 AND "authUserId" = $2', [id, admin.user.id]),
    ])
    // Never return credentials, environment values or campaign routing to clients.
    const saved = cleanProspectingDraft(preferences.rows[0]?.form)
    const businessDescription = saved.offering || (/^(https?:\/\/|www\.)|^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(saved.businessInput.trim()) ? '' : saved.businessInput)
    return NextResponse.json({ businessDescription, mailboxConnectionAvailable: smtpReady(), automation: { configured: Boolean(config), enabled: Boolean(config?.enabled) }, profile: profile.rows[0] ? { ...profile.rows[0], attachments: attachmentMetadata(profile.rows[0].attachments || []) } : null, senders: senders.rows, industries: industries.rows, jobs: jobs.rows, counts: counts.rows }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Outreach activity is temporarily unavailable. Please try again shortly.' }, { status: 503 })
  }
}

async function saveProfile(organizationId: string, body: Record<string, unknown>, activating: boolean) {
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const companyAddress = typeof body.companyAddress === 'string' ? body.companyAddress.trim() : ''
  const industryId = typeof body.industryId === 'string' && body.industryId ? body.industryId : null
  const senderId = typeof body.senderId === 'string' && body.senderId ? body.senderId : null
  if (!subject || subject.length > 200 || /[\r\n]/.test(subject) || !message || message.length > 10000 || (activating && !companyAddress) || companyAddress.length > 500) throw new SmtpError(activating ? 'Enter a subject, email message, and company address within the field limits.' : 'Enter a subject and email message within the field limits.')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const lock = (await client.query('SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked', [`outreach:${organizationId}`])).rows[0]
    if (!lock.locked) throw new SmtpError('This workspace is updating its outreach. Try again shortly.')
    if (industryId && !(await client.query('SELECT "id" FROM "Industry" WHERE "id" = $1 AND "organizationId" = $2', [industryId, organizationId])).rows.length) throw new SmtpError('Choose an industry in your workspace.')
    if (senderId && !(await client.query('SELECT "id" FROM "OrganizationEmailSender" WHERE "id" = $1 AND "organizationId" = $2', [senderId, organizationId])).rows.length) throw new SmtpError('Choose a connected sender belonging to your organization.')
    const stored = (await client.query('SELECT "attachments" FROM "EmailAutomation" WHERE "organizationId" = $1 FOR UPDATE', [organizationId])).rows[0]
    let attachments: EmailAttachment[]
    try { attachments = resolveAttachments(body.attachments ?? [], stored?.attachments || []) } catch (error) { throw new SmtpError(error instanceof Error ? error.message : 'Invalid attachments.') }
    const result = await client.query(`INSERT INTO "EmailAutomation" ("organizationId", "campaignName", "subject", "message", "companyAddress", "industryId", "senderId", "attachments")
      VALUES ($1,'Organization outreach',$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT ("organizationId") DO UPDATE SET
      "legacyCampaignId" = CASE WHEN "EmailAutomation"."subject" IS DISTINCT FROM $2 OR "EmailAutomation"."message" IS DISTINCT FROM $3
        OR "EmailAutomation"."companyAddress" IS DISTINCT FROM $4 OR "EmailAutomation"."industryId" IS DISTINCT FROM $5
        OR "EmailAutomation"."senderId" IS DISTINCT FROM $6 OR "EmailAutomation"."attachments" IS DISTINCT FROM $7::jsonb THEN COALESCE(NULLIF("EmailAutomation"."campaignId", ''), "EmailAutomation"."legacyCampaignId") ELSE "EmailAutomation"."legacyCampaignId" END,
      "campaignId" = CASE WHEN "EmailAutomation"."subject" IS DISTINCT FROM $2 OR "EmailAutomation"."message" IS DISTINCT FROM $3
        OR "EmailAutomation"."companyAddress" IS DISTINCT FROM $4 OR "EmailAutomation"."industryId" IS DISTINCT FROM $5
        OR "EmailAutomation"."senderId" IS DISTINCT FROM $6 OR "EmailAutomation"."attachments" IS DISTINCT FROM $7::jsonb THEN '' ELSE "EmailAutomation"."campaignId" END,
      "attachments" = $7::jsonb, "subject" = $2, "message" = $3, "companyAddress" = $4, "industryId" = $5, "senderId" = $6, "status" = 'DRAFT', "updatedAt" = NOW()
      WHERE "EmailAutomation"."enabled" = FALSE RETURNING "organizationId"`, [organizationId, subject, message, companyAddress, industryId, senderId, JSON.stringify(attachments)])
    if (!result.rows.length) throw new SmtpError('Pause outreach before changing its message or audience.')
    await client.query('COMMIT')
    return attachments.map(file => file.id)
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}

export async function POST(request: Request) {
  const admin = await getWorkspaceSession()
  if (!admin) return NextResponse.json({ error: 'Sign in as an active workspace member.' }, { status: 401 })
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  if (Number(request.headers.get('content-length')) > 3 * 1024 * 1024) return NextResponse.json({ error: 'Attachments must total no more than 2 MB.' }, { status: 413 })
  const body = await request.json().catch(() => ({}))
  const id = admin.organization.id
  const ownerId = admin.organization.role === 'STAFF' ? admin.user.id : null
  try {
    if (body.action === 'process') {
      const config = await getEmailServerConfig(id)
      if (!config) return NextResponse.json({ error: 'The sending configuration is incomplete. Pause outreach, reconnect the selected SMTP mailbox, and activate again.' }, { status: 409 })
      if (!config.enabled) return NextResponse.json({ error: 'Sending is paused or disabled in the platform configuration.' }, { status: 409 })
      const processed = await processEmailQueue(id, ownerId || undefined)
      return NextResponse.json({ ok: true, processed }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (body.action === 'save' || body.action === 'activate') {
      if (body.action === 'activate' && body.confirmed !== true) throw new SmtpError('Review and approve your organization\'s message before activating outreach.')
      const attachmentIds = await saveProfile(id, body, body.action === 'activate')
      if (body.action === 'activate') {
        await activateOrganizationCampaign(id, { ...body, attachmentIds })
        await queueSavedLeads(id, ownerId || undefined)
        after(() => processEmailQueue(id, ownerId || undefined).then(() => {}).catch(() => console.error('[email] Background sync failed')))
      }
      return NextResponse.json({ ok: true, message: body.action === 'activate' ? 'Your organization\'s outreach is active. Matching prospects will join automatically.' : 'Message saved. It will be restored when you refresh or return.' })
    }
    if (body.action === 'pause') {
      await pauseOrganizationCampaign(id)
      return NextResponse.json({ ok: true, message: 'Your organization\'s outreach has been paused.' })
    }
    if (body.action !== 'retry') return NextResponse.json({ error: 'Unknown outreach action.' }, { status: 400 })
    const config = await getEmailServerConfig(id)
    if (!config?.enabled) return NextResponse.json({ error: 'Activate your organization\'s outreach first.' }, { status: 409 })
    await pool.query(`UPDATE "EmailSyncJob" SET "status" = 'QUEUED', "attempts" = 0, "availableAt" = NOW(), "lastError" = NULL,
      "updatedAt" = NOW() WHERE "organizationId" = $1 AND "campaignId" = $2 AND "status" = 'FAILED'
      AND ($3::text IS NULL OR EXISTS (SELECT 1 FROM "SalesLead" l WHERE l."id" = "EmailSyncJob"."leadId" AND l."organizationId" = $1 AND l."ownerId" = $3))`, [id, config.campaignId, ownerId])
    after(() => processEmailQueue(id, ownerId || undefined).then(() => {}).catch(() => console.error('[email] Background sync failed')))
    return NextResponse.json({ ok: true, message: 'Failed contacts will be retried automatically.' })
  } catch (error) {
    const code = (error as { code?: string })?.code
    console.error('[email] Outreach request failed', { action: body.action, code: typeof code === 'string' ? code : 'UNEXPECTED_ERROR' })
    if (body.action === 'process') {
      await pool.query(`UPDATE "EmailSyncJob" SET "lastError" = 'The queue worker failed before sending. Check the deployment logs or retry processing.'
        WHERE "organizationId" = $1 AND "status" = 'QUEUED'
        AND ($2::text IS NULL OR EXISTS (SELECT 1 FROM "SalesLead" l WHERE l."id" = "EmailSyncJob"."leadId" AND l."organizationId" = $1 AND l."ownerId" = $2))`, [id, ownerId]).catch(() => {})
    }
    return NextResponse.json({ error: body.action === 'process' ? 'The email queue worker could not run. Please retry; if it persists, check the server logs for the outreach error code.' : error instanceof SmtpError ? error.message : 'Could not update your outreach. Check that the latest database migration has been applied.' }, { status: 502 })
  }
}
