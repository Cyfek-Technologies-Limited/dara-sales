import { NextResponse } from 'next/server'
import { getWorkspaceSession } from '@/lib/admin-session'
import { pool } from '@/lib/db'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getWorkspaceSession()
  if (!member) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || !['PROSPECT','CONTACTED','ACCEPTED','REJECTED','RESPONSE'].includes(body.status)
    || (body.responseText != null && typeof body.responseText !== 'string')) return NextResponse.json({ error: 'Choose a valid status.' }, { status: 400 })
  const responseText = (body.responseText || '').trim()
  if (responseText.length > 2000 || (body.status === 'RESPONSE' && !responseText)) return NextResponse.json({ error: 'Enter the response (up to 2,000 characters).' }, { status: 400 })
  const { id } = await params
  const result = await pool.query(`UPDATE "SalesLead" SET "contactStatus" = $1,
    "responseText" = CASE WHEN $1 = 'RESPONSE' THEN $2 ELSE "responseText" END,
    "updatedAt" = NOW() WHERE "id" = $3 AND "organizationId" = $4
    AND ($5::text IS NULL OR "ownerId" = $5) RETURNING "id"`,
    [body.status, responseText, id, member.organization.id, member.organization.role === 'STAFF' ? member.user.id : null])
  if (!result.rows.length) return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
