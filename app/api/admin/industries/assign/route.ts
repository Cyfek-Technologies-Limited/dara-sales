import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Sign in as an organization admin.' }, { status: 401 })

  const organization = (await pool.query(
    `SELECT o."id" FROM "Organization" o
     JOIN "OrganizationMember" m ON m."organizationId" = o."id"
     WHERE m."authUserId" = $1 AND m."role" = 'ADMIN'
     ORDER BY o."createdAt" DESC LIMIT 1`,
    [session.user.id],
  )).rows[0]
  if (!organization) return NextResponse.json({ error: 'Admin workspace not found.' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const userId = typeof body.userId === 'string' ? body.userId : ''
  const industryId = body.industryId === null ? null : typeof body.industryId === 'string' ? body.industryId : undefined
  if (!userId || industryId === undefined) {
    return NextResponse.json({ error: 'Choose a teammate and a valid industry.' }, { status: 400 })
  }

  if (industryId) {
    const industry = await pool.query(
      `SELECT 1 FROM "Industry" WHERE "id" = $1 AND "organizationId" = $2`,
      [industryId, organization.id],
    )
    if (!industry.rowCount) return NextResponse.json({ error: 'Choose an industry in this workspace.' }, { status: 400 })
  }

  const result = await pool.query(
    `UPDATE "OrganizationMember" SET "industryId" = $1
     WHERE "organizationId" = $2 AND "authUserId" = $3 AND "role" = 'STAFF' AND "status" = 'ACTIVE'
     RETURNING "authUserId"`,
    [industryId, organization.id, userId],
  )
  if (!result.rowCount) return NextResponse.json({ error: 'Active teammate not found.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
