'use client'

import Link from 'next/link'
import { ArrowUpRight, LockKeyhole } from 'lucide-react'

const representative = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Professional%20Customer%20Service%20Representative-KuQFGu0UuUowzYnbFwwTkdTPaAf5eS.png'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#101010] text-[#f2ecd9]">
      <header className="flex h-12 items-center justify-between bg-[#f0ead7] px-8 text-[9px] font-medium tracking-[-0.01em] text-[#111] sm:px-12 lg:px-14">
        <Link href="/" className="flex items-center gap-1.5 font-sans font-bold tracking-[-0.08em]"><span className="text-[14px]">▰</span> / Sequoia.ai</Link>
        <nav className="hidden items-center gap-5 sm:flex"><a href="#product">Product</a><span>·</span><a href="#solutions">Solutions</a><span>·</span><a href="#pricing">Pricing</a><span>·</span><a href="#developers">Developers</a></nav>
        <div className="flex items-center gap-5"><Link href="/dashboard">Log in</Link><Link href="/dashboard" className="rounded-full bg-[#171717] px-4 py-2 text-[8px] text-white">Get it Now—It&apos;s Free</Link></div>
      </header>

      <section className="relative min-h-[calc(100vh-3rem)] overflow-hidden rounded-t-[10px] bg-[#101010] px-9 py-14 sm:px-14 lg:px-[8%] lg:py-[9vh]" aria-label="Sequoia sales pipeline">
        <div className="relative z-10 max-w-[430px] pt-2 lg:pt-[3vh]">
          <div className="flex items-start gap-3 text-[10px] leading-[1.1] text-[#f2ecd9]"><span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-[#f2ecd9] text-[#101010]"><LockKeyhole className="size-3" /></span><span><strong className="font-semibold">1.4M+ User</strong><br /><u className="text-[8px] underline-offset-2">Read Our Success Stories</u></span></div>
          <h1 className="mt-9 whitespace-nowrap font-serif text-[clamp(4.1rem,8vw,8.4rem)] font-normal leading-[0.78] tracking-[-0.09em] text-[#f2ecd9]">Sales pipeline</h1>
          <p className="mt-9 max-w-[290px] border-t border-white/[0.08] pt-4 text-[12px] leading-[1.55] text-[#aaa79d]">AI-powered sales intelligence that continuously monitors every opportunity, conversation, and next step.</p>
          <div className="mt-5 flex gap-3 text-[12px] text-[#d8d1bf]"><span>99.9% Success Rate for Sales</span><span>•</span><span>5.0</span></div>
          <div className="mt-5 border-t border-white/[0.08] pt-6"><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-[#ff5a32] px-4 py-2.5 text-[9px] font-medium text-white">Download—It&apos;s Free <ArrowUpRight className="size-3" /></Link><Link href="#pricing" className="ml-4 text-[8px] underline underline-offset-2">Our Pricing ↗</Link></div>
        </div>

        <div className="pointer-events-none absolute right-[-2%] top-[3%] h-[96%] w-[58%] min-w-[480px] max-w-[860px]">
          <img src={representative} alt="Customer service representative wearing a headset" className="absolute bottom-0 right-0 h-[108%] w-full max-w-none object-contain object-bottom drop-shadow-[0_28px_70px_rgba(255,90,50,0.28)]" />
        </div>
      </section>
    </main>
  )
}
