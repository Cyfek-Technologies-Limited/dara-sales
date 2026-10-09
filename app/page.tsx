'use client'

import Link from 'next/link'
import { ArrowUpRight, Check, Menu, Search, Sparkles, X } from 'lucide-react'

const popular = ['pipeline', 'forecasting', 'sales dashboard', 'crm', 'outreach', 'analytics']

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-[#17152f]">
      <header className="flex h-[76px] items-center justify-between px-5 sm:px-10 lg:px-12">
        <div className="flex items-center gap-7">
          <button aria-label="Open navigation" className="rounded-full p-2 hover:bg-[#f4f2f7] lg:hidden"><Menu /></button>
          <Link href="/" className="font-serif text-[29px] font-black italic tracking-[-0.09em]">Sequoia</Link>
          <nav className="hidden items-center gap-7 text-[14px] font-semibold lg:flex"><a href="#solutions">Solutions</a><a href="#resources">Resources</a><a href="#pricing">Pricing</a><a href="#company">Company</a></nav>
        </div>
        <div className="flex items-center gap-4 text-[14px] font-semibold"><Link href="/dashboard" className="hidden sm:block">Log in</Link><Link href="/dashboard" className="rounded-full bg-[#17152f] px-5 py-3 text-white">Get started</Link></div>
      </header>

      <section className="mx-5 rounded-[30px] bg-[#fff1f8] px-6 py-3 sm:mx-10 sm:px-7" aria-label="Product announcement"><div className="flex items-center gap-3 text-[13px] sm:text-[14px]"><Sparkles className="size-4 text-[#ea4c89]" /><span>Make every sales conversation count with Sequoia AI.</span><Link href="/dashboard" className="ml-auto hidden rounded-full bg-white px-5 py-2.5 text-[12px] font-bold shadow-sm sm:block">Get started</Link><button aria-label="Dismiss announcement" className="text-[#8d8495]"><X className="size-4" /></button></div></section>

      <section className="mx-auto grid max-w-[1320px] gap-10 px-6 pb-20 pt-12 sm:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16 lg:px-12 lg:pt-16">
        <div className="max-w-[610px]">
          <div className="mb-8 inline-flex rounded-full bg-[#f7f5f8] p-1 text-[12px] font-bold"><span className="rounded-full bg-white px-5 py-2 shadow-sm">SALES TEAMS</span><span className="px-5 py-2 text-[#756e81]">REVENUE LEADERS</span></div>
          <h1 className="text-[clamp(3.7rem,6.5vw,6.8rem)] font-extrabold leading-[0.98] tracking-[-0.075em]">Move every deal <span className="text-[#ea4c89]">forward.</span></h1>
          <ul className="mt-9 flex flex-col gap-4 text-[16px] text-[#484258]"><li className="flex items-center gap-3"><span className="flex size-5 items-center justify-center rounded-full bg-[#fff0f6] text-[#ea4c89]"><Check className="size-3" /></span>Turn scattered signals into clear next steps</li><li className="flex items-center gap-3"><span className="flex size-5 items-center justify-center rounded-full bg-[#fff0f6] text-[#ea4c89]"><Check className="size-3" /></span>See your entire pipeline at a glance</li><li className="flex items-center gap-3"><span className="flex size-5 items-center justify-center rounded-full bg-[#fff0f6] text-[#ea4c89]"><Check className="size-3" /></span>Close more with less busywork</li></ul>
          <Link href="/dashboard" className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#17152f] px-6 py-4 text-[14px] font-bold text-white">Open your workspace <ArrowUpRight className="size-4" /></Link>
        </div>

        <div className="relative overflow-hidden rounded-[28px] bg-[#19234b] p-3 shadow-[0_24px_70px_rgba(234,76,137,0.2)] sm:p-5"><div className="relative aspect-[1.32] overflow-hidden rounded-[20px] bg-[#27366c]"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sales%20sc-89awtesVRDzKknynXJfHqCkEJO9esQ.png" alt="Customer service representative in a sales workspace" className="absolute inset-0 size-full object-cover object-[50%_43%] mix-blend-screen opacity-90" /><div className="absolute inset-0 bg-gradient-to-tr from-[#19234b]/30 via-transparent to-[#ea4c89]/20" /><div className="absolute bottom-4 left-4 rounded-full bg-white/95 px-4 py-2 text-[12px] font-semibold shadow-lg">Live sales intelligence <span className="ml-2 text-[#ea4c89]">●</span></div></div></div>
      </section>

      <section className="border-t border-[#eeebf1] px-6 py-8 sm:px-10 lg:px-12"><div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-5 gap-y-3 text-[13px] text-[#655d73]"><span className="font-bold text-[#17152f]">Popular:</span>{popular.map((item) => <a href="#workspace" key={item} className="rounded-full bg-[#f7f5f8] px-3 py-1.5 hover:bg-[#fff0f6] hover:text-[#ea4c89]">{item}</a>)}<div className="ml-auto hidden items-center gap-2 sm:flex"><Search className="size-4" /> Browse the workspace</div></div></section>
    </main>
  )
}
