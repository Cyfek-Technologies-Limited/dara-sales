import { randomUUID } from 'node:crypto'
import { after, NextResponse } from 'next/server'
import { getWorkspaceSession } from '@/lib/admin-session'
import { pool } from '@/lib/db'
import { processEmailQueue } from '@/lib/email-outreach'

export const maxDuration = 60

export async function POST(request: Request) {
  const admin = await getWorkspaceSession()
  if (!admin) return NextResponse.json({ error: 'Sign in as an active workspace member.' }, { status: 401 })
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Enter the prospect details.' }, { status: 400 })
  const limits: Record<string,number> = { businessName: 160, contactName: 160, email: 254, phone: 40, website: 600, source: 600, notes: 5000, industryId: 160, categoryId: 160, ownerId: 160 }
  const fields: Record<string,string> = {}
  for (const [name, limit] of Object.entries(limits)) {
    if (body[name] != null && (typeof body[name] !== 'string' || body[name].length > limit)) return NextResponse.json({ error: `Check the ${name} field and its length.` }, { status: 400 })
    fields[name] = (body[name] || '').trim()
  }
  if (admin.organization.role === 'STAFF') fields.ownerId = admin.user.id
  if (!fields.businessName) return NextResponse.json({ error: 'Enter a business name.' }, { status: 400 })
  if (fields.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(fields.email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  if (fields.phone && (!/^[+\d(][\d\s().+-]+$/.test(fields.phone) || fields.phone.replace(/\D/g, '').length < 7 || fields.phone.replace(/\D/g, '').length > 15)) return NextResponse.json({ error: 'Enter a valid phone number, including its area or country code.' }, { status: 400 })
  if (fields.website) {
    try {
      const url = new URL(/^https?:\/\//i.test(fields.website) ? fields.website : `https://${fields.website}`)
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) throw new Error()
      fields.website = url.toString()
    } catch { return NextResponse.json({ error: 'Enter a valid business website URL.' }, { status: 400 }) }
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`manual-prospect:${admin.organization.id}`])
    let industryName: string | null = null
    if (fields.industryId) {
      const industry = (await client.query('SELECT "name" FROM "Industry" WHERE "id" = $1 AND "organizationId" = $2', [fields.industryId, admin.organization.id])).rows[0]
      if (!industry) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Choose an industry in your workspace.' }, { status: 400 }) }
      industryName = industry.name
    }
    if (fields.categoryId) {
      const category = (await client.query(`SELECT c."id" FROM "IndustryCategory" c JOIN "Industry" i ON i."id" = c."industryId"
        WHERE c."id" = $1 AND c."industryId" = $2 AND i."organizationId" = $3`, [fields.categoryId, fields.industryId, admin.organization.id])).rows[0]
      if (!category) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Choose a category under the selected industry.' }, { status: 400 }) }
    }
    if (fields.ownerId && !(await client.query(`SELECT 1 FROM "OrganizationMember" WHERE "organizationId" = $1 AND "authUserId" = $2 AND "role" = 'STAFF' AND "status" = 'ACTIVE'`, [admin.organization.id, fields.ownerId])).rows.length) {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Choose an active teammate in your workspace, or leave the prospect unassigned.' }, { status: 400 })
    }
    const duplicate = (await client.query(`SELECT "id" FROM "SalesLead" WHERE "organizationId" = $1 AND
      (LOWER(TRIM("businessName")) = LOWER($2) OR ($3 <> '' AND LOWER(RTRIM(COALESCE("website", ''), '/')) = LOWER(RTRIM($3, '/')))) LIMIT 1`, [admin.organization.id, fields.businessName, fields.website])).rows[0]
    if (duplicate) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'This business is already in your prospects. Open its existing record to view the details.' }, { status: 409 }) }
    const id = randomUUID()
    await client.query(`INSERT INTO "SalesLead" ("id", "organizationId", "ownerId", "businessName", "contactName", "email", "phone", "industry", "industryCategoryId", "website", "source", "notes", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`, [id, admin.organization.id, fields.ownerId || null, fields.businessName,
      fields.contactName || null, fields.email.toLowerCase() || null, fields.phone || null, industryName, fields.categoryId || null,
      fields.website || null, fields.source || 'Added manually', fields.notes || null])
    await client.query('COMMIT')
    after(() => processEmailQueue(admin.organization.id).then(() => {}).catch(() => console.error('[email] Manual prospect queue processing failed')))
    return NextResponse.json({ ok: true, id }, { status: 201 })
  } catch {
    await client.query('ROLLBACK')
    return NextResponse.json({ error: 'Could not save this prospect. Please try again.' }, { status: 500 })
  } finally { client.release() }
}
