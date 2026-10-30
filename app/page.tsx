import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import HomePage from '@/components/home-page'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session?.user) {
    const result = await pool.query(
      'SELECT "role" FROM "OrganizationMember" WHERE "authUserId" = $1 AND "status" = $2 ORDER BY "joinedAt" DESC LIMIT 1',
      [session.user.id, 'ACTIVE'],
    )

    redirect(result.rows[0]?.role === 'ADMIN' ? '/admin' : '/dashboard')
  }

  return <HomePage />
}
