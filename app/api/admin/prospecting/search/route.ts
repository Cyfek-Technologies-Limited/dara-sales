import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { researchProspects } from '@/lib/prospect-research'

export const runtime = 'nodejs'
export const maxDuration = 120

async function getAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const organization = (await pool.query(
    `SELECT m."role", m."industryId", m."industryIds", o."id" FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId" = o."id"
     WHERE m."authUserId" = $1 AND m."role" IN ('ADMIN','STAFF') AND m."status" = 'ACTIVE' ORDER BY o."createdAt" DESC LIMIT 1`, [session.user.id],
  )).rows[0]
  return organization ? { organizationId: organization.id, role: organization.role, industryIds: organization.industryIds?.length ? organization.industryIds : organization.industryId ? [organization.industryId] : [] } : null
}

export async function POST(request: Request) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Sign in as an active workspace member.' }, { status: 401 })
  return researchProspects(await request.json().catch(() => ({})), admin)
}
