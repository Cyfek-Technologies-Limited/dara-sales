import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ code: 'AUTH_REQUIRED' }, { status: 401 })

  const result = await pool.query(
    'SELECT "role" FROM "OrganizationMember" WHERE "authUserId" = $1 AND "status" = $2 ORDER BY "joinedAt" DESC LIMIT 1',
    [session.user.id, 'ACTIVE'],
  )
  const role = result.rows[0]?.role
  return NextResponse.json({ destination: role === 'ADMIN' ? '/admin' : '/dashboard', role: role || 'STAFF' })
}
