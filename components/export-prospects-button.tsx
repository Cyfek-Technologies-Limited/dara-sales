'use client'
import { useRef, useState } from 'react'
import { Download, LoaderCircle } from 'lucide-react'
import type { AdminLead } from '@/components/admin-leads-list'

export default function ExportProspectsButton({leads,organization,status}:{leads:AdminLead[];organization:string;status:string}) {
  const [busy,setBusy]=useState(false), [error,setError]=useState(''), [scope,setScope]=useState('CURRENT')
  const active=useRef(false)
  const rows=scope==='ALL'?leads:leads.filter(lead=>lead.contactStatus===status)
  async function download() {
    if(active.current || !rows.length)return
    active.current=true;setBusy(true);setError('')
    try {
      const {buildProspectWorkbook}=await import('@/lib/prospect-excel')
      const buffer=await buildProspectWorkbook(rows,organization,scope==='ALL'?'All statuses':`Status: ${status.toLowerCase()}`)
      const blob=new Blob([new Uint8Array(buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
      const url=URL.createObjectURL(blob)
      const link=document.createElement('a')
      link.href=url;link.download=`dara-businesses-${scope==='ALL'?'all':status.toLowerCase()}-${new Date().toISOString().slice(0,10)}.xlsx`
      document.body.appendChild(link);link.click();link.remove()
      setTimeout(()=>URL.revokeObjectURL(url),10000)
    } catch {setError('Could not create the Excel file. Please retry.')}
    finally {active.current=false;setBusy(false)}
  }
  return <div><div className="flex flex-wrap items-center gap-2">
    <select aria-label="Businesses to export" disabled={busy} value={scope} onChange={event=>setScope(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"><option value="CURRENT">Current status</option><option value="ALL">All statuses</option></select>
    <button type="button" disabled={busy || !rows.length} onClick={()=>void download()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#0b1f3a] hover:bg-slate-50 disabled:opacity-50">{busy?<LoaderCircle className="size-4 animate-spin"/>:<Download className="size-4"/>}{busy?'Preparing Excel…':`Export to Excel (${rows.length})`}</button>
  </div>{error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}</div>
}
