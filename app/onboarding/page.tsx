import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding-wizard'
import { auth } from '@/lib/auth'

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in?next=/onboarding')
  return <OnboardingWizard />
}
