'use client'

import Link from 'next/link'
import { ArrowUpRight, Database, LockKeyhole, Network, Play, Sparkles } from 'lucide-react'

const logos = ['Northstar', 'Lattice', 'Monday.com', 'Arc', 'Dropbox']

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#151514] text-[#f5efdc]">
      <div className="min-h-screen bg-[#f1ead5] px-3 py-3 text-[#171716] sm:px-8 sm:py-8">
        <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[20px] bg-[#f1ead5]">
          <nav className="flex items-center justify-between px-3 py-4 sm:px-8 sm:py-5">
            <Link href="/" className="flex items-center gap-2 text-[11px] font-bold tracking-[-0.03em]"><span className="flex size-4 items-center justify-center rounded-[3px] bg-[#171716] text-[9px] text-[#f1ead5]">S</span> / sequoia.ai</Link>
            <div className="hidden items-center gap-6 text-[11px] font-medium sm:flex"><a href="#product">Product</a><a href="#solutions">Solutions</a><a href="#pricing">Pricing</a><a href="#developers">Developers</a></div>
            <div className="flex items-center gap-2 text-[11px] font-semibold"><Link href="/dashboard" className="hidden px-3 py-2 sm:block">Log in</Link><Link href="/dashboard" className="rounded-full bg-[#171716] px-4 py-2.5 text-[10px] text-[#f1ead5] transition hover:bg-[#ff5a32]">Get it now — It&apos;s free</Link></div>
          </nav>

          <section id="product" className="relative overflow-hidden rounded-[14px] bg-[#101010] px-6 py-12 sm:px-9 sm:py-14 lg:min-h-[540px] lg:px-9 lg:py-16">
            <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
              <div>
                <div className="mb-8 flex items-center gap-3 text-[10px] font-medium text-[#d7d0bb]"><span className="flex size-6 items-center justify-center rounded-full bg-[#f1ead5] text-[#171716]"><LockKeyhole className="size-3" /></span><span><strong className="block text-[11px] text-[#f7f0dd]">5,000+ sales teams</strong><u>Read our success stories</u></span></div>
                <h1 className="max-w-[510px] text-[clamp(4.2rem,9vw,7.4rem)] font-normal leading-[0.82] tracking-[-0.085em] text-[#f1ead5]">Pipeline</h1>
                <div className="mt-8 max-w-[360px] border-t border-white/10 pt-5"><p className="text-sm leading-6 text-[#aaa79d]">AI-powered sales intelligence that continuously monitors every deal, conversation, and next step.</p><div className="mt-5 flex flex-wrap gap-4 text-[10px] text-[#d8d1bf]"><span>99.9% uptime</span><span>•</span><span>42% average win rate</span></div></div>
                <div className="mt-7 flex items-center gap-5"><Link href="/dashboard" className="rounded-full bg-[#ff5a32] px-5 py-3 text-[11px] font-semibold text-white transition hover:bg-[#ff734f]">Download — It&apos;s free <ArrowUpRight className="ml-1 inline size-3" /></Link><a href="#solutions" className="flex items-center gap-2 text-[11px] text-[#e2dac7]"><Play className="size-3 fill-current" /> Our pricing <ArrowUpRight className="size-3" /></a></div>
              </div>

              <div className="relative min-h-[320px] sm:min-h-[390px]">
                <div className="absolute inset-x-3 top-10 bottom-0 rounded-[28px] border border-white/10 bg-[#1c1c1b] shadow-[0_20px_80px_rgba(255,90,50,0.12)]" />
                <div className="absolute right-[22%] top-0 flex size-36 items-center justify-center bg-[#ff5a32] shadow-[0_0_0_12px_rgba(255,90,50,0.1)] [clip-path:polygon(50%_0%,88%_22%,86%_63%,72%_87%,50%_100%,28%_87%,14%_63%,12%_22%)] sm:size-48"><div className="text-center text-white"><p className="text-3xl font-semibold">80</p><p className="text-[10px] uppercase tracking-[0.2em]">Level 1</p></div></div>
                <div className="absolute left-0 top-8 rounded-lg bg-[#2b2b2a] px-4 py-3 text-[10px] text-[#eee7d5]"><span className="mr-2 inline-block size-2 rounded-full bg-[#ff5a32]" />24/7<br /><span className="pl-4 text-[9px] text-[#aaa79d]">Monitoring</span></div>
                <div className="absolute right-[1%] top-28 rounded bg-[#292826] px-3 py-2 text-[10px] text-[#d7d0bb]">Firewall <span className="ml-2 text-[#72cc7c]">● ACTIVE</span></div>
                <div className="absolute bottom-8 left-[8%] right-[4%] rounded-2xl border border-white/10 bg-[#292826] p-3"><div className="rounded-xl bg-[#444039] px-4 py-3 text-[11px] text-[#e9e2d2]"><Sparkles className="mr-2 inline size-3.5 text-[#ff5a32]" /> Configuring sales workflows...</div><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-lg bg-[#3a3833] p-3 text-center text-[10px] text-[#d4cdbb]"><LockKeyhole className="mx-auto mb-1 size-4" />Secure coding</div><div className="rounded-lg bg-[#3a3833] p-3 text-center text-[10px] text-[#d4cdbb]"><Network className="mx-auto mb-1 size-4" />Network security</div><div className="rounded-lg bg-[#3a3833] p-3 text-center text-[10px] text-[#d4cdbb]"><Database className="mx-auto mb-1 size-4" />Data security</div></div></div>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-5 px-6 py-5 sm:px-10">{logos.map((logo) => <span key={logo} className="text-sm font-bold tracking-tight text-[#171716] sm:text-base">{logo}</span>)}</div>
        </div>
      </div>
    </main>
  )
}
