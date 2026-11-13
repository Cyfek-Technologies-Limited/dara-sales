import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function getWorkspaceSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const organization = (await pool.query(`SELECT m."role", m."industryId", m."industryIds", o."id", o."name" FROM "Organization" o
    JOIN "OrganizationMember" m ON m."organizationId" = o."id"
    WHERE m."authUserId" = $1 AND m."role" IN ('ADMIN','STAFF') AND m."status" = 'ACTIVE'
    ORDER BY o."createdAt" DESC LIMIT 1`, [session.user.id])).rows[0]
  return organization ? { organization, user: session.user } : null
}

export async function getAdminSession() {
  const workspace = await getWorkspaceSession()
  return workspace?.organization.role === 'ADMIN' ? workspace : null
}
