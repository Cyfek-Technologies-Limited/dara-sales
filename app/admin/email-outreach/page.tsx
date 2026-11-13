import { redirect } from 'next/navigation'
import { getWorkspaceSession } from '@/lib/admin-session'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import EmailOutreachManager from '@/components/email-outreach-manager'

export default async function EmailOutreachPage() {
  const admin = await getWorkspaceSession()
  if (!admin) redirect('/sign-in')
  return <main className="dashboard-page min-h-screen p-3 md:p-4">
    <div className="dashboard-frame mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-3">
      <DashboardSidebar role={admin.organization.role} userName={admin.user.name || 'Admin'} userEmail={admin.user.email} organizationName={admin.organization.name} />
      <section className="dashboard-content min-w-0 flex-1 px-4 py-5 sm:px-7 md:py-7"><EmailOutreachManager /></section>
    </div>
  </main>
}
