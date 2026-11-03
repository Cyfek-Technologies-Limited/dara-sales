import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Sign in as an organization admin.' }, { status: 401 })

  const organization = (await pool.query(
    `SELECT m."organizationId" FROM "OrganizationMember" m
     WHERE m."authUserId" = $1 AND m."role" = 'ADMIN'
     ORDER BY m."joinedAt" DESC LIMIT 1`,
    [session.user.id],
  )).rows[0]
  if (!organization) return NextResponse.json({ error: 'Admin workspace not found.' }, { status: 403 })

  const { userId } = await params
  if (!userId || userId === session.user.id) {
    return NextResponse.json({ error: 'You cannot remove this team member.' }, { status: 400 })
  }

  const removed = await pool.query(
    `DELETE FROM "OrganizationMember"
     WHERE "organizationId" = $1 AND "authUserId" = $2 AND "role" = 'STAFF'
     RETURNING "authUserId"`,
    [organization.organizationId, userId],
  )
  if (!removed.rowCount) return NextResponse.json({ error: 'Team member not found.' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
