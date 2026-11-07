import { pool } from '@/lib/db'

// The platform key is private. Each organization owns its campaign and sender.
export async function getEmailServerConfig(organizationId: string) {
  const apiKey = process.env.SMARTLEAD_API_KEY?.trim()
  if (!apiKey) return null
  const row = (await pool.query(`SELECT a."campaignId", a."enabled", a."industryId", a."status"
    FROM "EmailAutomation" a JOIN "OrganizationEmailSender" s ON s."id" = a."senderId" AND s."organizationId" = a."organizationId"
    WHERE a."organizationId" = $1 AND a."campaignId" <> '' AND a."status" = 'READY'`, [organizationId])).rows[0]
  return row ? { apiKey, campaignId: row.campaignId as string, organizationId, industryId: row.industryId as string | null,
    enabled: Boolean(row.enabled) && process.env.SMARTLEAD_AUTOMATION_ENABLED !== 'false' } : null
}

export async function prepareEmailAutomation(organizationId: string) {
  return getEmailServerConfig(organizationId)
}

async function queueSavedLeads(organizationId?: string) {
  await pool.query(`INSERT INTO "EmailSyncJob" ("id", "organizationId", "leadId", "email", "campaignId")
    SELECT gen_random_uuid()::text, l."organizationId", l."id", LOWER(TRIM(l."email")), a."campaignId"
    FROM "SalesLead" l JOIN "EmailAutomation" a ON a."organizationId" = l."organizationId"
    JOIN "OrganizationEmailSender" s ON s."id" = a."senderId" AND s."organizationId" = a."organizationId"
    LEFT JOIN "IndustryCategory" c ON c."id" = l."industryCategoryId"
    WHERE ($1::text IS NULL OR l."organizationId" = $1) AND a."enabled" = TRUE AND a."status" = 'READY'
      AND a."campaignId" <> '' AND l."stage" = 'LEAD' AND (a."industryId" IS NULL OR c."industryId" = a."industryId")
      AND LENGTH(TRIM(l."email")) <= 254 AND TRIM(l."email") ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
    ON CONFLICT ("organizationId", "email") DO UPDATE SET "campaignId" = EXCLUDED."campaignId", "status" = 'QUEUED',
      "lastError" = NULL, "availableAt" = NOW(), "updatedAt" = NOW()
    WHERE "EmailSyncJob"."status" = 'CANCELLED' AND "EmailSyncJob"."attempts" = 0`, [organizationId || null])
}

export class SmartleadError extends Error {
  constructor(message: string, public retryable = false, public retryAfter = 0) { super(message) }
}

export async function smartleadRequest(apiKey: string, path: string, body?: unknown, method?: 'POST' | 'PATCH') {
  // Never log this URL: Smartlead authenticates through a query parameter.
  const url = new URL(`https://server.smartlead.ai/api/v1/${path}`)
  url.searchParams.set('api_key', apiKey)
  let response: Response
  try {
    response = await fetch(url, {
      method: method || (body ? 'POST' : 'GET'), cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000),
    })
  } catch { throw new SmartleadError('Smartlead could not be reached. The queue will retry.', true) }
  if (!response.ok) {
    const retryHeader = response.headers.get('retry-after') || ''
    const retryAfter = /^\d+$/.test(retryHeader) ? Number(retryHeader) : Math.max(0, (Date.parse(retryHeader) - Date.now()) / 1000) || 0
    throw new SmartleadError(
      response.status === 401 || response.status === 403 ? 'Smartlead rejected the API key or campaign access.' : `Smartlead returned HTTP ${response.status}. Check the campaign and account settings.`,
      response.status === 429 || response.status >= 500, retryAfter,
    )
  }
  const result = await response.json().catch(() => null)
  if (!result || result.error || result.status === false || result.ok === false) throw new SmartleadError('Smartlead did not confirm this request. Check your campaign settings.')
  return result
}

export async function processEmailQueue(organizationId?: string) {
  if (!process.env.SMARTLEAD_API_KEY || process.env.SMARTLEAD_AUTOMATION_ENABLED === 'false') return 0
  await queueSavedLeads(organizationId)
  // Short, leased jobs allow cron and on-save processing to run concurrently.
  await pool.query(`UPDATE "EmailSyncJob" SET "status" = 'FAILED', "lockedUntil" = NULL,
    "lastError" = 'Sync was interrupted repeatedly. Check the campaign before retrying.', "updatedAt" = NOW()
    WHERE "status" = 'SYNCING' AND "lockedUntil" < NOW() AND "attempts" >= 5
      AND ($1::text IS NULL OR "organizationId" = $1)`, [organizationId || null])
  let processed = 0
  for (let i = 0; i < 3; i++) {
    const token = new Date(Date.now() + 120000)
    const job = (await pool.query(`
      UPDATE "EmailSyncJob" j SET "status" = 'SYNCING', "attempts" = j."attempts" + 1,
        "lockedUntil" = $2, "updatedAt" = NOW()
      WHERE j."id" = (
        SELECT q."id" FROM "EmailSyncJob" q JOIN "EmailAutomation" a ON a."organizationId" = q."organizationId"
        WHERE a."enabled" = TRUE AND a."status" = 'READY' AND a."campaignId" = q."campaignId"
          AND ($1::text IS NULL OR q."organizationId" = $1)
          AND (q."status" = 'QUEUED' AND q."availableAt" <= NOW()
            OR q."status" = 'SYNCING' AND q."lockedUntil" < NOW())
        ORDER BY q."createdAt" LIMIT 1 FOR UPDATE OF q SKIP LOCKED
      ) RETURNING j.*`, [organizationId || null, token])).rows[0]
    if (!job) break
    try {
      const config = await getEmailServerConfig(job.organizationId)
      const lead = (await pool.query(`SELECT l.*, c."industryId" AS "leadIndustryId", a."enabled", a."campaignId" AS "currentCampaign"
        FROM "SalesLead" l JOIN "EmailAutomation" a ON a."organizationId" = l."organizationId"
        LEFT JOIN "IndustryCategory" c ON c."id" = l."industryCategoryId"
        WHERE l."id" = $1 AND l."organizationId" = $2`, [job.leadId, job.organizationId])).rows[0]
      if (!config?.enabled || config.campaignId !== job.campaignId || config.industryId && config.industryId !== lead?.leadIndustryId || !lead?.enabled || lead.currentCampaign !== job.campaignId || lead.stage !== 'LEAD' || lead.email?.trim().toLowerCase() !== job.email) {
        await finishJob(job.id, token, 'SKIPPED', 'Lead or automation settings changed.')
        continue
      }
      const names = (lead.contactName || '').trim().split(/\s+/)
      const result = await smartleadRequest(config.apiKey, `campaigns/${job.campaignId}/leads`, {
        lead_list: [{ email: job.email, first_name: names[0] || '', last_name: names.slice(1).join(' '), company_name: lead.businessName,
          custom_fields: { industry: lead.industry || '', website: lead.website || '', dara_lead_id: lead.id } }],
        settings: { ignore_global_block_list: false, ignore_unsubscribe_list: false, ignore_duplicate_leads_in_other_campaign: false },
      })
      // An accepted import does not mean an email has been delivered.
      const added = Number(result.added_count ?? result.upload_count ?? result.total_added)
      const skipped = Number(result.skipped_count ?? result.total_skipped ?? 0)
      if (!Number.isFinite(added) && !Number.isFinite(Number(result.already_added_to_campaign))) {
        throw new SmartleadError('Smartlead returned an unrecognized import response. Check the campaign before retrying.')
      }
      await finishJob(job.id, token, added > 0 ? 'SYNCED' : 'SKIPPED', added > 0 ? null : `Smartlead did not add this address (${skipped || 'duplicate, blocked, unsubscribed, or invalid'}).`)
      processed++
    } catch (error) {
      const retry = error instanceof SmartleadError && error.retryable && job.attempts < 5
      const delay = Math.max(60 * 2 ** job.attempts + Math.floor(Math.random() * 30), error instanceof SmartleadError ? error.retryAfter : 0)
      await pool.query(`UPDATE "EmailSyncJob" SET "status" = $3, "lastError" = $4, "availableAt" = NOW() + $5 * INTERVAL '1 second',
        "lockedUntil" = NULL, "updatedAt" = NOW() WHERE "id" = $1 AND "lockedUntil" = $2`,
        [job.id, token, retry ? 'QUEUED' : 'FAILED', error instanceof SmartleadError ? error.message : 'Could not sync this contact. The support team should check the outreach service.', delay])
    }
  }
  return processed
}

async function finishJob(id: string, token: Date, status: string, error: string | null) {
  await pool.query(`UPDATE "EmailSyncJob" SET "status" = $3, "lastError" = $4, "lockedUntil" = NULL, "updatedAt" = NOW()
    WHERE "id" = $1 AND "lockedUntil" = $2`, [id, token, status, error])
}
