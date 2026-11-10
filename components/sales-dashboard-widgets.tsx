import { salesStageLabel as stageLabel } from '@/lib/sales-stage-label'
const stageSteps = [
  { key: 'LEAD', label: 'Prospect' },
  { key: 'PROSPECT', label: 'Lead' },
  { key: 'CLIENT', label: 'Client' },
  { key: 'ONBOARDED', label: 'Onboarded' },
  { key: 'CAMPAIGN_SUCCESSFUL', label: 'Campaign live' },
] as const

export type SalesStageCounts = Record<(typeof stageSteps)[number]['key'], number>

export function SalesStageTracker({ counts }: { counts: SalesStageCounts }) {
  return (
    <section className="rounded-[24px] border-[1px] border-black/30 bg-white p-5 shadow-[0_8px_24px_rgba(7,18,31,0.04)] sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-serif text-lg font-semibold">Prospect journey</p><p className="mt-1 text-xs text-[#657286]">Track businesses from first contact to a successful campaign.</p></div>
        <span className="rounded-full bg-[#eee9f1] px-3 py-1.5 text-[10px] font-semibold text-[#30263f]">{Object.values(counts).reduce((sum, count) => sum + count, 0)} active records</span>
      </div>
      <div className="mt-7 grid grid-cols-5 items-start">
        {stageSteps.map((step, index) => {
          const count = counts[step.key]
          const active = count > 0
          return <div key={step.key} className="relative flex min-w-0 flex-col items-center text-center">
            {index < stageSteps.length - 1 && <span className={`absolute left-1/2 top-4 h-0.5 w-full ${active && counts[stageSteps[index + 1].key] > 0 ? 'bg-[#30263f]' : 'bg-[#d6deea]'}`} />}
            <span className={`relative z-10 flex size-8 items-center justify-center rounded-full border-[1px] text-xs font-bold ${active ? 'border-black/30 bg-[#30263f] text-white' : 'border-black/30 bg-white text-[#657286]'}`}>{count}</span>
            <span className="mt-2 text-[10px] font-semibold text-[#30263f] sm:text-xs">{step.label}</span>
            <span className="mt-1 text-[10px] text-[#657286]">{count} {count === 1 ? 'business' : 'businesses'}</span>
          </div>
        })}
      </div>
    </section>
  )
}

export type RecentLead = {
  businessName: string
  contactName: string | null
  industry: string | null
  stage: string
  outreachChannel: string | null
  outreachAt: string | null
  ownerName?: string | null
  ownerEmail?: string | null
}


export function RecentLeadRow({ lead }: { lead: RecentLead }) {
  return (
    <div className="flex flex-col gap-3 border-[1px] border-black/30 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#eee9f1] text-sm font-semibold text-[#30263f]">{lead.businessName.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0"><p className="truncate font-serif text-sm font-semibold">{lead.businessName}</p><p className="mt-1 truncate text-[11px] text-[#657286]">{lead.contactName || 'Contact not added'}{lead.industry ? ` · ${lead.industry}` : ''}{lead.ownerName ? ` · ${lead.ownerName}` : ''}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-3 pl-[52px] sm:pl-0">
        <span className="rounded-full bg-[#eee9f1] px-3 py-1.5 text-[10px] font-semibold text-[#30263f]">{stageLabel(lead.stage)}</span>
        <span className="text-[10px] text-[#657286]">{lead.outreachChannel ? lead.outreachChannel.replaceAll('_', ' ').toLowerCase() : 'No outreach logged'}</span>
        {lead.outreachAt && <time className="text-[10px] text-[#657286]">{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(lead.outreachAt))}</time>}
      </div>
    </div>
  )
}
