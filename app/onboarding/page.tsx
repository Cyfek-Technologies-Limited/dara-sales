import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding-wizard'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in?next=/onboarding')

  const membership = await pool.query(
    'SELECT "role" FROM "OrganizationMember" WHERE "authUserId" = $1 AND "status" = $2 ORDER BY "joinedAt" DESC LIMIT 1',
    [session.user.id, 'ACTIVE'],
  )
  const role = membership.rows[0]?.role
  if (role === 'ADMIN') redirect('/admin')
  if (role === 'STAFF') redirect('/dashboard')

  return <OnboardingWizard />
}
