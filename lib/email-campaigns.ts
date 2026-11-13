import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { SmtpError } from '@/lib/email-outreach'
import { smtpReady } from '@/lib/smtp-mailbox'
export async function activateOrganizationCampaign(organizationId: string, approved: Record<string, unknown>) {
  if (!smtpReady() || process.env.EMAIL_AUTOMATION_ENABLED === 'false') throw new SmtpError('Email sending is not enabled by the platform administrator.')
  const origin = process.env.NEXT_PUBLIC_APP_URL || ''
  let publicUrl: URL
  try { publicUrl = new URL(origin) } catch { throw new SmtpError('Configure the public application URL before sending.') }
  if (publicUrl.username || publicUrl.password || (publicUrl.protocol !== 'https:' && !(publicUrl.protocol === 'http:' && publicUrl.hostname === 'localhost'))) throw new SmtpError('Configure the public application URL before sending.')
  const result = await pool.query(`UPDATE "EmailAutomation" a SET "enabled" = TRUE, "status" = 'READY',
    "campaignId" = CASE WHEN a."campaignId" LIKE 'smtp:%' THEN a."campaignId" ELSE $2 END, "updatedAt" = NOW()
    FROM "OrganizationEmailSender" s WHERE a."organizationId" = $1 AND s."id" = a."senderId"
    AND s."organizationId" = a."organizationId" AND s."smtpPassword" IS NOT NULL
    AND a."enabled" = FALSE AND a."subject" = $3 AND a."message" = $4 AND a."companyAddress" = $5
    AND a."senderId" = $6 AND a."industryId" IS NOT DISTINCT FROM $7
    AND (SELECT COALESCE(jsonb_agg(f->>'id' ORDER BY position), '[]'::jsonb) FROM jsonb_array_elements(a."attachments") WITH ORDINALITY AS files(f, position)) = $8::jsonb RETURNING a."campaignId"`,
    [organizationId, `smtp:${randomUUID()}`, String(approved.subject).trim(), String(approved.message).trim(), String(approved.companyAddress).trim(), approved.senderId, approved.industryId || null, JSON.stringify(approved.attachmentIds || [])])
  if (!result.rows.length) throw new SmtpError('Save your message and connect an SMTP business mailbox first.')
  await pool.query(`UPDATE "EmailSyncJob" SET "status" = 'CANCELLED', "updatedAt" = NOW()
    WHERE "organizationId" = $1 AND "campaignId" <> $2 AND "status" IN ('QUEUED','FAILED')`, [organizationId, result.rows[0].campaignId])
}
export async function pauseOrganizationCampaign(organizationId: string) {
  await pool.query('UPDATE "EmailAutomation" SET "enabled" = FALSE, "updatedAt" = NOW() WHERE "organizationId" = $1', [organizationId])
}
