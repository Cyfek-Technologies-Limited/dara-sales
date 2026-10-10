import { createHash, randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const organization = (await pool.query(`SELECT o.* FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId" = o."id" WHERE m."authUserId" = $1 AND m."role" = 'ADMIN' LIMIT 1`, [session.user.id])).rows[0]
  if (!organization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  const used = Number((await pool.query(`SELECT COUNT(*)::int AS count FROM "OrganizationMember" WHERE "organizationId" = $1 AND "role" = 'STAFF'`, [organization.id])).rows[0].count)
  const pending = Number((await pool.query(`SELECT COUNT(*)::int AS count FROM "OrganizationInvite" WHERE "organizationId" = $1 AND "acceptedAt" IS NULL AND "expiresAt" > NOW()`, [organization.id])).rows[0].count)
  const limit = Number(organization.staffCount || 0)
  if (used + pending >= limit) return NextResponse.json({ error: `Your plan allows ${limit} staff invite${limit === 1 ? '' : 's'}. Upgrade to add more.` }, { status: 409 })
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  await pool.query(`INSERT INTO "OrganizationInvite" ("id", "organizationId", "email", "role", "tokenHash", "expiresAt") VALUES ($1,$2,$3,'STAFF',$4,NOW() + INTERVAL '7 days')`, [crypto.randomUUID(), organization.id, session.user.email, tokenHash])
  return NextResponse.json({ url: `${process.env.V0_RUNTIME_URL || ''}/staff/invite/${token}` })
}
