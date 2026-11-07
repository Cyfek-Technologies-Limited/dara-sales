import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function getAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const organization = (await pool.query(`SELECT o."id", o."name" FROM "Organization" o
    JOIN "OrganizationMember" m ON m."organizationId" = o."id"
    WHERE m."authUserId" = $1 AND m."role" = 'ADMIN' AND m."status" = 'ACTIVE'
    ORDER BY o."createdAt" DESC LIMIT 1`, [session.user.id])).rows[0]
  return organization ? { organization, user: session.user } : null
}
