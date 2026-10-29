'use client'

import { useState } from 'react'
import { ArrowUpRight, Check, X, Zap } from 'lucide-react'

const plans = [
  { id: 'TEAM', name: 'Team', price: '₦5,000', seats: '10–30 staff', description: 'For growing sales teams.' },
  { id: 'GROWTH', name: 'Growth', price: '₦7,000', seats: '31–100 staff', description: 'For established organizations.' },
  { id: 'CUSTOM', name: 'Custom', price: 'Talk to sales', seats: '100+ staff', description: 'Flexible limits and support.' },
]

export function UpgradePlanButton({ currentPlan = 'FREE' }: { currentPlan?: string }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')

  async function choose(plan: string) {
    if (plan === 'CUSTOM') {
      window.location.href = 'mailto:sales@Dara.example?subject=Custom Dara plan'
      return
    }
    setPending(plan)
    setError('')
    try {
      const response = await fetch('/api/billing/upgrade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error?.code ? `${data.error.code}: ${data.error.message}` : 'UPGRADE_FAILED: Could not start checkout.')
        return
      }
      window.location.assign(data.url)
    } catch {
      setError('NETWORK_ERROR: Could not connect to billing.')
    } finally {
      setPending('')
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#5366df] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(232,79,44,0.16)] transition hover:-translate-y-0.5 hover:bg-[#3548bd]"><Zap className="size-3.5" />Upgrade plan</button>
      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07121f]/20 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
        <div className="w-full max-w-2xl rounded-[24px] border border-[#d6deea] bg-[#ffffff] p-5 shadow-[0_24px_70px_rgba(20,34,28,0.2)] sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#5366df]">Workspace billing</p><h2 id="upgrade-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Choose your next plan</h2><p className="mt-1 text-sm text-[#657286]">You have reached the staff limit for your {currentPlan.toLowerCase()} plan.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close upgrade dialog" className="rounded-full border border-[#d6deea] p-2 text-[#657286] hover:bg-white"><X className="size-4" /></button></div>
          {error && <p role="alert" className="mt-4 rounded-xl border border-[#d6deea] bg-[#e9eef5] px-3 py-2 text-xs text-[#a83f28]">{error}</p>}
          <div className="mt-6 grid gap-3 md:grid-cols-3">{plans.map((plan) => <button key={plan.id} type="button" onClick={() => choose(plan.id)} disabled={Boolean(pending)} className="group rounded-2xl border border-[#d6deea] bg-white p-4 text-left transition hover:-translate-y-1 hover:border-[#a5f36c] hover:shadow-[0_12px_28px_rgba(20,34,28,0.08)] disabled:opacity-60"><div className="flex items-center justify-between"><span className="text-sm font-semibold">{plan.name}</span>{currentPlan === plan.id && <span className="rounded-full bg-[#e9eef5] px-2 py-1 text-[9px] font-bold text-[#5366df]">Current</span>}</div><p className="mt-4 text-xl font-semibold text-[#5366df]">{pending === plan.id ? 'Opening…' : plan.price}<span className="text-xs font-normal text-[#657286]">{plan.id === 'CUSTOM' ? '' : ' / month'}</span></p><p className="mt-1 text-xs font-medium text-[#596579]">{plan.seats}</p><p className="mt-2 min-h-8 text-[11px] leading-4 text-[#657286]">{plan.description}</p><span className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-[#5366df]">Select plan <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span></button>)}</div><div className="mt-5 flex items-center gap-2 text-[11px] text-[#657286]"><Check className="size-3.5 text-[#5366df]" /> Secure checkout powered by Stripe</div>
        </div>
      </div>}
    </div>
  )
}
