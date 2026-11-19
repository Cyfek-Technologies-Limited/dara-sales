'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Discovery = { enabled: boolean; location: string; targetContact: string; dailyTarget: number; addedToday: number; totalAdded: number; runsToday?: number; running?: boolean; lastRunAt?: string; nextRunAt?: string; lastMessage?: string }
export default function AutomaticProspecting() {
  const router = useRouter()
  const [data,setData] = useState<Discovery | null>(null)
  const [location,setLocation] = useState(''), [targetContact,setTargetContact] = useState('')
  const [dailyTarget,setDailyTarget] = useState(50), [busy,setBusy] = useState(false), [error,setError] = useState('')
  const [staff,setStaff] = useState(false), [configured,setConfigured] = useState(true)
  useEffect(() => {
    let alive = true, initial = true, total: number | undefined
    async function load() {
      try {
        const response = await fetch('/api/admin/prospecting/automation',{cache:'no-store'})
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Could not load automatic discovery.')
        if (!alive) return
        setData(result.discovery); setStaff(result.staff); setConfigured(result.configured); setError('')
        if (initial) { setLocation(result.discovery.location); setTargetContact(result.discovery.targetContact); setDailyTarget(result.discovery.dailyTarget); initial=false }
        if (total !== undefined && total !== result.discovery.totalAdded) router.refresh()
        total=result.discovery.totalAdded
      } catch (error) { if (alive) setError(error instanceof Error ? error.message : 'Could not load automatic discovery.') }
    }
    void load()
    const timer=setInterval(() => { if (document.visibilityState === 'visible') void load() },15000)
    return () => { alive=false; clearInterval(timer) }
  },[router])
  async function save(enabled: boolean) {
    if (busy) return
    setBusy(true);setError('')
    try {
      const response=await fetch('/api/admin/prospecting/automation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({enabled,location,targetContact,dailyTarget})})
      const result=await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save discovery settings.')
      setData(previous => previous ? {...previous,enabled,location,targetContact,dailyTarget,running:false,lastMessage:enabled?'Waiting for the scheduler.':'Automatic discovery paused.'}:previous)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save discovery settings.') }
    finally {setBusy(false)}
  }
  const field='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
  return <section className="mt-5 rounded-2xl border border-[#0b1f3a]/30 bg-white p-5 shadow-sm" aria-label="Automatic prospect discovery">
    <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Automatic prospect discovery</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{data?.enabled ? data.running ? 'Researching' : 'Scheduled' : 'Paused'}</span></div>
    <p className="mt-2 text-sm text-slate-600">Find and save businesses with public email or phone contacts across {staff?'your assigned':'your configured'} industries. Searches include public LinkedIn profiles, company websites and indexed social pages. {staff?'New prospects are assigned to you.':'New prospects are saved as unassigned.'}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="text-xs font-semibold">Target location<input disabled={busy || !data} value={location} onChange={e=>setLocation(e.target.value)} maxLength={160} placeholder="For example: Lagos, Nigeria" className={field}/></label>
      <label className="text-xs font-semibold">Role or team (optional)<input disabled={busy || !data} value={targetContact} onChange={e=>setTargetContact(e.target.value)} maxLength={120} placeholder="Procurement or maintenance" className={field}/></label>
      <label className="text-xs font-semibold">Daily target<select disabled={busy || !data} value={dailyTarget} onChange={e=>setDailyTarget(Number(e.target.value))} className={field}><option value={50}>Up to 50 new prospects</option><option value={100}>Up to 100 new prospects</option></select></label>
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-500">Runs in batches while you are away. Availability varies; targets are not guaranteed. Uses your configured OpenAI API and incurs usage charges, with a maximum of 30 research batches per day. New prospects with email may receive an already-approved automated outreach message.</p>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button disabled={busy || !data || !configured || !location.trim()} onClick={()=>void save(true)} className="rounded-xl bg-[#0b1f3a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?'Saving…':data?.enabled?'Save discovery settings':'Enable automatic discovery'}</button>{data?.enabled && <button disabled={busy} onClick={()=>void save(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">Pause</button>}<span className="text-xs text-slate-600">{data?.addedToday || 0} / {data?.dailyTarget || dailyTarget} saved today · {data?.totalAdded || 0} total</span></div>
    <div role="status" className="mt-3 text-xs text-slate-600">{data?.lastMessage}{data?.lastRunAt && <span> Last run: {new Date(data.lastRunAt).toLocaleString()}.</span>}{data?.enabled && !data.lastRunAt && <p>Waiting for the first scheduled batch. Discovery continues after you close this page.</p>}{data?.enabled && data.nextRunAt && <p>Next eligible batch: {new Date(data.nextRunAt).toLocaleString()}.</p>}{(data?.runsToday || 0)>=30 && <p>Daily research limit reached. Discovery resumes tomorrow.</p>}</div>
    {(!configured || error) && <p role="alert" className="mt-3 text-sm text-red-700">{error || 'Web research is not configured on the server.'}</p>}
  </section>
}
