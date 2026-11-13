import { NextResponse } from 'next/server'
import { getWorkspaceSession } from '@/lib/admin-session'
import { pool } from '@/lib/db'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getWorkspaceSession()
  if (!member) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  const { id } = await params
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const prospect = await client.query(`SELECT "id" FROM "SalesLead" WHERE "id" = $1 AND "organizationId" = $2
      AND ($3::text IS NULL OR "ownerId" = $3) FOR UPDATE`,
      [id, member.organization.id, member.organization.role === 'STAFF' ? member.user.id : null])
    if (!prospect.rows.length) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 })
    }
    const sending = await client.query(`SELECT 1 FROM "EmailSyncJob" WHERE "leadId" = $1 AND "organizationId" = $2 AND "status" = 'SENDING' LIMIT 1`, [id, member.organization.id])
    if (sending.rows.length) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'An email is currently being sent to this prospect. Wait for it to finish, then try removing them again.' }, { status: 409 })
    }
    // Foreign keys remove this prospect's outreach records and queued email jobs.
    await client.query('DELETE FROM "SalesLead" WHERE "id" = $1 AND "organizationId" = $2', [id, member.organization.id])
    await client.query('COMMIT')
    return NextResponse.json({ ok: true })
  } catch {
    await client.query('ROLLBACK')
    return NextResponse.json({ error: 'Could not remove this prospect. Please try again.' }, { status: 500 })
  } finally { client.release() }
}
