import { createHash, randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { apiError, apiSuccess, internalApiError } from '@/lib/api-error'

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return apiError('AUTH_REQUIRED', 'Sign in as an organization admin to create staff invites.', 401)
  try {
  const organization = (await pool.query(`SELECT o.* FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId" = o."id" WHERE m."authUserId" = $1 AND m."role" = 'ADMIN' LIMIT 1`, [session.user.id])).rows[0]
  if (!organization) return apiError('ORGANIZATION_NOT_FOUND', 'Your admin account is not linked to an organization.', 404)
  const used = Number((await pool.query(`SELECT COUNT(*)::int AS count FROM "OrganizationMember" WHERE "organizationId" = $1 AND "role" = 'STAFF'`, [organization.id])).rows[0].count)
  const limit = Number(organization.staffCount || 0)
  if (used >= limit) return apiError('STAFF_LIMIT_REACHED', `Your plan allows ${limit} registered staff member${limit === 1 ? '' : 's'}. Upgrade to add more seats.`, 409, { limit, used, remaining: 0 })
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  await pool.query(`INSERT INTO "OrganizationInvite" ("id", "organizationId", "email", "role", "tokenHash", "expiresAt") VALUES ($1,$2,$3,'STAFF',$4,NOW() + INTERVAL '7 days')`, [crypto.randomUUID(), organization.id, session.user.email, tokenHash])
  return apiSuccess({ url: `${process.env.V0_RUNTIME_URL || ''}/staff/invite/${token}`, code: 'INVITE_CREATED', remaining: Math.max(limit - used, 0) })
  } catch (error) {
    return internalApiError(error)
  }
}
