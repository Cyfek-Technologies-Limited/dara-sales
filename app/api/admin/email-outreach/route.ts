import { after, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { pool } from '@/lib/db'
import { getEmailServerConfig, processEmailQueue, queueSavedLeads, SmtpError } from '@/lib/email-outreach'

import { activateOrganizationCampaign, pauseOrganizationCampaign } from '@/lib/email-campaigns'
import { smtpReady } from '@/lib/smtp-mailbox'
import { cleanProspectingDraft } from '@/lib/prospecting-draft'

export const maxDuration = 120

export async function GET() {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Sign in as an active admin.' }, { status: 401 })
  try {
    const id = admin.organization.id
    const config = await getEmailServerConfig(id)
    const [jobs, counts, profile, senders, industries, preferences] = await Promise.all([
      pool.query(`SELECT j."id", j."email", j."status", j."lastError", l."businessName"
        FROM "EmailSyncJob" j JOIN "SalesLead" l ON l."id" = j."leadId"
        WHERE j."organizationId" = $1 ORDER BY j."updatedAt" DESC LIMIT 50`, [id]),
      pool.query('SELECT "status", COUNT(*)::int AS "count" FROM "EmailSyncJob" WHERE "organizationId" = $1 GROUP BY "status"', [id]),
      pool.query('SELECT "subject", "message", "companyAddress", "industryId", "senderId", "enabled", "status" FROM "EmailAutomation" WHERE "organizationId" = $1', [id]),
      pool.query('SELECT "id", "email" FROM "OrganizationEmailSender" WHERE "organizationId" = $1 AND "smtpPassword" IS NOT NULL ORDER BY "email"', [id]),
      pool.query('SELECT "id", "name" FROM "Industry" WHERE "organizationId" = $1 ORDER BY "name"', [id]),
      pool.query('SELECT "form" FROM "ProspectingPreference" WHERE "organizationId" = $1 AND "authUserId" = $2', [id, admin.user.id]),
    ])
    // Never return credentials, environment values or campaign routing to clients.
    const saved = cleanProspectingDraft(preferences.rows[0]?.form)
    const businessDescription = saved.offering || (/^(https?:\/\/|www\.)|^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(saved.businessInput.trim()) ? '' : saved.businessInput)
    return NextResponse.json({ businessDescription, mailboxConnectionAvailable: smtpReady(), automation: { configured: Boolean(config), enabled: Boolean(config?.enabled) }, profile: profile.rows[0] || null, senders: senders.rows, industries: industries.rows, jobs: jobs.rows, counts: counts.rows })
  } catch {
    return NextResponse.json({ error: 'Outreach activity is temporarily unavailable. Please try again shortly.' }, { status: 503 })
  }
}

async function saveProfile(organizationId: string, body: Record<string, unknown>) {
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const companyAddress = typeof body.companyAddress === 'string' ? body.companyAddress.trim() : ''
  const industryId = typeof body.industryId === 'string' && body.industryId ? body.industryId : null
  const senderId = typeof body.senderId === 'string' && body.senderId ? body.senderId : null
  if (!subject || subject.length > 200 || /[\r\n]/.test(subject) || !message || message.length > 10000 || !companyAddress || companyAddress.length > 500) throw new SmtpError('Enter a subject, email message, and company address within the field limits.')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const lock = (await client.query('SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked', [`outreach:${organizationId}`])).rows[0]
    if (!lock.locked) throw new SmtpError('This workspace is updating its outreach. Try again shortly.')
    if (industryId && !(await client.query('SELECT "id" FROM "Industry" WHERE "id" = $1 AND "organizationId" = $2', [industryId, organizationId])).rows.length) throw new SmtpError('Choose an industry in your workspace.')
    if (senderId && !(await client.query('SELECT "id" FROM "OrganizationEmailSender" WHERE "id" = $1 AND "organizationId" = $2', [senderId, organizationId])).rows.length) throw new SmtpError('Choose a connected sender belonging to your organization.')
    const result = await client.query(`INSERT INTO "EmailAutomation" ("organizationId", "campaignName", "subject", "message", "companyAddress", "industryId", "senderId")
      VALUES ($1,'Organization outreach',$2,$3,$4,$5,$6) ON CONFLICT ("organizationId") DO UPDATE SET
      "legacyCampaignId" = CASE WHEN "EmailAutomation"."subject" IS DISTINCT FROM $2 OR "EmailAutomation"."message" IS DISTINCT FROM $3
        OR "EmailAutomation"."companyAddress" IS DISTINCT FROM $4 OR "EmailAutomation"."industryId" IS DISTINCT FROM $5
        OR "EmailAutomation"."senderId" IS DISTINCT FROM $6 THEN COALESCE(NULLIF("EmailAutomation"."campaignId", ''), "EmailAutomation"."legacyCampaignId") ELSE "EmailAutomation"."legacyCampaignId" END,
      "campaignId" = CASE WHEN "EmailAutomation"."subject" IS DISTINCT FROM $2 OR "EmailAutomation"."message" IS DISTINCT FROM $3
        OR "EmailAutomation"."companyAddress" IS DISTINCT FROM $4 OR "EmailAutomation"."industryId" IS DISTINCT FROM $5
        OR "EmailAutomation"."senderId" IS DISTINCT FROM $6 THEN '' ELSE "EmailAutomation"."campaignId" END,
      "subject" = $2, "message" = $3, "companyAddress" = $4, "industryId" = $5, "senderId" = $6, "status" = 'DRAFT', "updatedAt" = NOW()
      WHERE "EmailAutomation"."enabled" = FALSE RETURNING "organizationId"`, [organizationId, subject, message, companyAddress, industryId, senderId])
    if (!result.rows.length) throw new SmtpError('Pause outreach before changing its message or audience.')
    await client.query('COMMIT')
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}

export async function POST(request: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Sign in as an active admin.' }, { status: 401 })
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const id = admin.organization.id
  try {
    if (body.action === 'process') {
      const config = await getEmailServerConfig(id)
      if (!config) return NextResponse.json({ error: 'The sending configuration is incomplete. Pause outreach, reconnect the selected SMTP mailbox, and activate again.' }, { status: 409 })
      if (!config.enabled) return NextResponse.json({ error: 'Sending is paused or disabled in the platform configuration.' }, { status: 409 })
      const processed = await processEmailQueue(id)
      return NextResponse.json({ ok: true, processed }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (body.action === 'save' || body.action === 'activate') {
      if (body.action === 'activate' && body.confirmed !== true) throw new SmtpError('Review and approve your organization\'s message before activating outreach.')
      await saveProfile(id, body)
      if (body.action === 'activate') {
        await activateOrganizationCampaign(id, body)
        await queueSavedLeads(id)
        after(() => processEmailQueue(id).then(() => {}).catch(() => console.error('[email] Background sync failed')))
      }
      return NextResponse.json({ ok: true, message: body.action === 'activate' ? 'Your organization\'s outreach is active. Matching leads will join automatically.' : 'Your organization\'s message and audience have been saved.' })
    }
    if (body.action === 'pause') {
      await pauseOrganizationCampaign(id)
      return NextResponse.json({ ok: true, message: 'Your organization\'s outreach has been paused.' })
    }
    if (body.action !== 'retry') return NextResponse.json({ error: 'Unknown outreach action.' }, { status: 400 })
    const config = await getEmailServerConfig(id)
    if (!config?.enabled) return NextResponse.json({ error: 'Activate your organization\'s outreach first.' }, { status: 409 })
    await pool.query(`UPDATE "EmailSyncJob" SET "status" = 'QUEUED', "attempts" = 0, "availableAt" = NOW(), "lastError" = NULL,
      "updatedAt" = NOW() WHERE "organizationId" = $1 AND "campaignId" = $2 AND "status" = 'FAILED'`, [id, config.campaignId])
    after(() => processEmailQueue(id).then(() => {}).catch(() => console.error('[email] Background sync failed')))
    return NextResponse.json({ ok: true, message: 'Failed contacts will be retried automatically.' })
  } catch (error) {
    const code = (error as { code?: string })?.code
    console.error('[email] Outreach request failed', { action: body.action, code: typeof code === 'string' ? code : 'UNEXPECTED_ERROR' })
    if (body.action === 'process') {
      await pool.query(`UPDATE "EmailSyncJob" SET "lastError" = 'The queue worker failed before sending. Check the deployment logs or retry processing.'
        WHERE "organizationId" = $1 AND "status" = 'QUEUED'`, [id]).catch(() => {})
    }
    return NextResponse.json({ error: body.action === 'process' ? 'The email queue worker could not run. Please retry; if it persists, check the server logs for the outreach error code.' : error instanceof SmtpError ? error.message : 'Could not update your outreach. Check that the latest database migration has been applied.' }, { status: 502 })
  }
}
