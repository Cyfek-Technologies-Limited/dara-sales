import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const { token } = await request.json().catch(() => ({}))
  if (typeof token !== 'string' || token.length < 20) {
    return NextResponse.json({ error: 'This invite link is invalid.' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const invite = (await client.query(
      `SELECT "id", "organizationId" FROM "OrganizationInvite" WHERE "tokenHash" = $1 AND "acceptedAt" IS NULL AND "expiresAt" > NOW() FOR UPDATE`,
      [createHash('sha256').update(token).digest('hex')],
    )).rows[0]
    if (!invite) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'This invite has expired or already been used.' }, { status: 410 })
    }

    await client.query(
      `INSERT INTO "OrganizationMember" ("id", "organizationId", "authUserId", "role") VALUES ($1,$2,$3,'STAFF') ON CONFLICT ("organizationId", "authUserId") DO NOTHING`,
      [crypto.randomUUID(), invite.organizationId, session.user.id],
    )
    await client.query(`UPDATE "OrganizationInvite" SET "acceptedAt" = NOW() WHERE "id" = $1`, [invite.id])
    await client.query('COMMIT')
    return NextResponse.json({ ok: true })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[invite] Acceptance failed:', error)
    return NextResponse.json({ error: 'Could not activate this invite.' }, { status: 500 })
  } finally {
    client.release()
  }
}
