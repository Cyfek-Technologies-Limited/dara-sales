'use client'

import Link from 'next/link'
import { ArrowUpRight, Database, LockKeyhole, Network, Play, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#101010] text-[#f1ead5]">
      <nav className="flex min-h-[48px] items-center justify-between bg-[#f1ead5] px-6 py-3 text-[10px] font-medium text-[#171716] sm:px-9 lg:px-12">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-[-0.04em]"><span className="flex size-3.5 items-center justify-center rounded-[2px] bg-[#171716] text-[8px] text-[#f1ead5]">S</span>/ sequoia.ai</Link>
        <div className="hidden items-center gap-5 sm:flex"><a href="#product">Product</a><span>·</span><a href="#solutions">Solutions</a><span>·</span><a href="#pricing">Pricing</a><span>·</span><a href="#developers">Developers</a></div>
        <div className="flex items-center gap-4"><Link href="/dashboard" className="hidden sm:block">Log in</Link><Link href="/dashboard" className="rounded-full bg-[#171716] px-4 py-2 text-[9px] text-[#f1ead5]">Get it now — It&apos;s free</Link></div>
      </nav>

      <section id="product" className="relative min-h-[calc(100vh-48px)] overflow-hidden rounded-t-[10px] bg-[#101010] px-9 py-14 sm:px-12 sm:py-16 lg:px-[5%] lg:py-[8vh]">
        <div className="mx-auto grid max-w-[1220px] items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative z-10">
            <div className="mb-8 flex items-center gap-3 text-[9px] text-[#d7d0bb]"><span className="flex size-6 items-center justify-center rounded-full bg-[#f1ead5] text-[#171716]"><LockKeyhole className="size-3" /></span><span><strong className="block text-[10px] text-[#f7f0dd]">5,000+ Sales Teams</strong><u>Read our success stories</u></span></div>
            <h1 className="max-w-[560px] font-serif text-[clamp(5.2rem,10vw,9.5rem)] font-normal leading-[0.78] tracking-[-0.09em] text-[#f1ead5]">Pipeline</h1>
            <div className="mt-8 max-w-[385px] border-t border-white/10 pt-5"><p className="text-[13px] leading-[1.55] text-[#aaa79d]">AI-powered sales intelligence that continuously monitors every deal, conversation, and next step.</p><div className="mt-5 flex gap-3 text-[9px] text-[#d8d1bf]"><span>99.9% uptime</span><span>•</span><span>42% average win rate</span><span>•</span><span>5.0</span></div></div>
            <div className="mt-8 flex items-center gap-5"><Link href="/dashboard" className="rounded-full bg-[#ff5a32] px-4 py-2.5 text-[10px] font-semibold text-white">Download — It&apos;s Free <ArrowUpRight className="ml-1 inline size-3" /></Link><a href="#pricing" className="flex items-center gap-1 text-[10px] text-[#e2dac7]"><Play className="size-3 fill-current" /> Our Pricing <ArrowUpRight className="size-3" /></a></div>
          </div>

          <div className="relative min-h-[360px] sm:min-h-[430px] lg:min-h-[500px]">
            <div className="absolute inset-x-2 top-16 bottom-0 rounded-[28px] border border-white/10 bg-[#171716] shadow-[0_20px_100px_rgba(255,90,50,0.1)]" />
            <div className="absolute right-[18%] top-2 flex size-40 items-center justify-center bg-[#ff5a32] shadow-[0_0_0_12px_rgba(255,90,50,0.08)] [clip-path:polygon(50%_0%,88%_22%,86%_63%,72%_87%,50%_100%,28%_87%,14%_63%,12%_22%)] sm:size-52"><div className="text-center text-white"><p className="text-3xl font-semibold">80</p><p className="text-[10px] uppercase tracking-[0.2em]">Level 1</p></div></div>
            <div className="absolute left-0 top-10 rounded-lg bg-[#2b2b2a] px-4 py-3 text-[10px] text-[#eee7d5]"><span className="mr-2 inline-block size-2 rounded-full bg-[#ff5a32]" />24/7<br /><span className="pl-4 text-[9px] text-[#aaa79d]">Monitoring</span></div>
            <div className="absolute right-0 top-32 rounded bg-[#292826] px-3 py-2 text-[10px] text-[#d7d0bb]">Pipeline <span className="ml-2 text-[#72cc7c]">● ACTIVE</span></div>
            <div className="absolute bottom-8 left-[7%] right-0 rounded-2xl border border-white/10 bg-[#222220] p-3"><div className="rounded-xl bg-[#444039] px-4 py-3 text-[11px] text-[#e9e2d2]"><Sparkles className="mr-2 inline size-3.5 text-[#ff5a32]" /> Reviewing opportunities...</div><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-lg bg-[#3a3833] p-3 text-center text-[10px] text-[#d4cdbb]"><LockKeyhole className="mx-auto mb-1 size-4" />Lead scoring</div><div className="rounded-lg bg-[#3a3833] p-3 text-center text-[10px] text-[#d4cdbb]"><Network className="mx-auto mb-1 size-4" />Deal signals</div><div className="rounded-lg bg-[#3a3833] p-3 text-center text-[10px] text-[#d4cdbb]"><Database className="mx-auto mb-1 size-4" />Revenue data</div></div></div>
          </div>
        </div>
      </section>
    </main>
  )
}
