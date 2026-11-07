import { pool } from '@/lib/db'
import { smartleadRequest, SmartleadError } from '@/lib/smartlead'

function html(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>')
}

export async function activateOrganizationCampaign(organizationId: string) {
  const apiKey = process.env.SMARTLEAD_API_KEY?.trim()
  if (!apiKey) throw new SmartleadError('Email sending is not available yet. Your platform administrator needs to finish the provider connection.')
  if (process.env.SMARTLEAD_AUTOMATION_ENABLED === 'false') throw new SmartleadError('Email automation is temporarily paused by the platform administrator.')
  const client = await pool.connect()
  let locked = false
  try {
    // A dedicated session lock prevents two requests provisioning the same workspace.
    locked = (await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [`outreach:${organizationId}`])).rows[0].locked
    if (!locked) throw new SmartleadError('This workspace is already updating its outreach. Try again shortly.')
    const row = (await client.query(`SELECT a.*, o."name" AS "organizationName", s."providerAccountId"
      FROM "EmailAutomation" a JOIN "Organization" o ON o."id" = a."organizationId"
      JOIN "OrganizationEmailSender" s ON s."id" = a."senderId" AND s."organizationId" = a."organizationId"
      WHERE a."organizationId" = $1`, [organizationId])).rows[0]
    if (!row?.subject || !row.message || !row.companyAddress) throw new SmartleadError('Save your message and select a connected business email before starting outreach.')
    await client.query('UPDATE "EmailAutomation" SET "enabled" = FALSE, "status" = \'CONFIGURING\' WHERE "organizationId" = $1', [organizationId])
    let campaignId = row.campaignId
    if (!campaignId) {
      const created = await smartleadRequest(apiKey, 'campaigns/create', { name: `Dara / ${row.organizationName} / ${organizationId}` })
      campaignId = String(created.campaign?.id ?? created.id ?? '')
      if (!/^[1-9]\d*$/.test(campaignId)) throw new SmartleadError('The email service did not confirm campaign creation.')
      // Persist immediately; subsequent retries reuse this organization's draft.
      await client.query('UPDATE "EmailAutomation" SET "campaignId" = $2, "campaignName" = $3 WHERE "organizationId" = $1', [organizationId, campaignId, `${row.organizationName} outreach`])
    } else {
      await smartleadRequest(apiKey, `campaigns/${campaignId}/status`, { status: 'PAUSED' })
    }
    await smartleadRequest(apiKey, `campaigns/${campaignId}/sequences`, {
      sequences: [{ seq_number: 1, subject: row.subject,
        email_body: `${html(row.message)}<br><br>${html(row.organizationName)}<br>${html(row.companyAddress)}<br><br>%unsubscribe-text%`,
        seq_delay_details: { delay_in_days: 0 } }],
    })
    await smartleadRequest(apiKey, `campaigns/${campaignId}/email-accounts`, { email_account_ids: [Number(row.providerAccountId)] })
    await smartleadRequest(apiKey, `campaigns/${campaignId}/schedule`, {
      timezone: 'Africa/Lagos', days_of_the_week: [1, 2, 3, 4, 5], start_hour: '09:00', end_hour: '17:00',
      min_time_btw_emails: 8, max_new_leads_per_day: 30,
    })
    await smartleadRequest(apiKey, `campaigns/${campaignId}/status`, { status: 'ACTIVE' })
    await client.query(`UPDATE "EmailAutomation" SET "enabled" = TRUE, "status" = 'READY', "updatedAt" = NOW() WHERE "organizationId" = $1`, [organizationId])
    await client.query(`UPDATE "EmailSyncJob" SET "status" = 'CANCELLED', "updatedAt" = NOW(), "lastError" = 'Audience or message changed.'
      WHERE "organizationId" = $1 AND "campaignId" <> $2 AND "status" IN ('QUEUED','FAILED')`, [organizationId, campaignId])
  } catch (error) {
    if (locked) await client.query(`UPDATE "EmailAutomation" SET "enabled" = FALSE, "status" = 'DRAFT' WHERE "organizationId" = $1`, [organizationId])
    throw error
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock(hashtext($1))', [`outreach:${organizationId}`])
    client.release()
  }
}

export async function pauseOrganizationCampaign(organizationId: string) {
  const client = await pool.connect()
  let locked = false
  try {
    locked = (await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [`outreach:${organizationId}`])).rows[0].locked
    if (!locked) throw new SmartleadError('Outreach is being updated. Try again shortly.')
    const row = (await client.query('SELECT "campaignId" FROM "EmailAutomation" WHERE "organizationId" = $1', [organizationId])).rows[0]
    if (row?.campaignId) {
      const apiKey = process.env.SMARTLEAD_API_KEY
      if (!apiKey) throw new SmartleadError('The email service is unavailable; the campaign has not been paused.')
      await smartleadRequest(apiKey, `campaigns/${row.campaignId}/status`, { status: 'PAUSED' })
    }
    await client.query('UPDATE "EmailAutomation" SET "enabled" = FALSE, "updatedAt" = NOW() WHERE "organizationId" = $1', [organizationId])
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock(hashtext($1))', [`outreach:${organizationId}`])
    client.release()
  }
}
