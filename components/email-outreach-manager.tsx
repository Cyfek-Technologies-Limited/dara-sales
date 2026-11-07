'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, RefreshCw, ArrowRight, CircleCheck } from 'lucide-react'

type Data = {
  mailboxConnectionAvailable: boolean
  automation: { configured: boolean; enabled: boolean }
  profile: { enabled: boolean; subject: string; message: string; companyAddress: string; industryId: string | null; senderId: string | null } | null
  senders: { id: string; email: string }[]
  industries: { id: string; name: string }[]
  counts: { status: string; count: number }[]
  jobs: { id: string; email: string; businessName: string; status: string }[]
}

export default function EmailOutreachManager() {
  const [data, setData] = useState<Data | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState({ subject: '', message: '', companyAddress: '', industryId: '', senderId: '' })
  const [approved, setApproved] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const load = useCallback(async (initialize = false) => {
    const response = await fetch('/api/admin/email-outreach', { cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Could not load outreach activity.')
    setData(result)
    if (initialize) setProfile({ subject: result.profile?.subject || '', message: result.profile?.message || '', companyAddress: result.profile?.companyAddress || '', industryId: result.profile?.industryId || '', senderId: result.profile?.senderId || '' })
  }, [])
  useEffect(() => {
    const url = new URL(window.location.href)
    const outcome = url.searchParams.get('mailbox')
    if (outcome) {
      const errors: Record<string, string> = {
        expired: 'The mailbox connection expired or your workspace changed. Please connect again.',
        cancelled: 'Google authorization was cancelled. Your mailbox was not connected.',
        permissions: 'Google did not grant the mailbox access needed. Reconnect and approve the requested permissions.',
        'already-linked': 'That Google mailbox is already connected to another organization.',
        failed: 'Could not finish connecting the mailbox. Please retry or ask your platform administrator to check the Google connection.',
      }
      if (outcome === 'connected') setMessage('Google mailbox connected. Select it below when you are ready to start outreach.')
      else setError(errors[outcome] || 'Could not complete the mailbox connection.')
      url.searchParams.delete('mailbox')
      window.history.replaceState(window.history.state, '', url.toString())
    }
    load(true).catch(cause => setError(cause.message))
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load().catch(() => {})
    }, 20000)
    return () => clearInterval(timer)
  }, [load])

  async function connectGoogle() {
    setConnecting(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/admin/email-outreach/google/start', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not connect Google.')
      const destination = new URL(result.url)
      if (destination.origin !== 'https://accounts.google.com') throw new Error('Unexpected Google connection address.')
      window.location.assign(destination.toString())
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not connect Google.'); setConnecting(false) }
  }

  async function retryFailed() {
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/admin/email-outreach', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'retry' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not retry these contacts.')
      setMessage(result.message)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not retry these contacts.') }
    finally { setBusy(false) }
  }
  async function updateOutreach(action: 'save' | 'activate' | 'pause') {
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/admin/email-outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...profile, action, confirmed: approved }), signal: AbortSignal.timeout(115000) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update your outreach.')
      setMessage(result.message); setApproved(false)
      await load(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update your outreach.') }
    finally { setBusy(false) }
  }
  function saveMessage(event: FormEvent) { event.preventDefault(); void updateOutreach('save') }
  const field = 'mt-2 w-full rounded-xl border-[1px] border-black/30 bg-white px-4 py-3 text-sm text-[#0b1f3a] disabled:opacity-60'
  const count = (status: string) => data ? data.counts.find(item => item.status === status)?.count || 0 : '-'
  const active = data?.automation.enabled
  const label = (status: string) => (({ QUEUED: 'Queued', SYNCING: 'Adding to outreach', SYNCED: 'Added to outreach', SKIPPED: 'Skipped', FAILED: 'Needs attention', CANCELLED: 'Cancelled' } as Record<string, string>)[status] || status)
  const detail = (status: string) => (({
    QUEUED: 'Waiting for automatic processing.', SYNCING: 'Adding this contact to your outreach.',
    SYNCED: 'Added successfully. Emails follow your configured sending schedule.',
    SKIPPED: 'Excluded by contact checks or because the lead changed.',
    FAILED: 'Could not add this contact. Retry, or contact your support team.', CANCELLED: 'The outreach configuration changed.',
  } as Record<string, string>)[status] || '')

  return <div className="space-y-6 text-[#0b1f3a]">
    <header><p className="text-xs font-bold uppercase tracking-widest text-[#8a509b]">Your outreach, on autopilot</p><h1 className="mt-2 text-3xl font-bold">Email outreach</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Save your leads. Once automation is active, contacts with an email address join your outreach automatically, including unassigned leads.</p></header>
    {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
    {message && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</p>}
    <section className="rounded-2xl border-[1px] border-black/30 bg-white p-6">
      <h2 className="text-lg font-bold">Connect your business mailbox</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Connect Google Workspace or Gmail using your Google account. Your mailbox is linked only to this organization. Connecting it does not start sending emails.</p>
      <button type="button" onClick={connectGoogle} disabled={connecting || busy || !data?.mailboxConnectionAvailable} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Mail className="size-4" />{connecting ? 'Opening Google...' : 'Connect Google mailbox'}</button>
      {data && !data.mailboxConnectionAvailable && <p className="mt-3 text-xs leading-5 text-amber-800">Google connection is awaiting platform activation. Your platform administrator handles this setup once for Dara.</p>}
      {!!data?.senders.length && <p className="mt-3 text-xs text-slate-600">Connected to this organization: {data.senders.map(sender => sender.email).join(', ')}</p>}
    </section>
    <form onSubmit={saveMessage} className="space-y-4 rounded-2xl border-[1px] border-black/30 bg-white p-6">
      <h2 className="text-lg font-bold">Your message and audience</h2><p className="text-sm leading-6 text-slate-600">Choose who your organization wants to reach and approve its own email. Dara creates and manages your outreach campaign behind the scenes.</p>
      <fieldset disabled={busy || Boolean(data?.profile?.enabled)} className="grid gap-4 sm:grid-cols-2 disabled:opacity-70">
        <label className="text-sm font-semibold">Send from<select value={profile.senderId} onChange={event => { setProfile({ ...profile, senderId: event.target.value }); setApproved(false) }} className={field}><option value="">Choose your connected business email</option>{data?.senders.map(sender => <option key={sender.id} value={sender.id}>{sender.email}</option>)}</select>{data && !data.senders.length && <span className="mt-2 block text-xs font-normal leading-5 text-amber-800">No business mailbox is connected to this organization yet. You can save your message now; a verified mailbox connection is required before sending.</span>}</label>
        <label className="text-sm font-semibold">Target industry<select value={profile.industryId} onChange={event => { setProfile({ ...profile, industryId: event.target.value }); setApproved(false) }} className={field}><option value="">All my saved lead industries</option>{data?.industries.map(industry => <option key={industry.id} value={industry.id}>{industry.name}</option>)}</select></label>
        <label className="text-sm font-semibold sm:col-span-2">Email subject<input required maxLength={200} value={profile.subject} onChange={event => { setProfile({ ...profile, subject: event.target.value }); setApproved(false) }} placeholder="What would you like to discuss with your potential clients?" className={field} /></label>
        <label className="text-sm font-semibold sm:col-span-2">Your email message<textarea required maxLength={10000} value={profile.message} onChange={event => { setProfile({ ...profile, message: event.target.value }); setApproved(false) }} placeholder="Describe how your business can help this audience and what you would like them to do next." className={`${field} min-h-48`} /><span className="mt-2 block text-xs font-normal leading-5 text-slate-600">Use {'{{company_name}}'} for the recipient business. Dara adds your organization name, address, and unsubscribe option.</span></label>
        <label className="text-sm font-semibold sm:col-span-2">Your company address<input required maxLength={500} value={profile.companyAddress} onChange={event => { setProfile({ ...profile, companyAddress: event.target.value }); setApproved(false) }} className={field} /></label>
      </fieldset>
      {data?.profile?.enabled ? <button type="button" disabled={busy} onClick={() => updateOutreach('pause')} className="rounded-xl border-[1px] border-black/30 px-4 py-3 text-sm font-semibold">Pause my outreach to edit</button> : <><button disabled={busy || !data} className="rounded-xl border-[1px] border-black/30 px-4 py-3 text-sm font-semibold">Save my message</button><label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} className="mt-1 size-4 accent-[#0b1f3a]" /><span>I approve this message and audience for my organization. Matching saved leads may receive this email automatically.</span></label><button type="button" disabled={busy || !approved || !profile.senderId || !profile.subject.trim() || !profile.message.trim() || !profile.companyAddress.trim()} onClick={() => updateOutreach('activate')} className="rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Updating outreach...' : 'Start my automated outreach'}</button></>}
    </form>
    <section className="rounded-2xl border-[1px] border-black/30 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#0b1f3a] text-white"><Mail className="size-5" /></span><div><h2 className="text-lg font-bold">Automatic email outreach</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{!data ? 'Loading your outreach status...' : active ? 'Your saved leads are added automatically. Follow-ups and sending times follow your outreach schedule.' : data.automation.configured ? 'Automation is paused for this workspace. Your leads remain saved.' : 'Save your message, choose your connected business mailbox, and start outreach when you are ready.'}</p></div></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${active ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>{!data ? 'Loading' : active ? 'Active' : data.automation.configured ? 'Paused' : 'Awaiting activation'}</span></div>
      <div className="mt-6 grid gap-4 border-t border-black/20 pt-5 sm:grid-cols-3">{['Save a lead with an email address', 'The contact joins outreach automatically', 'Emails follow your sending schedule'].map((step, index) => <p key={step} className="flex items-start gap-2 text-sm leading-6 text-slate-600"><CircleCheck className="mt-1 size-4 shrink-0 text-[#8a509b]" /><span><strong className="text-[#0b1f3a]">{index + 1}.</strong> {step}</span></p>)}</div>
      <p className="mt-4 text-xs leading-5 text-slate-600">Existing leads matching your selected audience are included automatically. Duplicate and unsubscribed addresses are excluded. Contacts added to outreach have not necessarily received an email yet.</p>
      <Link href="/admin/prospecting" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white">Find more leads<ArrowRight className="size-4" /></Link>
    </section>
    <div className="grid gap-4 sm:grid-cols-4">{[['QUEUED', 'Queued'], ['SYNCED', 'Added to outreach'], ['SKIPPED', 'Skipped'], ['FAILED', 'Needs attention']].map(([status, title]) => <div key={status} className="rounded-2xl border-[1px] border-black/30 bg-white p-5"><p className="text-xs font-semibold text-slate-600">{title}</p><p className="mt-2 text-3xl font-bold">{count(status)}</p></div>)}</div>
    <section className="overflow-hidden rounded-2xl border-[1px] border-black/30 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5"><h2 className="text-lg font-bold">Outreach activity</h2><div className="flex gap-4"><button type="button" disabled={busy} onClick={() => { setError(''); load().catch(cause => setError(cause.message)) }} className="inline-flex items-center gap-2 text-sm font-semibold"><RefreshCw className="size-4" />Refresh</button>{active && Number(count('FAILED')) > 0 && <button type="button" disabled={busy} onClick={retryFailed} className="text-sm font-semibold underline">{busy ? 'Retrying...' : 'Retry failed contacts'}</button>}</div></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-xs text-slate-600"><tr><th className="px-5 py-3">Business / email</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Details</th></tr></thead><tbody>{data?.jobs.map(job => <tr key={job.id} className="border-t border-black/10"><td className="px-5 py-4 font-semibold">{job.businessName}<span className="mt-1 block text-xs font-normal text-slate-600">{job.email}</span></td><td className="px-5 py-4"><span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${job.status === 'SYNCED' ? 'bg-emerald-100 text-emerald-900' : job.status === 'FAILED' ? 'bg-rose-100 text-rose-900' : 'bg-slate-100 text-slate-700'}`}>{label(job.status)}</span></td><td className="max-w-md px-5 py-4 text-xs leading-5 text-slate-600">{detail(job.status)}</td></tr>)}</tbody></table>{data && !data.jobs.length && <p className="p-6 text-sm text-slate-600">{active ? 'No outreach activity yet. Saved leads with email addresses will appear here automatically.' : 'Your outreach activity will appear here once automation is active.'}</p>}</div>
    </section>
  </div>
}
