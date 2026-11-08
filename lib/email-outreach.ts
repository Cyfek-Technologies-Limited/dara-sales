import { pool } from '@/lib/db'
import { smtpReady, smtpTransport } from '@/lib/smtp-mailbox'

export class SmtpError extends Error {}
export async function getEmailServerConfig(organizationId: string) {
  const row = (await pool.query(`SELECT a.*, s."email", s."senderName", s."smtpHost", s."smtpPort", s."smtpUsername", s."smtpPassword", o."name" AS "organizationName"
    FROM "EmailAutomation" a JOIN "OrganizationEmailSender" s ON s."id" = a."senderId" AND s."organizationId" = a."organizationId"
    JOIN "Organization" o ON o."id" = a."organizationId"
    WHERE a."organizationId" = $1 AND a."campaignId" LIKE 'smtp:%' AND a."status" = 'READY' AND s."smtpPassword" IS NOT NULL`, [organizationId])).rows[0]
  return row ? { ...row, enabled: Boolean(row.enabled) && smtpReady() && process.env.EMAIL_AUTOMATION_ENABLED !== 'false' } : null
}
export const prepareEmailAutomation = getEmailServerConfig

export async function processEmailQueue(organizationId?: string) {
  if (!smtpReady() || process.env.EMAIL_AUTOMATION_ENABLED === 'false') return 0
  await pool.query(`INSERT INTO "EmailSyncJob" ("id", "organizationId", "leadId", "email", "campaignId")
    SELECT gen_random_uuid()::text, l."organizationId", l."id", LOWER(TRIM(l."email")), a."campaignId"
    FROM "SalesLead" l JOIN "EmailAutomation" a ON a."organizationId" = l."organizationId"
    JOIN "OrganizationEmailSender" s ON s."id" = a."senderId" AND s."organizationId" = a."organizationId"
    LEFT JOIN "IndustryCategory" c ON c."id" = l."industryCategoryId"
    WHERE ($1::text IS NULL OR l."organizationId" = $1) AND a."enabled" AND a."status" = 'READY'
      AND a."campaignId" LIKE 'smtp:%' AND s."smtpPassword" IS NOT NULL AND l."stage" = 'LEAD'
      AND (a."industryId" IS NULL OR c."industryId" = a."industryId")
      AND LENGTH(TRIM(l."email")) <= 254 AND TRIM(l."email") ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
    ON CONFLICT ("organizationId", "email") DO UPDATE SET "campaignId" = EXCLUDED."campaignId", "status" = 'QUEUED', "lastError" = NULL, "updatedAt" = NOW()
    WHERE "EmailSyncJob"."status" = 'CANCELLED' AND "EmailSyncJob"."attempts" = 0`, [organizationId || null])
  // Never automatically resend an interrupted SMTP delivery: acceptance may already have occurred.
  await pool.query(`UPDATE "EmailSyncJob" SET "status" = 'UNKNOWN', "lastError" = 'Sending was interrupted; check the mailbox before sending again.'
    WHERE "status" = 'SENDING' AND "lockedUntil" < NOW() AND ($1::text IS NULL OR "organizationId" = $1)`, [organizationId || null])
  const organizations = (await pool.query(`SELECT a."organizationId" FROM "EmailAutomation" a
    JOIN "EmailSyncJob" j ON j."organizationId" = a."organizationId" AND j."campaignId" = a."campaignId"
    WHERE a."enabled" = TRUE AND a."campaignId" LIKE 'smtp:%' AND j."status" = 'QUEUED' AND j."availableAt" <= NOW()
    AND ($1::text IS NULL OR a."organizationId" = $1)
    AND NOT EXISTS (SELECT 1 FROM "EmailSyncJob" r WHERE r."organizationId" = a."organizationId" AND r."attempts" > 0 AND r."updatedAt" > NOW() - INTERVAL '1 minute')
    AND (SELECT COUNT(*) FROM "EmailSyncJob" d WHERE d."organizationId" = a."organizationId" AND d."sentAt" > NOW() - INTERVAL '24 hours') < 30
    GROUP BY a."organizationId" ORDER BY MIN(j."createdAt") LIMIT 1`, [organizationId || null])).rows
  let processed = 0
  for (const organization of organizations) {
    const client = await pool.connect()
    const lockName = `smtp-send:${organization.organizationId}`
    let locked = false
    try {
      locked = (await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [lockName])).rows[0].locked
      if (!locked) continue
      const config = await getEmailServerConfig(organization.organizationId)
      if (!config?.enabled) continue
      const recent = (await client.query(`SELECT COUNT(*) FILTER (WHERE "sentAt" > NOW() - INTERVAL '24 hours')::int AS total,
        COUNT(*) FILTER (WHERE "updatedAt" > NOW() - INTERVAL '1 minute' AND "attempts" > 0)::int AS recent
        FROM "EmailSyncJob" WHERE "organizationId" = $1`, [organization.organizationId])).rows[0]
      if (recent.total >= 30 || recent.recent > 0) continue
      const job = (await client.query(`UPDATE "EmailSyncJob" SET "status" = 'SENDING', "attempts" = "attempts" + 1,
        "lockedUntil" = NOW() + INTERVAL '2 minutes', "updatedAt" = NOW()
        WHERE "id" = (SELECT "id" FROM "EmailSyncJob" WHERE "organizationId" = $1 AND "campaignId" = $2
        AND "status" = 'QUEUED' AND "availableAt" <= NOW() ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`, [organization.organizationId, config.campaignId])).rows[0]
      if (!job) continue
      let sending = false
      try {
        const lead = (await client.query(`SELECT l.*, c."industryId" AS "leadIndustryId" FROM "SalesLead" l
          LEFT JOIN "IndustryCategory" c ON c."id" = l."industryCategoryId" WHERE l."id" = $1 AND l."organizationId" = $2`, [job.leadId, job.organizationId])).rows[0]
        const suppressed = (await client.query('SELECT 1 FROM "EmailSuppression" WHERE "organizationId" = $1 AND "email" = $2', [job.organizationId, job.email])).rows.length
        if (suppressed || !lead || lead.stage !== 'LEAD' || lead.email?.trim().toLowerCase() !== job.email || config.industryId && config.industryId !== lead.leadIndustryId) {
          await client.query(`UPDATE "EmailSyncJob" SET "status" = 'SKIPPED', "lockedUntil" = NULL, "updatedAt" = NOW() WHERE "id" = $1`, [job.id]); continue
        }
        const transport = await smtpTransport(config)
        const unsubscribe = new URL('/email/unsubscribe', process.env.NEXT_PUBLIC_APP_URL!)
        unsubscribe.searchParams.set('token', job.unsubscribeToken)
        const text = config.message.replaceAll('{{company_name}}', lead.businessName) + `\n\n${config.organizationName}\n${config.companyAddress}\n\nUnsubscribe: ${unsubscribe}`
        // Pause/suppression changes made while resolving SMTP take effect before dispatch.
        const current = await getEmailServerConfig(job.organizationId)
        const optedOut = (await client.query('SELECT 1 FROM "EmailSuppression" WHERE "organizationId" = $1 AND "email" = $2', [job.organizationId, job.email])).rows.length
        if (!current?.enabled || current.campaignId !== job.campaignId || optedOut) {
          await client.query(`UPDATE "EmailSyncJob" SET "status" = 'SKIPPED', "lockedUntil" = NULL WHERE "id" = $1`, [job.id]); continue
        }
        sending = true
        const result = await transport.sendMail({ from: { name: config.senderName || config.organizationName, address: config.email },
          to: job.email, subject: config.subject, text, messageId: `<${job.id}@${config.email.split('@')[1]}>`,
          headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
        if (!result.accepted?.length) throw new Error('Not accepted')
        await client.query(`UPDATE "EmailSyncJob" SET "status" = 'SENT', "sentAt" = NOW(), "messageId" = $2,
          "lastError" = NULL, "lockedUntil" = NULL, "updatedAt" = NOW() WHERE "id" = $1`, [job.id, result.messageId])
        processed++
      } catch {
        await client.query(`UPDATE "EmailSyncJob" SET "status" = $2, "lastError" = $3, "lockedUntil" = NULL, "updatedAt" = NOW() WHERE "id" = $1`,
          [job.id, sending ? 'UNKNOWN' : 'FAILED', sending ? 'Delivery could not be confirmed. Check your mailbox before sending again.' : 'Could not connect to the mailbox. Check its SMTP settings.'])
      }
    } finally {
      if (locked) await client.query('SELECT pg_advisory_unlock(hashtext($1))', [lockName])
      client.release()
    }
  }
  return processed
}
