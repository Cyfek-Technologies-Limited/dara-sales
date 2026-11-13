import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Sign in as an active workspace member.' }, { status: 401 })

  const organization = (await pool.query(
    `SELECT o."id" FROM "Organization" o
     JOIN "OrganizationMember" m ON m."organizationId" = o."id"
     WHERE m."authUserId" = $1 AND m."role" = 'ADMIN' AND m."status" = 'ACTIVE'
     ORDER BY o."createdAt" DESC LIMIT 1`,
    [session.user.id],
  )).rows[0]
  if (!organization) return NextResponse.json({ error: 'Active workspace not found.' }, { status: 403 })

  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const userId = typeof body.userId === 'string' ? body.userId : ''
  const industryIds = body.industryIds
  if (!userId || !Array.isArray(industryIds) || industryIds.length > 100 || industryIds.some(id => typeof id !== 'string' || !id || id.length > 160) || new Set(industryIds).size !== industryIds.length) {
    return NextResponse.json({ error: 'Choose a teammate and valid industries.' }, { status: 400 })
  }
  const valid = await pool.query('SELECT "id" FROM "Industry" WHERE "organizationId" = $1 AND "id" = ANY($2::text[])', [organization.id, industryIds])
  if (valid.rows.length !== industryIds.length) return NextResponse.json({ error: 'Choose industries from this workspace.' }, { status: 400 })

  const result = await pool.query(
    `UPDATE "OrganizationMember" SET "industryId" = $1, "industryIds" = $4::text[]
     WHERE "organizationId" = $2 AND "authUserId" = $3 AND "role" = 'STAFF' AND "status" = 'ACTIVE'
     RETURNING "authUserId"`,
    [industryIds[0] || null, organization.id, userId, industryIds],
  )
  if (!result.rowCount) return NextResponse.json({ error: 'Active teammate not found.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
