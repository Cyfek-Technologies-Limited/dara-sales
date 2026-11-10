'use client'

import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, Radio, Search, RefreshCw, Mail, CheckCircle2, Clock3, CircleAlert } from 'lucide-react'

type Recipient = { email: string; businessName: string; contactName: string | null }
type Job = Recipient & { id: string; phone: string | null; contactJobTitle: string | null; contactDepartment: string | null; status: string; lastError: string | null; sentAt: string | null; updatedAt: string }
type Activity = { enabled: boolean; senderEmail: string | null; subject: string; counts: { status: string; count: number }[]; jobs: Job[]; totalRows: number; current: Recipient | null; next: Recipient | null; nextSendAt: string | null; dailyLimitReached: boolean; sentToday: number; serverTime: string }
const labels: Record<string,string> = { QUEUED: 'Queued', SENDING: 'Sending now', SENT: 'Mail server accepted', FAILED: 'Failed', UNKNOWN: 'Check mailbox', SKIPPED: 'Skipped', CANCELLED: 'Cancelled' }
const statusClass = (status: string) => status === 'SENT' ? 'bg-emerald-100 text-emerald-900' : status === 'SENDING' ? 'bg-blue-100 text-blue-900' : ['FAILED','UNKNOWN'].includes(status) ? 'bg-rose-100 text-rose-900' : 'bg-slate-100 text-slate-700'
const date = (value: string) => new Date(value).toLocaleString()

export default function OutreachLiveMonitor({ starting, refreshKey }: { starting: boolean; refreshKey: number }) {
  const [activity, setActivity] = useState<Activity | null>(null)
  const [error, setError] = useState('')
  const [workerError, setWorkerError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [now, setNow] = useState(Date.now())
  const [receivedAt, setReceivedAt] = useState(Date.now())
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const lastKick = useRef(0)
  const workerInFlight = useRef(false)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let cancelled = false
    async function poll() {
      if (document.visibilityState !== 'visible') { timer = setTimeout(poll, 3000); return }
      try {
        const params = new URLSearchParams({ page: String(page), search, status })
        const response = await fetch(`/api/admin/email-outreach/activity?${params}`, { cache: 'no-store', signal: controller.signal })
        const result: Activity & { error?: string } = await response.json()
        if (!response.ok) throw new Error(result.error || 'Could not refresh activity.')
        if (cancelled) return
        setActivity(result); setReceivedAt(Date.now()); setError('')
        // Keep the approved queue moving while this page is open. GET requests never send email.
        if (result.enabled && !workerInFlight.current && result.counts.some(item => ['QUEUED','SENDING'].includes(item.status) && item.count > 0) && Date.now() - lastKick.current >= 15000) {
          lastKick.current = Date.now()
          workerInFlight.current = true
          // Keep polling while SMTP runs; awaiting this request here hides the
          // SENDING transition until the message has already finished.
          void fetch('/api/admin/email-outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'process' }), signal: AbortSignal.timeout(90000) })
            .then(async kick => {
              const outcome = await kick.json().catch(() => ({}))
              if (cancelled) return
              if (!kick.ok) setWorkerError(outcome.error || 'The queue worker could not process emails. Retrying shortly.')
              else { setWorkerError(''); setRefresh(value => value + 1) }
            })
            .catch(() => { if (!cancelled) setWorkerError('The worker request timed out or lost its connection. Activity will keep updating; queued emails will be checked again.') })
            .finally(() => { workerInFlight.current = false })
        }
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Live updates interrupted.') }
      finally { if (!cancelled) { setLoading(false); timer = setTimeout(poll, 3000) } }
    }
    setLoading(true)
    const initial = setTimeout(poll, 200)
    return () => { cancelled = true; controller.abort(); clearTimeout(initial); clearTimeout(timer) }
  }, [page, search, status, refreshKey, refresh])

  const count = (key: string) => activity?.counts.find(item => item.status === key)?.count || 0
  const total = activity?.counts.reduce((sum, item) => sum + item.count, 0) || 0
  const pending = count('QUEUED') + count('SENDING')
  const finished = total - pending
  const progress = total ? Math.round(finished / total * 100) : 0
  const serverNow = activity ? new Date(activity.serverTime).getTime() + now - receivedAt : now
  const seconds = activity?.nextSendAt ? Math.max(0, Math.ceil((new Date(activity.nextSendAt).getTime() - serverNow) / 1000)) : 0
  const person = activity?.current || activity?.next
  const headline = starting ? 'Preparing your recipient queue...' : !activity ? 'Loading sending activity...' : !activity.enabled ? 'Sending is paused'
    : activity.current ? 'Sending an email now' : !total ? 'Waiting for eligible saved prospects' : !pending ? 'Queue processing finished'
    : activity.dailyLimitReached ? 'Daily sending limit reached' : seconds > 0 ? 'Waiting for the next sending slot' : 'Preparing the next email'

  return <section id="live-outreach" className="scroll-mt-6 space-y-5 rounded-2xl border-[1px] border-black/30 bg-white p-5 sm:p-6" aria-busy={starting || loading}>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8a509b]"><Radio className="size-4" />Live sending activity</p><h2 className="mt-2 text-xl font-bold" role="status">{headline}</h2><p className="mt-1 text-sm text-slate-600">{activity?.senderEmail ? <>Sending from <strong>{activity.senderEmail}</strong></> : 'Connect a mailbox and approve your message to begin.'}</p>{activity?.subject && <p className="mt-1 text-xs text-slate-500">Subject: {activity.subject}</p>}</div><button type="button" onClick={() => setRefresh(value => value + 1)} className="inline-flex items-center gap-2 text-sm font-semibold"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div>
    {(error || workerError) && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error || workerError} Displayed activity may be out of date.</p>}
    {starting && <p className="flex items-center gap-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-900"><LoaderCircle className="size-5 animate-spin" />Saving your approved message and preparing recipients. Emails will appear below as they are processed.</p>}
    {!!total && <div><div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span><strong>{finished}</strong> of <strong>{total}</strong> recipients processed</span><span>{progress}% processed</span></div><div role="progressbar" aria-label="Recipients processed" aria-valuenow={finished} aria-valuemin={0} aria-valuemax={total} className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-[#0b1f3a] to-[#8a509b] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs text-slate-500">Processed includes accepted, failed, skipped, and unconfirmed sends. It does not mean every email was delivered.</p></div>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[['QUEUED','Queued',Clock3],['SENDING','Sending now',Mail],['SENT','Server accepted',CheckCircle2],['FAILED','Failed',CircleAlert],['UNKNOWN','Needs checking',CircleAlert]].map(([key,title,Icon]) => {
      const StatusIcon = Icon as typeof Mail
      return <div key={String(key)} className="rounded-xl border border-black/15 p-3"><StatusIcon className="size-4 text-[#8a509b]" /><p className="mt-2 text-xs text-slate-500">{String(title)}</p><p className="mt-1 text-2xl font-bold">{count(String(key))}</p></div>
    })}</div>
    {activity?.enabled && person && <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">{activity.current ? <LoaderCircle className="mt-1 size-5 shrink-0 animate-spin text-blue-800" /> : <Clock3 className="mt-1 size-5 shrink-0 text-blue-800" />}<div className="min-w-0"><p className="text-xs font-semibold uppercase text-blue-800">{activity.current ? 'Sending to' : 'Next recipient'}</p><p className="mt-1 font-semibold">{person.contactName || 'Company contact'} · {person.businessName}</p><p className="break-all text-sm">{person.email}</p>{!activity.current && <p className="mt-2 text-xs text-slate-600">{activity.dailyLimitReached ? `Daily limit: ${activity.sentToday}/30. Next available slot: ${activity.nextSendAt ? date(activity.nextSendAt) : 'pending'}.` : seconds > 0 ? `Next eligible attempt in ${seconds}s. Sending is limited to one email per minute.` : 'Waiting for the queue worker. This page will keep trying while it is open.'}</p>}</div></div>}
    <p className="text-xs leading-5 text-slate-500">Updates about every 3 seconds while this page is visible. A server-accepted email is not a confirmed inbox delivery. Sending continues while this page is open; a configured server scheduler is required after you leave.</p>
    <div className="flex flex-wrap gap-3"><label className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-black/30 px-3"><Search className="size-4 text-slate-500" /><input aria-label="Search sending recipients" placeholder="Search company, email or phone" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="w-full bg-transparent py-2 text-sm outline-none" /></label><select aria-label="Filter sending status" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="rounded-lg border border-black/30 bg-white px-3 py-2 text-sm"><option value="ALL">All statuses</option>{Object.entries(labels).map(([key,value]) => <option key={key} value={key}>{value}</option>)}</select></div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Company','Email','Phone','Status','Details / time'].map(title => <th key={title} className="whitespace-nowrap px-3 py-3">{title}</th>)}</tr></thead><tbody>{activity?.jobs.map(job => <tr key={job.id} className={`border-t border-black/10 ${job.status === 'SENDING' ? 'bg-blue-50' : ''}`}><td className="min-w-40 px-3 py-4">{job.businessName}</td><td className="px-3 py-4"><a href={`mailto:${job.email}`} className="text-[#173b65]">{job.email}</a></td><td className="whitespace-nowrap px-3 py-4">{job.phone || 'Not listed'}</td><td className="px-3 py-4"><span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(job.status)}`}>{job.status === 'SENDING' && <LoaderCircle className="size-3 animate-spin" />}{labels[job.status] || job.status}</span></td><td className="min-w-52 px-3 py-4 text-xs leading-5 text-slate-600">{job.lastError || (job.status === 'SENT' ? 'Accepted by SMTP server; inbox delivery not confirmed.' : job.status === 'QUEUED' ? 'Waiting for its sending slot.' : job.status === 'SENDING' ? 'Connecting to the mailbox and sending this message.' : job.status === 'SKIPPED' ? 'Unsubscribed, outside the audience, or prospect changed.' : '')}<span className="mt-1 block text-slate-400">{date(job.sentAt || job.updatedAt)}</span></td></tr>)}</tbody></table>{!activity?.jobs.length && <p className="p-5 text-sm text-slate-500">{loading ? 'Loading recipients...' : search || status !== 'ALL' ? 'No recipients match these filters.' : 'No recipients queued for the current message yet. Saved prospects need a valid email address and must match your audience.'}</p>}</div>
    <div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span>{activity?.totalRows || 0} matching recipients · Page {page}</span><div className="flex gap-3"><button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)} className="rounded border border-black/20 px-3 py-2 disabled:opacity-40">Previous</button><button type="button" disabled={page * 25 >= (activity?.totalRows || 0)} onClick={() => setPage(value => value + 1)} className="rounded border border-black/20 px-3 py-2 disabled:opacity-40">Next</button></div></div>
  </section>
}
