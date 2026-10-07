'use client'

import Link from 'next/link'
import { ArrowUpRight, LockKeyhole, Play } from 'lucide-react'

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
            <h1 className="max-w-[560px] font-serif text-[clamp(4.5rem,8.5vw,8.5rem)] font-normal leading-[0.8] tracking-[-0.09em] text-[#f1ead5]">Sales pipeline</h1>
            <div className="mt-8 max-w-[385px] border-t border-white/10 pt-5"><p className="text-[13px] leading-[1.55] text-[#aaa79d]">AI-powered sales intelligence that keeps every opportunity, conversation, and next step moving forward.</p><div className="mt-5 flex gap-3 text-[9px] text-[#d8d1bf]"><span>99.9% uptime</span><span>•</span><span>42% average win rate</span><span>•</span><span>5.0</span></div></div>
            <div className="mt-8 flex items-center gap-5"><Link href="/dashboard" className="rounded-full bg-[#ff5a32] px-4 py-2.5 text-[10px] font-semibold text-white">Download — It&apos;s Free <ArrowUpRight className="ml-1 inline size-3" /></Link><a href="#pricing" className="flex items-center gap-1 text-[10px] text-[#e2dac7]"><Play className="size-3 fill-current" /> Our Pricing <ArrowUpRight className="size-3" /></a></div>
          </div>

          <div className="relative min-h-[430px] sm:min-h-[540px] lg:min-h-[620px]">
            <div className="absolute inset-x-0 top-8 bottom-0 overflow-hidden rounded-[30px] border border-white/10 bg-[#171716] shadow-[0_28px_120px_rgba(255,90,50,0.24)]">
              <div className="absolute inset-0 bg-[#252525]" />
              <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sales%20sc-89awtesVRDzKknynXJfHqCkEJO9esQ.png" alt="Customer service professional wearing a headset inside a CRM sales interface" className="relative size-full object-cover object-center opacity-95" />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#101010]/35 via-transparent to-[#ff5a32]/10" />
            </div>
            <div className="absolute left-[-2%] top-0 rounded-lg bg-[#2b2b2a] px-4 py-3 text-[10px] text-[#eee7d5] shadow-[0_14px_40px_rgba(0,0,0,0.3)]"><span className="mr-2 inline-block size-2 rounded-full bg-[#ff5a32]" />24/7<br /><span className="pl-4 text-[9px] text-[#aaa79d]">Monitoring</span></div>
            <div className="absolute right-[-2%] top-28 rounded bg-[#292826] px-3 py-2 text-[10px] text-[#d7d0bb] shadow-[0_14px_40px_rgba(0,0,0,0.3)]">Sales pipeline <span className="ml-2 text-[#72cc7c]">● ACTIVE</span></div>
            <div className="absolute bottom-10 left-[8%] right-[8%] rounded-2xl border border-white/10 bg-[#222220]/95 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.3)]"><div className="rounded-xl bg-[#444039] px-4 py-3 text-[11px] text-[#e9e2d2]">Live opportunity signals...</div><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-lg bg-[#3a3833] p-3 text-center text-[10px] text-[#d4cdbb]">Qualified leads</div><div className="rounded-lg bg-[#3a3833] p-3 text-center text-[10px] text-[#d4cdbb]">Deal momentum</div><div className="rounded-lg bg-[#3a3833] p-3 text-center text-[10px] text-[#d4cdbb]">Revenue forecast</div></div></div>
          </div>
        </div>
      </section>
    </main>
  )
}
