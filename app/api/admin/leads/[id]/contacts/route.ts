import { NextResponse } from 'next/server'
import { getWorkspaceSession } from '@/lib/admin-session'
import { pool } from '@/lib/db'
import { extractWebsiteContacts } from '@/lib/website-contacts'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getWorkspaceSession()
  if (!member) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  const { id } = await params
  const ownerId = member.organization.role === 'STAFF' ? member.user.id : null
  const prospect = (await pool.query(`SELECT "website", "source" FROM "SalesLead" WHERE "id" = $1 AND "organizationId" = $2
    AND ($3::text IS NULL OR "ownerId" = $3)`, [id, member.organization.id, ownerId])).rows[0]
  if (!prospect) return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 })
  if (!prospect.website) return NextResponse.json({ error: 'This prospect needs a business website before contacts can be checked.' }, { status: 400 })
  try {
    const contacts = await extractWebsiteContacts(prospect.website, prospect.source?.match(/https?:\/\/[^\s|]+/g) || [])
    const updated = await pool.query(`UPDATE "SalesLead" SET
      "source" = CONCAT_WS(' | ', NULLIF("source", ''),
        CASE WHEN NULLIF(TRIM("email"), '') IS NULL AND $4 <> '' THEN 'General company email source: ' || $6 ELSE NULL END,
        CASE WHEN NULLIF(TRIM("phone"), '') IS NULL AND $5 <> '' THEN 'General company phone source: ' || $7 ELSE NULL END),
      "email" = COALESCE(NULLIF(TRIM("email"), ''), NULLIF($4, '')),
      "phone" = COALESCE(NULLIF(TRIM("phone"), ''), NULLIF($5, '')),
      "updatedAt" = CASE WHEN (NULLIF(TRIM("email"), '') IS NULL AND $4 <> '') OR (NULLIF(TRIM("phone"), '') IS NULL AND $5 <> '') THEN NOW() ELSE "updatedAt" END
      WHERE "id" = $1 AND "organizationId" = $2 AND "website" = $8 AND ($3::text IS NULL OR "ownerId" = $3) RETURNING "id"`,
      [id, member.organization.id, ownerId, contacts.publicEmail, contacts.publicPhone, contacts.emailSourceUrl, contacts.phoneSourceUrl, prospect.website])
    if (!updated.rows.length) return NextResponse.json({ error: 'Prospect changed. Reload and try again.' }, { status: 409 })
    return NextResponse.json({ message: contacts.publicEmail || contacts.publicPhone
      ? 'Published company contacts found. Missing fields have been updated; these may be general company contacts rather than direct decision-maker details.'
      : contacts.contactLookupMessage }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'The website could not be checked right now. Try again shortly.' }, { status: 502 })
  }
}
