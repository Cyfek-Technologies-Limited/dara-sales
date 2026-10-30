import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
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
  const industryId = typeof body.industryId === 'string' ? body.industryId : ''
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  if (!industryId || !name || name.length > 80) {
    return NextResponse.json({ error: 'Choose an industry and enter a category name up to 80 characters.' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const industry = await client.query(
      `SELECT "id" FROM "Industry" WHERE "id" = $1 AND "organizationId" = $2 FOR UPDATE`,
      [industryId, organization.id],
    )
    if (!industry.rowCount) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Choose an industry in this workspace.' }, { status: 400 })
    }

    const duplicate = await client.query(
      `SELECT 1 FROM "IndustryCategory" WHERE "industryId" = $1 AND LOWER("name") = LOWER($2)`,
      [industryId, name],
    )
    if (duplicate.rowCount) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'That category already exists under this industry.' }, { status: 409 })
    }

    const count = await client.query(
      `SELECT COUNT(*)::int AS count FROM "IndustryCategory" WHERE "industryId" = $1`,
      [industryId],
    )
    if (Number(count.rows[0].count) >= 6) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Each industry can have up to six categories.' }, { status: 409 })
    }

    const created = await client.query(
      `INSERT INTO "IndustryCategory" ("id", "industryId", "name") VALUES ($1, $2, $3) RETURNING "id", "name"`,
      [crypto.randomUUID(), industryId, name],
    )
    await client.query('COMMIT')
    return NextResponse.json({ category: created.rows[0] }, { status: 201 })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[admin] Industry category creation failed:', error)
    return NextResponse.json({ error: 'Could not add this category.' }, { status: 500 })
  } finally {
    client.release()
  }
}
