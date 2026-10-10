import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const { token } = await request.json()
  const invite = (await pool.query(`SELECT * FROM "OrganizationInvite" WHERE "tokenHash" = $1 AND "acceptedAt" IS NULL AND "expiresAt" > NOW() LIMIT 1`, [createHash('sha256').update(String(token)).digest('hex')])).rows[0]
  if (!invite) return NextResponse.json({ error: 'This invite has expired or already been used.' }, { status: 410 })
  await pool.query('BEGIN')
  try {
    await pool.query(`INSERT INTO "OrganizationMember" ("id", "organizationId", "authUserId", "role") VALUES ($1,$2,$3,'STAFF') ON CONFLICT ("organizationId", "authUserId") DO NOTHING`, [crypto.randomUUID(), invite.organizationId, session.user.id])
    await pool.query(`UPDATE "OrganizationInvite" SET "acceptedAt" = NOW() WHERE "id" = $1 AND "acceptedAt" IS NULL`, [invite.id])
    await pool.query('COMMIT')
    return NextResponse.json({ ok: true })
  } catch (error) { await pool.query('ROLLBACK'); console.error('[v0] Invite acceptance failed:', error); return NextResponse.json({ error: 'Could not activate this invite.' }, { status: 500 }) }
}
