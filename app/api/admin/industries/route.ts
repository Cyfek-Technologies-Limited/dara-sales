import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

async function getAdminOrganization() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  const organization = (await pool.query(
    `SELECT o."id" FROM "Organization" o
     JOIN "OrganizationMember" m ON m."organizationId" = o."id"
     WHERE m."authUserId" = $1 AND m."role" = 'ADMIN'
     ORDER BY o."createdAt" DESC LIMIT 1`,
    [session.user.id],
  )).rows[0]

  return organization ? { userId: session.user.id, organizationId: organization.id } : null
}

export async function POST(request: Request) {
  const admin = await getAdminOrganization()
  if (!admin) return NextResponse.json({ error: 'Sign in as an organization admin.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  if (!name || name.length > 80) {
    return NextResponse.json({ error: 'Enter an industry name up to 80 characters.' }, { status: 400 })
  }

  try {
    const result = await pool.query(
      `INSERT INTO "Industry" ("id", "organizationId", "name") VALUES ($1, $2, $3)
       RETURNING "id", "name"`,
      [crypto.randomUUID(), admin.organizationId, name],
    )
    return NextResponse.json({ industry: result.rows[0] }, { status: 201 })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'That industry already exists in your workspace.' }, { status: 409 })
    }
    console.error('[admin] Industry creation failed:', error)
    return NextResponse.json({ error: 'Could not add this industry.' }, { status: 500 })
  }
}
