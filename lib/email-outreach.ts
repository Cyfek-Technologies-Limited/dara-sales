import { optionalSendingAttachments } from '@/lib/email-attachments'
import { pool } from '@/lib/db'
import { smtpReady, smtpTransport } from '@/lib/smtp-mailbox'

export class SmtpError extends Error {}
export async function getEmailServerConfig(organizationId: string, database: Pick<typeof pool, 'query'> = pool) {
  const row = (await database.query(`SELECT a.*, s."email", s."senderName", s."smtpHost", s."smtpPort", s."smtpUsername", s."smtpPassword", o."name" AS "organizationName"
    FROM "EmailAutomation" a JOIN "OrganizationEmailSender" s ON s."id" = a."senderId" AND s."organizationId" = a."organizationId"
    JOIN "Organization" o ON o."id" = a."organizationId"
    WHERE a."organizationId" = $1 AND a."campaignId" LIKE 'smtp:%' AND a."status" = 'READY' AND s."smtpPassword" IS NOT NULL`, [organizationId])).rows[0]
  return row ? { ...row, enabled: Boolean(row.enabled) && smtpReady() && process.env.EMAIL_AUTOMATION_ENABLED !== 'false' } : null
}
export const prepareEmailAutomation = getEmailServerConfig

export async function queueSavedLeads(organizationId?: string, ownerId?: string) {
  await pool.query(`INSERT INTO "EmailSyncJob" ("id", "organizationId", "leadId", "email", "campaignId")
    SELECT gen_random_uuid()::text, candidate."organizationId", candidate."leadId", candidate."email", candidate."campaignId"
    FROM (
      -- Deduplicate before generating IDs: the conflict key is organization/email,
      -- while different lead records can share the same normalized inbox.
      SELECT DISTINCT ON (l."organizationId", LOWER(TRIM(l."email")))
        l."organizationId", l."id" AS "leadId", LOWER(TRIM(l."email")) AS "email", a."campaignId"
      FROM "SalesLead" l JOIN "EmailAutomation" a ON a."organizationId" = l."organizationId"
      JOIN "OrganizationEmailSender" s ON s."id" = a."senderId" AND s."organizationId" = a."organizationId"
      LEFT JOIN "IndustryCategory" c ON c."id" = l."industryCategoryId"
      WHERE ($1::text IS NULL OR l."organizationId" = $1) AND a."enabled" AND a."status" = 'READY'
        AND ($2::text IS NULL OR l."ownerId" = $2)
        AND a."campaignId" LIKE 'smtp:%' AND s."smtpPassword" IS NOT NULL AND l."stage" = 'LEAD'
        AND l."contactStatus" IN ('PROSPECT','CONTACTED')
        AND (a."industryId" IS NULL OR c."industryId" = a."industryId")
        AND LENGTH(TRIM(l."email")) <= 254 AND TRIM(l."email") ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
      ORDER BY l."organizationId", LOWER(TRIM(l."email")), l."createdAt", l."id"
    ) candidate WHERE TRUE
    ON CONFLICT ("organizationId", "email") DO UPDATE SET "campaignId" = EXCLUDED."campaignId", "leadId" = EXCLUDED."leadId",
      "status" = 'QUEUED', "lastError" = NULL, "availableAt" = NOW(), "lockedUntil" = NULL, "updatedAt" = NOW()
    WHERE "EmailSyncJob"."status" = 'CANCELLED' AND "EmailSyncJob"."attempts" = 0`, [organizationId || null, ownerId || null])
}

export async function processEmailQueue(organizationId?: string, ownerId?: string) {
  if (!smtpReady() || process.env.EMAIL_AUTOMATION_ENABLED === 'false') return 0
  await queueSavedLeads(organizationId, ownerId)
  // Never automatically resend an interrupted SMTP delivery: acceptance may already have occurred.
  await pool.query(`UPDATE "EmailSyncJob" SET "status" = 'UNKNOWN', "lastError" = 'Sending was interrupted; check the mailbox before sending again.'
    WHERE "status" = 'SENDING' AND "lockedUntil" < NOW() AND ($1::text IS NULL OR "organizationId" = $1)
    AND ($2::text IS NULL OR EXISTS (SELECT 1 FROM "SalesLead" l WHERE l."id" = "EmailSyncJob"."leadId" AND l."organizationId" = "EmailSyncJob"."organizationId" AND l."ownerId" = $2))`, [organizationId || null, ownerId || null])
  const organizations = (await pool.query(`SELECT a."organizationId" FROM "EmailAutomation" a
    JOIN "EmailSyncJob" j ON j."organizationId" = a."organizationId" AND j."campaignId" = a."campaignId"
    WHERE a."enabled" = TRUE AND a."campaignId" LIKE 'smtp:%' AND j."status" = 'QUEUED' AND j."availableAt" <= NOW()
    AND ($1::text IS NULL OR a."organizationId" = $1)
    AND ($2::text IS NULL OR EXISTS (SELECT 1 FROM "SalesLead" l WHERE l."id" = j."leadId" AND l."organizationId" = j."organizationId" AND l."ownerId" = $2))
    AND NOT EXISTS (SELECT 1 FROM "EmailSyncJob" r WHERE r."organizationId" = a."organizationId" AND r."attempts" > 0 AND r."updatedAt" > NOW() - INTERVAL '1 minute')
    AND (SELECT COUNT(*) FROM "EmailSyncJob" d WHERE d."organizationId" = a."organizationId" AND d."sentAt" > NOW() - INTERVAL '24 hours') < 30
    GROUP BY a."organizationId" ORDER BY MIN(j."createdAt") LIMIT 1`, [organizationId || null, ownerId || null])).rows
  let processed = 0
  for (const organization of organizations) {
    const client = await pool.connect()
    let transactionOpen = false
    try {
      await client.query('BEGIN'); transactionOpen = true
      // Claim under a short row transaction, not a session advisory lock that
      // can survive a terminated serverless invocation on a pooled connection.
      const locked = (await client.query('SELECT "organizationId" FROM "EmailAutomation" WHERE "organizationId" = $1 FOR UPDATE SKIP LOCKED', [organization.organizationId])).rows.length > 0
      if (!locked) continue
      const config = await getEmailServerConfig(organization.organizationId, client)
      if (!config?.enabled) continue
      const recent = (await client.query(`SELECT COUNT(*) FILTER (WHERE "sentAt" > NOW() - INTERVAL '24 hours')::int AS total,
        COUNT(*) FILTER (WHERE "updatedAt" > NOW() - INTERVAL '1 minute' AND "attempts" > 0)::int AS recent
        FROM "EmailSyncJob" WHERE "organizationId" = $1`, [organization.organizationId])).rows[0]
      const inFlight = (await client.query(`SELECT 1 FROM "EmailSyncJob" WHERE "organizationId" = $1 AND "status" = 'SENDING' AND "lockedUntil" > NOW() LIMIT 1`, [organization.organizationId])).rows.length
      if (recent.total >= 30 || recent.recent > 0 || inFlight) continue
      const job = (await client.query(`UPDATE "EmailSyncJob" SET "status" = 'SENDING', "attempts" = "attempts" + 1, "lastError" = NULL,
        "lockedUntil" = NOW() + INTERVAL '2 minutes', "updatedAt" = NOW()
        WHERE "id" = (SELECT "id" FROM "EmailSyncJob" WHERE "organizationId" = $1 AND "campaignId" = $2
        AND "status" = 'QUEUED' AND "availableAt" <= NOW()
        AND ($3::text IS NULL OR EXISTS (SELECT 1 FROM "SalesLead" l WHERE l."id" = "EmailSyncJob"."leadId" AND l."organizationId" = $1 AND l."ownerId" = $3))
        ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`, [organization.organizationId, config.campaignId, ownerId || null])).rows[0]
      if (!job) continue
      await client.query('COMMIT'); transactionOpen = false
      let sending = false
      try {
        const lead = (await client.query(`SELECT l.*, c."industryId" AS "leadIndustryId" FROM "SalesLead" l
          LEFT JOIN "IndustryCategory" c ON c."id" = l."industryCategoryId" WHERE l."id" = $1 AND l."organizationId" = $2`, [job.leadId, job.organizationId])).rows[0]
        const suppressed = (await client.query('SELECT 1 FROM "EmailSuppression" WHERE "organizationId" = $1 AND "email" = $2', [job.organizationId, job.email])).rows.length
        if (suppressed || !lead || lead.stage !== 'LEAD' || !['PROSPECT','CONTACTED'].includes(lead.contactStatus) || lead.email?.trim().toLowerCase() !== job.email || config.industryId && config.industryId !== lead.leadIndustryId) {
          await client.query(`UPDATE "EmailSyncJob" SET "status" = 'SKIPPED', "lockedUntil" = NULL, "updatedAt" = NOW() WHERE "id" = $1`, [job.id]); continue
        }
        const transport = await smtpTransport(config)
        const unsubscribe = new URL('/email/unsubscribe', process.env.NEXT_PUBLIC_APP_URL!)
        unsubscribe.searchParams.set('token', job.unsubscribeToken)
        const text = config.message.replaceAll('{{company_name}}', lead.businessName) + `\n\n${config.organizationName}\n${config.companyAddress}\n\nUnsubscribe: ${unsubscribe}`
        // Pause/suppression changes made while resolving SMTP take effect before dispatch.
        const current = await getEmailServerConfig(job.organizationId, client)
        const optedOut = (await client.query('SELECT 1 FROM "EmailSuppression" WHERE "organizationId" = $1 AND "email" = $2', [job.organizationId, job.email])).rows.length
        if (!current?.enabled || current.campaignId !== job.campaignId || JSON.stringify(current.attachments || []) !== JSON.stringify(config.attachments || []) || optedOut) {
          await client.query(`UPDATE "EmailSyncJob" SET "status" = 'SKIPPED', "lockedUntil" = NULL WHERE "id" = $1`, [job.id]); continue
        }
        const optionalAttachments = optionalSendingAttachments(config.attachments)
        const attachments = optionalAttachments.files.map(file => ({ filename: file.name, content: Buffer.from(file.content, 'base64'), contentType: file.type }))
        sending = true
        const result = await transport.sendMail({ from: { name: config.senderName || config.organizationName, address: config.email },
          to: job.email, subject: config.subject, text, attachments, disableFileAccess: true, disableUrlAccess: true, messageId: `<${job.id}@${config.email.split('@')[1]}>`,
          headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
        if (!result.accepted?.length) throw new Error('Not accepted')
        await client.query(`UPDATE "EmailSyncJob" SET "status" = 'SENT', "sentAt" = NOW(), "messageId" = $2,
          "lastError" = $3, "lockedUntil" = NULL, "updatedAt" = NOW() WHERE "id" = $1`, [job.id, result.messageId,
            optionalAttachments.skipped ? 'Accepted by SMTP server. An unavailable or invalid optional attachment was omitted; inbox delivery is not confirmed.' : null])
        processed++
        await client.query(`UPDATE "SalesLead" SET "contactStatus" = 'CONTACTED', "updatedAt" = NOW()
          WHERE "id" = $1 AND "organizationId" = $2 AND "contactStatus" = 'PROSPECT'`, [job.leadId, job.organizationId])
      } catch (error) {
        const smtpError = error as { responseCode?: number; command?: string; code?: string }
        const rejected = typeof smtpError.responseCode === 'number' && smtpError.responseCode >= 400
        const beforeData = ['CONN','EHLO','HELO','STARTTLS','AUTH','AUTH PLAIN','AUTH LOGIN','MAIL FROM','RCPT TO'].includes(smtpError.command || '') || smtpError.code === 'EAUTH'
        const uncertain = sending && !rejected && !beforeData
        const reason = smtpError.code === 'SMTP_CREDENTIALS_UNREADABLE' ? 'Saved mailbox credentials could not be decrypted. Pause outreach and reconnect the mailbox on this deployment.'
          : smtpError.code === 'EAUTH' ? 'Mailbox sign-in was rejected. Check the SMTP/app password and provider permissions.'
          : rejected ? `The mail server rejected this email (SMTP ${smtpError.responseCode}). Check your mailbox limits and recipient address.`
          : uncertain ? 'Delivery could not be confirmed. Check your mailbox before sending again.' : 'Could not connect to the mailbox. Check its SMTP settings.'
        await client.query(`UPDATE "EmailSyncJob" SET "status" = $2, "lastError" = $3, "lockedUntil" = NULL, "updatedAt" = NOW() WHERE "id" = $1`,
          [job.id, uncertain ? 'UNKNOWN' : 'FAILED', reason])
      }
    } finally {
      try { if (transactionOpen) await client.query('ROLLBACK') }
      finally { client.release() }
    }
  }
  return processed
}
