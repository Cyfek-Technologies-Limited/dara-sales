'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Mail, PenLine, LoaderCircle } from 'lucide-react'
import OutreachLiveMonitor from '@/components/outreach-live-monitor'
import OutreachContactDirectory from '@/components/outreach-contact-directory'

type Attachment = { id?: string; name: string; type: string; size: number; content?: string }

type Data = {
  businessDescription: string
  mailboxConnectionAvailable: boolean
  automation: { configured: boolean; enabled: boolean }
  profile: { attachments: Attachment[]; enabled: boolean; subject: string; message: string; companyAddress: string; industryId: string | null; senderId: string | null } | null
  senders: { id: string; email: string; senderName?: string }[]
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
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [readingFiles, setReadingFiles] = useState(false)
  const [attachmentError, setAttachmentError] = useState('')
  const [approved, setApproved] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')
  const [mailbox, setMailbox] = useState({ senderName: '', email: '', host: '', port: '587', password: '' })

  const load = useCallback(async (initialize = false, selectSender = false) => {
    const response = await fetch('/api/admin/email-outreach', { cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Could not load outreach activity.')
    setData(result)
    if (initialize) setAttachments(result.profile?.attachments || [])
    if (initialize) setBusinessDescription(result.businessDescription || '')
    if (initialize) setProfile({ subject: result.profile?.subject || '', message: result.profile?.message || '', companyAddress: result.profile?.companyAddress || '', industryId: result.profile?.industryId || '', senderId: result.senders?.some((sender: { id: string }) => sender.id === result.profile?.senderId) ? result.profile.senderId : result.senders?.length === 1 ? result.senders[0].id : '' })
    if (selectSender && result.senders?.length === 1) {
      setProfile(current => ({ ...current, senderId: current.senderId || result.senders[0].id }))
      setApproved(false)
    }
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
    setGenerating(true); setGenerationError(''); setError(''); setMessage('')
    try {
      const response = await fetch('/api/admin/email-outreach/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDescription, industryId: profile.industryId }), signal: AbortSignal.timeout(55000),
      })
      const result = await response.json().catch(() => null)
      if (!result) throw new Error('The generation service returned an unreadable response. Please try again.')
      if (!response.ok) throw new Error(result.error || 'Could not generate your email.')
      if (typeof result.subject !== 'string' || !result.subject.trim() || typeof result.message !== 'string' || !result.message.trim()) throw new Error('The AI response did not include a complete email. Please try again.')
      setProfile(current => ({ ...current, subject: result.subject, message: result.message }))
      setApproved(false)
      setMessage('Email generated. Review the subject and message below, then click Save message to keep it for your next visit.')
    } catch (cause) { setGenerationError(cause instanceof Error && (cause.name === 'TimeoutError' || cause.name === 'AbortError') ? 'Email generation timed out. Your description is still here; please try again.' : cause instanceof Error ? cause.message : 'Could not generate your email.') }
    finally { setGenerating(false) }
  }

  async function connectMailbox(event: FormEvent) {
    event.preventDefault(); setConnecting(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/admin/email-outreach/mailbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mailbox) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not connect mailbox.')
      setMessage(result.message); setMailbox({ ...mailbox, email: '', password: '' }); await load(false, true)
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
  async function addAttachments(files: File[]) {
    setAttachmentError(''); setApproved(false)
    if (attachments.length + files.length > 3 || attachments.reduce((sum, file) => sum + file.size, 0) + files.reduce((sum, file) => sum + file.size, 0) > 2 * 1024 * 1024) { setAttachmentError('Choose up to 3 files, no more than 2 MB in total.'); return }
    if (files.some(file => !/\.(pdf|png|jpe?g|txt)$/i.test(file.name) || !file.size)) { setAttachmentError('Choose a non-empty PDF, PNG, JPG, or TXT file.'); return }
    setReadingFiles(true)
    try {
      const added = await Promise.all(files.map(file => new Promise<Attachment>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('Could not read an attachment. Please try again.'))
        reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, content: String(reader.result).split(',')[1] })
        reader.readAsDataURL(file)
      })))
      setAttachments(current => [...current, ...added])
    } catch (cause) { setAttachmentError(cause instanceof Error ? cause.message : 'Could not read attachment.') }
    finally { setReadingFiles(false) }
  }

  async function updateOutreach(action: 'save' | 'activate' | 'pause') {
    if (generating || busy || readingFiles || !data) return
    setBusy(true); setPendingAction(action); setError(''); setMessage('')
    if (action === 'activate') document.getElementById('live-outreach')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    try {
      const response = await fetch('/api/admin/email-outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...profile, attachments, action, confirmed: approved }), signal: AbortSignal.timeout(115000) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update your outreach.')
      setMessage(result.message); setApproved(false); setActivityVersion(value => value + 1)
      await load(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update your outreach.') }
    finally { setBusy(false); setPendingAction('') }
  }
  function saveMessage(event: FormEvent) { event.preventDefault(); void updateOutreach('save') }
  const sendingRequirements = [
    ...(!data ? [{ text: 'Wait for your outreach settings to load. If loading failed, refresh the page.', target: 'outreach-message' }] : []),
    ...(data && !data.senders.length ? [{ text: 'Connect a business mailbox above before sending.', target: 'outreach-mailbox' }]
      : data && !data.senders.some(sender => sender.id === profile.senderId) ? [{ text: 'Choose a connected business email in Send from.', target: 'outreach-sender' }] : []),
    ...(!profile.subject.trim() ? [{ text: 'Enter or generate an email subject.', target: 'outreach-subject' }] : []),
    ...(!profile.message.trim() ? [{ text: 'Enter or generate your email message.', target: 'outreach-body' }] : []),
    ...(!profile.companyAddress.trim() ? [{ text: 'Enter your company address.', target: 'outreach-address' }] : []),
    ...(!approved ? [{ text: 'Tick the approval checkbox after reviewing your message.', target: 'outreach-approval' }] : []),
  ]
  const field = 'mt-2 w-full rounded-xl border-[1px] border-black/30 bg-white px-4 py-3 text-sm text-[#0b1f3a] disabled:opacity-60'
  return <div className="space-y-6 text-[#0b1f3a]">
    <header><p className="text-xs font-bold uppercase tracking-widest text-[#8a509b]">Your outreach, on autopilot</p><h1 className="mt-2 text-3xl font-bold">Email outreach</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Save your prospects. Once automation is active, contacts with an email address join your outreach automatically, including unassigned prospects.</p></header>
    {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
    {message && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</p>}
    <OutreachLiveMonitor starting={pendingAction === 'activate'} refreshKey={activityVersion} />
    <section id="outreach-mailbox" className="rounded-2xl border-[1px] border-black/30 bg-white p-6">
      <h2 className="text-lg font-bold">{data?.senders.length ? 'Add another business mailbox' : 'Connect your business mailbox'}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Connect one or more business mailboxes using their SMTP settings. Choose which mailbox sends your campaign under Send from. Passwords are encrypted on the server.</p>
      <form onSubmit={connectMailbox} className="mt-4 grid gap-4 sm:grid-cols-2">
        <fieldset disabled={connecting || busy} className="contents">
          <label className="text-sm font-semibold">Business sender name<input required maxLength={120} value={mailbox.senderName} onChange={e => setMailbox({ ...mailbox, senderName: e.target.value })} className={field} placeholder="Your business name" /></label>
          <label className="text-sm font-semibold">Business email<input required type="email" autoComplete="username" value={mailbox.email} onChange={e => setMailbox({ ...mailbox, email: e.target.value })} className={field} placeholder="you@yourbusiness.com" /></label>
          <label className="text-sm font-semibold">SMTP server<input required value={mailbox.host} onChange={e => setMailbox({ ...mailbox, host: e.target.value })} className={field} placeholder="smtp.yourprovider.com" /></label>
          <label className="text-sm font-semibold">Secure SMTP port<select value={mailbox.port} onChange={e => setMailbox({ ...mailbox, port: e.target.value })} className={field}><option value="587">587 - STARTTLS</option><option value="465">465 - TLS</option></select></label>
          <label className="text-sm font-semibold sm:col-span-2">SMTP password / app password<input required type="password" autoComplete="new-password" value={mailbox.password} onChange={e => setMailbox({ ...mailbox, password: e.target.value })} className={field} /></label>
        </fieldset>
        <p className="text-xs leading-5 text-slate-600 sm:col-span-2">Use the SMTP settings from your email provider. Some providers require a separate app password or disable password-based SMTP. Connecting checks sign-in without sending an email. You can add another mailbox while outreach runs. Pause before changing the active sender or its credentials.</p>
        <button disabled={connecting || busy || !data?.mailboxConnectionAvailable} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Mail className="size-4" />{connecting ? 'Connecting...' : data?.senders.length ? 'Add mailbox' : 'Connect business mailbox'}</button>
      </form>
      {data && !data.mailboxConnectionAvailable && <p className="mt-3 text-xs text-amber-800">Mailbox setup is awaiting the platform's encryption key.</p>}
      {!!data?.senders.length && <div className="mt-5 border-t border-slate-200 pt-4"><h3 className="text-sm font-semibold">Connected mailboxes ({data.senders.length})</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{data.senders.map(sender => <div key={sender.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-300 bg-slate-50 p-3"><div className="min-w-0"><p className="break-all text-sm font-semibold">{sender.email}</p>{sender.senderName && <p className="mt-1 text-xs text-slate-600">{sender.senderName}</p>}</div><span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">{data.profile?.senderId === sender.id && data.profile.enabled ? 'Active sender' : 'Connected'}</span></div>)}</div><p className="mt-2 text-xs text-slate-600">Each campaign uses one selected mailbox. To change an active sender, pause outreach, choose a mailbox below, then approve and restart.</p></div>}
    </section>
    <form id="outreach-message" onSubmit={saveMessage} className="space-y-4 rounded-2xl border-[1px] border-black/30 bg-white p-6">
      <h2 className="text-lg font-bold">Your message and audience</h2><p className="text-sm leading-6 text-slate-600">Choose who your organization wants to reach and approve its own email. Dara sends through your connected business mailbox automatically.</p>
      <fieldset disabled={busy || generating || readingFiles || Boolean(data?.profile?.enabled)} className="grid gap-4 sm:grid-cols-2 disabled:opacity-70">
        <label className="text-sm font-semibold">Send from<select id="outreach-sender" value={profile.senderId} onChange={event => { setProfile({ ...profile, senderId: event.target.value }); setApproved(false) }} className={field}><option value="">Choose your connected business email</option>{data?.senders.map(sender => <option key={sender.id} value={sender.id}>{sender.email}</option>)}</select>{data && !data.senders.length && <span className="mt-2 block text-xs font-normal leading-5 text-amber-800">No business mailbox is connected to this organization yet. You can save your message now; a verified mailbox connection is required before sending.</span>}</label>
        <label className="text-sm font-semibold">Target industry<select value={profile.industryId} onChange={event => { setProfile({ ...profile, industryId: event.target.value }); setApproved(false) }} className={field}><option value="">All my saved prospect industries</option>{data?.industries.map(industry => <option key={industry.id} value={industry.id}>{industry.name}</option>)}</select></label>
        <section className="rounded-xl border-[1px] border-black/30 bg-slate-50 p-4 sm:col-span-2">
          <div className="flex items-center gap-2"><PenLine className="size-5" /><h3 className="font-bold">Let AI write your email</h3></div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Generate a persuasive subject and message from what your business offers, tailored to the industry selected above.</p>
          <label className="mt-3 block text-sm font-semibold">What does your business offer?<textarea maxLength={2000} value={businessDescription} onChange={event => { setBusinessDescription(event.target.value) }} placeholder="For example: We supply air compressors for industrial equipment, or help brands promote their products through advertising." className={`${field} min-h-24`} /></label>
          <p className="mt-2 text-xs leading-5 text-slate-600">We use your saved AI Prospecting description when available. You can refine it here for this draft. If you only have a website URL, analyze it in AI Prospecting first.</p>
          <button type="button" disabled={!data || !businessDescription.trim() || generating} onClick={generateEmail} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><PenLine className="size-4" />{generating ? 'Writing your email...' : profile.subject ? 'Generate another draft' : 'Generate subject and email'}</button>
          {generating && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-[#173b65]"><LoaderCircle className="size-4 animate-spin" />Writing your subject and message. This may take up to a minute.</p>}
          {generationError && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{generationError}</p>}

        </section>
        <label className="text-sm font-semibold sm:col-span-2">Email subject<input id="outreach-subject" required maxLength={200} value={profile.subject} onChange={event => { setProfile({ ...profile, subject: event.target.value }); setApproved(false) }} placeholder="What would you like to discuss with your potential clients?" className={field} /></label>
        <label className="text-sm font-semibold sm:col-span-2">Your email message<textarea id="outreach-body" required maxLength={10000} value={profile.message} onChange={event => { setProfile({ ...profile, message: event.target.value }); setApproved(false) }} placeholder="Describe how your business can help this audience and what you would like them to do next." className={`${field} min-h-48`} /><span className="mt-2 block text-xs font-normal leading-5 text-slate-600">Use {'{{company_name}}'} for the recipient business. Dara adds your organization name, address, and unsubscribe option.</span></label>
        <label className="text-sm font-semibold sm:col-span-2">Your company address <span className="font-normal text-slate-500">(required before sending)</span><input id="outreach-address" maxLength={500} value={profile.companyAddress} onChange={event => { setProfile({ ...profile, companyAddress: event.target.value }); setApproved(false) }} className={field} /></label>
      </fieldset>
      <fieldset disabled={busy || readingFiles || Boolean(data?.profile?.enabled)} className="rounded-xl border border-black/20 p-4 disabled:opacity-70">
        <legend className="px-1 text-sm font-semibold">Attachments (optional)</legend>
        <label className="block text-sm">Add files<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.txt" className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-slate-50 file:px-3 file:py-2" onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void addAttachments(files) }} /></label>
        <p className="mt-2 text-xs text-slate-600">No attachment is required to send emails. You can optionally add up to 3 files (2 MB total): PDF, PNG, JPG, or TXT. Pause outreach to edit attachments.</p>
        {readingFiles && <p role="status" className="mt-2 text-sm">Preparing attachments...</p>}
        {attachmentError && <p role="alert" className="mt-2 text-sm text-red-800">{attachmentError}</p>}
        <ul className="mt-3 space-y-2">{attachments.map((file, index) => <li key={file.id || index} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="min-w-0 break-words">{file.name} <span className="text-xs text-slate-500">({Math.ceil(file.size / 1024)} KB)</span></span><button type="button" className="shrink-0 font-semibold text-red-700" aria-label={'Remove ' + file.name} onClick={() => { setAttachments(current => current.filter((_, position) => position !== index)); setApproved(false); setAttachmentError('') }}>Remove</button></li>)}</ul>
      </fieldset>
      {data?.profile?.enabled ? <button type="button" disabled={busy} onClick={() => updateOutreach('pause')} className="rounded-xl border-[1px] border-black/30 px-4 py-3 text-sm font-semibold">Pause my outreach to edit</button> : <><button disabled={busy || generating || readingFiles || !data} className="rounded-xl border-[1px] border-black/30 px-4 py-3 text-sm font-semibold">{pendingAction === 'save' ? 'Saving message…' : 'Save message'}</button><label className="flex items-start gap-3 text-sm leading-6"><input id="outreach-approval" type="checkbox" disabled={generating || busy || readingFiles} checked={approved} onChange={event => setApproved(event.target.checked)} className="mt-1 size-4 accent-[#0b1f3a]" /><span>I approve this message, any selected attachments, and audience for my organization. Matching saved prospects may receive this email automatically.</span></label><button type="button" aria-describedby="outreach-send-requirements" disabled={busy || generating || readingFiles || sendingRequirements.length > 0} onClick={() => updateOutreach('activate')} className="rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy && <LoaderCircle className="mr-2 inline size-4 animate-spin" />}{pendingAction === 'activate' ? 'Preparing and starting emails...' : busy ? 'Updating outreach...' : 'Start sending emails'}</button></>}
      {!data?.profile?.enabled && <div id="outreach-send-requirements" aria-live="polite" className="text-sm leading-6">
        {sendingRequirements.length > 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><p className="font-semibold">Before you can start sending:</p><ul className="mt-2 list-disc space-y-1 pl-5">{sendingRequirements.map(item => <li key={item.target}><a href={'#' + item.target} onClick={event => { event.preventDefault(); const element = document.getElementById(item.target); element?.scrollIntoView({ behavior: 'smooth', block: 'center' }); element?.focus() }} className="underline underline-offset-2">{item.text}</a></li>)}</ul></div> : <p className="text-slate-600">{busy ? 'Updating outreach…' : generating ? 'Waiting for email generation to finish…' : readingFiles ? 'Finishing your optional attachment upload…' : 'Ready to send from ' + (data?.senders.find(sender => sender.id === profile.senderId)?.email || 'your connected mailbox') + '.'}</p>}
      </div>}
    </form>
    <OutreachContactDirectory industryId={profile.industryId} />
    {data?.automation.enabled && data.counts.some(item => item.status === 'FAILED' && item.count > 0) && <button type="button" disabled={busy} onClick={retryFailed} className="rounded-xl border border-black/30 bg-white px-4 py-3 text-sm font-semibold">{busy ? 'Retrying...' : 'Retry failed contacts'}</button>}
  </div>
}
