import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import HomePage from '@/components/home-page'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Dara | AI prospecting and sales team management',
  description: 'Discover businesses in your target industries and locations, save prospects with source links, organize team outreach, and track prospects and client wins in one workspace.',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fcfcf9',
}

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
