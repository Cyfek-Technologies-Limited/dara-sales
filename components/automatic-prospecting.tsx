'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Discovery = { enabled: boolean; location: string; locations?: string[]; targetContact: string; dailyTarget: number; addedToday: number; totalAdded: number; runsToday?: number; running?: boolean; lastRunAt?: string; nextRunAt?: string; lastMessage?: string; progress?: { location?: string; phase?: string; message?: string; company?: string; checked?: number; total?: number } }
export default function AutomaticProspecting() {
  const router = useRouter()
  const [data,setData] = useState<Discovery | null>(null)
  const [locations,setLocations] = useState<string[]>(['']), [targetContact,setTargetContact] = useState('')
  const [dailyTarget,setDailyTarget] = useState(50), [busy,setBusy] = useState(false), [error,setError] = useState('')
  const [staff,setStaff] = useState(false), [configured,setConfigured] = useState(true)
  useEffect(() => {
    let alive = true, initial = true, loading = false, version: string | undefined
    async function load() {
      if (loading) return
      loading = true
      try {
        const response = await fetch('/api/admin/prospecting/automation',{cache:'no-store',signal:AbortSignal.timeout(10000)})
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Could not load automatic discovery.')
        if (!alive) return
        setData(result.discovery); setStaff(result.staff); setConfigured(result.configured); setError('')
        if (initial) { setLocations(result.discovery.locations?.length ? result.discovery.locations : [result.discovery.location || '']); setTargetContact(result.discovery.targetContact); setDailyTarget(result.discovery.dailyTarget); initial=false }
        const nextVersion = `${result.discovery.totalAdded}:${result.discovery.lastMessage}`
        if (version !== undefined && version !== nextVersion && !result.discovery.running) router.refresh()
        version=nextVersion
      } catch (error) { if (alive) setError(error instanceof Error ? error.message : 'Could not load automatic discovery.') }
      finally { loading=false }
    }
    void load()
    const onVisible=() => { if (document.visibilityState === 'visible') void load() }
    const timer=setInterval(onVisible,3000)
    document.addEventListener('visibilitychange',onVisible)
    return () => { alive=false; clearInterval(timer); document.removeEventListener('visibilitychange',onVisible) }
  },[router])
  async function save(enabled: boolean) {
    if (busy) return
    setBusy(true);setError('')
    try {
      const response=await fetch('/api/admin/prospecting/automation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({enabled,locations,targetContact,dailyTarget})})
      const result=await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save discovery settings.')
      setData(previous => previous ? {...previous,enabled,locations:locations.filter(value=>value.trim()),location:locations.find(value=>value.trim()) || '',targetContact,dailyTarget,running:false,progress:{},nextRunAt:new Date().toISOString(),lastMessage:enabled?'Waiting for the scheduler.':'Automatic discovery paused.'}:previous)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save discovery settings.') }
    finally {setBusy(false)}
  }
  const field='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
  const progress=data?.progress
  const percent=Math.min(100,Math.round((data?.addedToday || 0)/(data?.dailyTarget || dailyTarget)*100))
  const limitReached=(data?.runsToday || 0)>=30
  const title=!data?.enabled?'Discovery paused':data.running
    ? progress?.phase==='CONTACTS'?'Checking contact details':progress?.phase==='SAVING'?'Saving prospects':'Finding businesses'
    : percent>=100?'Daily target reached':limitReached?'Daily search limit reached':progress?.phase==='ERROR'?'Waiting to retry':'Waiting for the next search'
  return <section className="mt-5 rounded-2xl border border-[#0b1f3a]/30 bg-white p-5 shadow-sm" aria-label="Automatic prospect discovery">
    <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Automatic prospect discovery</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{data?.enabled ? data.running ? 'Researching' : 'Scheduled' : 'Paused'}</span></div>
    <p className="mt-2 text-sm text-slate-600">Find and save businesses with public email or phone contacts across {staff?'your assigned':'your configured'} industries. Searches include public LinkedIn profiles, company websites and indexed social pages. {staff?'New prospects are assigned to you.':'New prospects are saved as unassigned.'}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <fieldset className="min-w-0 space-y-2"><legend className="text-xs font-semibold">Target locations</legend>{locations.map((location,index)=><div key={index} className="flex items-center gap-2"><input aria-label={`Target location ${index+1}`} disabled={busy || !data} value={location} onChange={e=>setLocations(values=>values.map((value,i)=>i===index?e.target.value:value))} maxLength={160} placeholder="For example: Lagos, Nigeria" className={field}/>{locations.length>1 && <button type="button" disabled={busy || !data} aria-label={`Remove location ${index+1}`} onClick={()=>setLocations(values=>values.filter((_,i)=>i!==index))} className="mt-1 rounded-lg px-2 py-2 text-slate-500 hover:bg-slate-100 hover:text-red-700">×</button>}</div>)}<button type="button" disabled={busy || !data || locations.length>=20} onClick={()=>setLocations(values=>[...values,''])} className="text-xs font-semibold text-[#173b65] hover:underline disabled:opacity-50">+ Add location</button><p className="text-[11px] font-normal text-slate-500">Discovery rotates through these locations. The daily target covers all locations combined.</p></fieldset>
      <label className="text-xs font-semibold">Role or team (optional)<input disabled={busy || !data} value={targetContact} onChange={e=>setTargetContact(e.target.value)} maxLength={120} placeholder="Procurement or maintenance" className={field}/></label>
      <label className="text-xs font-semibold">Daily target<select disabled={busy || !data} value={dailyTarget} onChange={e=>setDailyTarget(Number(e.target.value))} className={field}><option value={50}>Up to 50 new prospects</option><option value={100}>Up to 100 new prospects</option></select></label>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button disabled={busy || !data || !configured || !locations.some(value=>value.trim())} onClick={()=>void save(true)} className="rounded-xl bg-[#0b1f3a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?'Saving…':data?.enabled?'Save discovery settings':'Enable automatic discovery'}</button>{data?.enabled && <button disabled={busy} onClick={()=>void save(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">Pause</button>}<span className="text-xs text-slate-600">{data?.addedToday || 0} / {data?.dailyTarget || dailyTarget} saved today · {data?.totalAdded || 0} total</span></div>
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2"><span className={`size-2 rounded-full ${data?.running?'bg-violet-600 motion-safe:animate-pulse':'bg-slate-400'}`} /><h3 className="text-sm font-semibold">{title}</h3><span className="ml-auto text-xs tabular-nums">{percent}% of daily target</span></div>
      <div role="progressbar" aria-label="Prospects saved toward daily target" aria-valuemin={0} aria-valuemax={data?.dailyTarget || dailyTarget} aria-valuenow={Math.min(data?.addedToday || 0,data?.dailyTarget || dailyTarget)} aria-valuetext={`${data?.addedToday || 0} of ${data?.dailyTarget || dailyTarget} prospects saved today`} className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#0b1f3a] transition-[width] duration-500" style={{width:`${percent}%`}} /></div>
      <div role="status" aria-live="polite" className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
        <p>{data?.running?progress?.message || 'Preparing the next industry search.':data?.lastMessage || 'Enable discovery to start finding prospects automatically.'}</p>
        {data?.running && progress?.location && <p>Location: <strong>{progress.location}</strong></p>}
        {data?.running && progress?.company && <p className="font-semibold text-[#0b1f3a]">Checking: {progress.company}</p>}
        {data?.running && progress?.phase==='CONTACTS' && <><p>{progress.checked || 0} of {progress.total || 0} businesses checked in this batch</p><div role="progressbar" aria-label="Contact checks in current batch" aria-valuemin={0} aria-valuemax={Math.max(1,progress.total || 0)} aria-valuenow={progress.checked || 0} className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-violet-600 transition-[width]" style={{width:`${progress.total?(progress.checked || 0)/progress.total*100:0}%`}}/></div></>}
        {data?.enabled && !data.running && data.nextRunAt && !limitReached && percent<100 && <p>Next eligible search: {new Date(data.nextRunAt).toLocaleString()}.</p>}
        {data?.lastRunAt && <p>Last batch started: {new Date(data.lastRunAt).toLocaleString()}.</p>}
        {data?.enabled && (limitReached || percent>=100) && <p>Automatic discovery resumes tomorrow.</p>}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Activity updates every 3 seconds. Discovery continues when you leave this page.</p>
    </div>
    {(!configured || error) && <p role="alert" className="mt-3 text-sm text-red-700">{error || 'Web research is not configured on the server.'}</p>}
  </section>
}
