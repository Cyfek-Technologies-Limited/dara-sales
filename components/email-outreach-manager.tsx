'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Mail, PenLine, LoaderCircle } from 'lucide-react'
import OutreachLiveMonitor from '@/components/outreach-live-monitor'
import OutreachContactDirectory from '@/components/outreach-contact-directory'

type Data = {
  businessDescription: string
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
  const [pendingAction, setPendingAction] = useState('')
  const [activityVersion, setActivityVersion] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState({ subject: '', message: '', companyAddress: '', industryId: '', senderId: '' })
  const [approved, setApproved] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')
  const [draft, setDraft] = useState<{ subject: string; message: string } | null>(null)
  const [mailbox, setMailbox] = useState({ senderName: '', email: '', host: '', port: '587', password: '' })

  const load = useCallback(async (initialize = false) => {
    const response = await fetch('/api/admin/email-outreach', { cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Could not load outreach activity.')
    setData(result)
    if (initialize) setBusinessDescription(result.businessDescription || '')
    if (initialize) setProfile({ subject: result.profile?.subject || '', message: result.profile?.message || '', companyAddress: result.profile?.companyAddress || '', industryId: result.profile?.industryId || '', senderId: result.profile?.senderId || '' })
  }, [])
  useEffect(() => {
    load(true).catch(cause => setError(cause.message))
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load().catch(() => {})
    }, 20000)
    return () => clearInterval(timer)
  }, [load])

  async function generateEmail() {
    if (generating) return
    setGenerating(true); setGenerationError(''); setError(''); setMessage(''); setDraft(null)
    try {
      const response = await fetch('/api/admin/email-outreach/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDescription, industryId: profile.industryId }), signal: AbortSignal.timeout(55000),
      })
      const result = await response.json().catch(() => null)
      if (!result) throw new Error('The generation service returned an unreadable response. Please try again.')
      if (!response.ok) throw new Error(result.error || 'Could not generate your email.')
      if (typeof result.subject !== 'string' || !result.subject.trim() || typeof result.message !== 'string' || !result.message.trim()) throw new Error('The AI response did not include a complete email. Please try again.')
      setDraft({ subject: result.subject, message: result.message })
    } catch (cause) { setGenerationError(cause instanceof Error && (cause.name === 'TimeoutError' || cause.name === 'AbortError') ? 'Email generation timed out. Your description is still here; please try again.' : cause instanceof Error ? cause.message : 'Could not generate your email.') }
    finally { setGenerating(false) }
  }

  async function connectMailbox(event: FormEvent) {
    event.preventDefault(); setConnecting(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/admin/email-outreach/mailbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mailbox) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not connect mailbox.')
      setMessage(result.message); setMailbox({ ...mailbox, password: '' }); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not connect mailbox.') }
    finally { setConnecting(false) }
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
      await load(); setActivityVersion(value => value + 1)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not retry these contacts.') }
    finally { setBusy(false); setPendingAction('') }
  }
  async function updateOutreach(action: 'save' | 'activate' | 'pause') {
    if (generating) return
    setBusy(true); setPendingAction(action); setError(''); setMessage('')
    if (action === 'activate') document.getElementById('live-outreach')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    try {
      const response = await fetch('/api/admin/email-outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...profile, action, confirmed: approved }), signal: AbortSignal.timeout(115000) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update your outreach.')
      setMessage(result.message); setApproved(false); setActivityVersion(value => value + 1)
      await load(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update your outreach.') }
    finally { setBusy(false); setPendingAction('') }
  }
  function saveMessage(event: FormEvent) { event.preventDefault(); void updateOutreach('save') }
  const field = 'mt-2 w-full rounded-xl border-[1px] border-black/30 bg-white px-4 py-3 text-sm text-[#0b1f3a] disabled:opacity-60'
  return <div className="space-y-6 text-[#0b1f3a]">
    <header><p className="text-xs font-bold uppercase tracking-widest text-[#8a509b]">Your outreach, on autopilot</p><h1 className="mt-2 text-3xl font-bold">Email outreach</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Save your prospects. Once automation is active, contacts with an email address join your outreach automatically, including unassigned prospects.</p></header>
    {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
    {message && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</p>}
    <OutreachLiveMonitor starting={pendingAction === 'activate'} refreshKey={activityVersion} />
    <section className="rounded-2xl border-[1px] border-black/30 bg-white p-6">
      <h2 className="text-lg font-bold">Connect your business mailbox</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Connect your organization's email once using its SMTP settings. Emails use your business name and mailbox. Your password is encrypted on the server and is never returned to your browser.</p>
      <form onSubmit={connectMailbox} className="mt-4 grid gap-4 sm:grid-cols-2">
        <fieldset disabled={connecting || Boolean(data?.automation.enabled)} className="contents">
          <label className="text-sm font-semibold">Business sender name<input required maxLength={120} value={mailbox.senderName} onChange={e => setMailbox({ ...mailbox, senderName: e.target.value })} className={field} placeholder="Your business name" /></label>
          <label className="text-sm font-semibold">Business email<input required type="email" autoComplete="username" value={mailbox.email} onChange={e => setMailbox({ ...mailbox, email: e.target.value })} className={field} placeholder="you@yourbusiness.com" /></label>
          <label className="text-sm font-semibold">SMTP server<input required value={mailbox.host} onChange={e => setMailbox({ ...mailbox, host: e.target.value })} className={field} placeholder="smtp.yourprovider.com" /></label>
          <label className="text-sm font-semibold">Secure SMTP port<select value={mailbox.port} onChange={e => setMailbox({ ...mailbox, port: e.target.value })} className={field}><option value="587">587 - STARTTLS</option><option value="465">465 - TLS</option></select></label>
          <label className="text-sm font-semibold sm:col-span-2">SMTP password / app password<input required type="password" autoComplete="new-password" value={mailbox.password} onChange={e => setMailbox({ ...mailbox, password: e.target.value })} className={field} /></label>
        </fieldset>
        <p className="text-xs leading-5 text-slate-600 sm:col-span-2">Use the SMTP settings from your email provider. Some providers require a separate app password or disable password-based SMTP. Connecting checks sign-in without sending an email. Pause outreach before changing mailbox settings.</p>
        <button disabled={connecting || busy || Boolean(data?.automation.enabled) || !data?.mailboxConnectionAvailable} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Mail className="size-4" />{connecting ? 'Connecting...' : 'Connect business mailbox'}</button>
      </form>
      {data && !data.mailboxConnectionAvailable && <p className="mt-3 text-xs text-amber-800">Mailbox setup is awaiting the platform's encryption key.</p>}
      {!!data?.senders.length && <p className="mt-3 text-xs text-slate-600">Connected to this organization: {data.senders.map(sender => sender.email).join(', ')}</p>}
    </section>
    <form onSubmit={saveMessage} className="space-y-4 rounded-2xl border-[1px] border-black/30 bg-white p-6">
      <h2 className="text-lg font-bold">Your message and audience</h2><p className="text-sm leading-6 text-slate-600">Choose who your organization wants to reach and approve its own email. Dara sends through your connected business mailbox automatically.</p>
      <fieldset disabled={busy || generating || Boolean(data?.profile?.enabled)} className="grid gap-4 sm:grid-cols-2 disabled:opacity-70">
        <label className="text-sm font-semibold">Send from<select value={profile.senderId} onChange={event => { setProfile({ ...profile, senderId: event.target.value }); setApproved(false) }} className={field}><option value="">Choose your connected business email</option>{data?.senders.map(sender => <option key={sender.id} value={sender.id}>{sender.email}</option>)}</select>{data && !data.senders.length && <span className="mt-2 block text-xs font-normal leading-5 text-amber-800">No business mailbox is connected to this organization yet. You can save your message now; a verified mailbox connection is required before sending.</span>}</label>
        <label className="text-sm font-semibold">Target industry<select value={profile.industryId} onChange={event => { setProfile({ ...profile, industryId: event.target.value }); setApproved(false); setDraft(null) }} className={field}><option value="">All my saved prospect industries</option>{data?.industries.map(industry => <option key={industry.id} value={industry.id}>{industry.name}</option>)}</select></label>
        <section className="rounded-xl border-[1px] border-black/30 bg-slate-50 p-4 sm:col-span-2">
          <div className="flex items-center gap-2"><PenLine className="size-5" /><h3 className="font-bold">Let AI write your email</h3></div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Generate a persuasive subject and message from what your business offers, tailored to the industry selected above.</p>
          <label className="mt-3 block text-sm font-semibold">What does your business offer?<textarea maxLength={2000} value={businessDescription} onChange={event => { setBusinessDescription(event.target.value); setDraft(null) }} placeholder="For example: We supply air compressors for industrial equipment, or help brands promote their products through advertising." className={`${field} min-h-24`} /></label>
          <p className="mt-2 text-xs leading-5 text-slate-600">We use your saved AI Prospecting description when available. You can refine it here for this draft. If you only have a website URL, analyze it in AI Prospecting first.</p>
          <button type="button" disabled={!data || !businessDescription.trim() || generating} onClick={generateEmail} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><PenLine className="size-4" />{generating ? 'Writing your email...' : draft ? 'Generate another draft' : 'Generate subject and email'}</button>
          {generating && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-[#173b65]"><LoaderCircle className="size-4 animate-spin" />Writing your subject and message. This may take up to a minute.</p>}
          {generationError && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{generationError}</p>}
          {draft && <div className="mt-4 rounded-xl border border-slate-300 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">AI draft preview</p>
            <h4 className="mt-2 font-semibold">{draft.subject}</h4>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{draft.message}</p>
            <p className="mt-3 text-xs leading-5 text-slate-600">Check the facts and wording before sending. Using this draft replaces the subject and message below.</p>
            <div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => { setProfile({ ...profile, subject: draft.subject, message: draft.message }); setApproved(false); setDraft(null); setMessage('AI draft applied. Edit it below, then save or approve it when ready.') }} className="rounded-lg bg-[#0b1f3a] px-4 py-2 text-sm font-semibold text-white">Use this draft</button><button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-black/30 px-4 py-2 text-sm font-semibold">Discard draft</button></div>
          </div>}
        </section>
        <label className="text-sm font-semibold sm:col-span-2">Email subject<input required maxLength={200} value={profile.subject} onChange={event => { setProfile({ ...profile, subject: event.target.value }); setApproved(false) }} placeholder="What would you like to discuss with your potential clients?" className={field} /></label>
        <label className="text-sm font-semibold sm:col-span-2">Your email message<textarea required maxLength={10000} value={profile.message} onChange={event => { setProfile({ ...profile, message: event.target.value }); setApproved(false) }} placeholder="Describe how your business can help this audience and what you would like them to do next." className={`${field} min-h-48`} /><span className="mt-2 block text-xs font-normal leading-5 text-slate-600">Use {'{{company_name}}'} for the recipient business. Dara adds your organization name, address, and unsubscribe option.</span></label>
        <label className="text-sm font-semibold sm:col-span-2">Your company address<input required maxLength={500} value={profile.companyAddress} onChange={event => { setProfile({ ...profile, companyAddress: event.target.value }); setApproved(false) }} className={field} /></label>
      </fieldset>
      {data?.profile?.enabled ? <button type="button" disabled={busy} onClick={() => updateOutreach('pause')} className="rounded-xl border-[1px] border-black/30 px-4 py-3 text-sm font-semibold">Pause my outreach to edit</button> : <><button disabled={busy || generating || !data} className="rounded-xl border-[1px] border-black/30 px-4 py-3 text-sm font-semibold">Save my message</button><label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" disabled={generating || busy} checked={approved} onChange={event => setApproved(event.target.checked)} className="mt-1 size-4 accent-[#0b1f3a]" /><span>I approve this message and audience for my organization. Matching saved prospects may receive this email automatically.</span></label><button type="button" disabled={busy || generating || !approved || !profile.senderId || !profile.subject.trim() || !profile.message.trim() || !profile.companyAddress.trim()} onClick={() => updateOutreach('activate')} className="rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy && <LoaderCircle className="mr-2 inline size-4 animate-spin" />}{pendingAction === 'activate' ? 'Preparing and starting emails...' : busy ? 'Updating outreach...' : 'Start sending emails'}</button></>}
    </form>
    <OutreachContactDirectory industryId={profile.industryId} />
    {data?.automation.enabled && data.counts.some(item => item.status === 'FAILED' && item.count > 0) && <button type="button" disabled={busy} onClick={retryFailed} className="rounded-xl border border-black/30 bg-white px-4 py-3 text-sm font-semibold">{busy ? 'Retrying...' : 'Retry failed contacts'}</button>}
  </div>
}
