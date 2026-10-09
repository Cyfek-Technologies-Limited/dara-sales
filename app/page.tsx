'use client'

import Link from 'next/link'
import { ArrowUpRight, LockKeyhole, Play } from 'lucide-react'

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
          <h1 className="mt-9 font-serif text-[clamp(5rem,11vw,9.2rem)] font-normal leading-[0.78] tracking-[-0.09em] text-[#f2ecd9]">Sales<br />pipeline</h1>
          <p className="mt-9 max-w-[290px] border-t border-white/[0.08] pt-4 text-[12px] leading-[1.55] text-[#aaa79d]">AI-powered sales intelligence that continuously monitors every opportunity, conversation, and next step.</p>
          <div className="mt-5 flex gap-3 text-[8px] text-[#d8d1bf]"><span>99.9% Success Rate for Sales</span><span>•</span><span>5.0</span></div>
          <div className="mt-5 border-t border-white/[0.08] pt-6"><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-[#ff5a32] px-4 py-2.5 text-[9px] font-medium text-white">Download—It&apos;s Free <ArrowUpRight className="size-3" /></Link><Link href="#pricing" className="ml-4 text-[8px] underline underline-offset-2">Our Pricing ↗</Link></div>
        </div>

        <div className="absolute right-[4%] top-[5%] h-[88%] w-[53%] min-w-[430px] max-w-[760px]">
          <div className="absolute inset-x-0 bottom-0 top-16 overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#1b1b1a] shadow-[0_30px_120px_rgba(255,90,50,0.2)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_28%,rgba(255,90,50,0.2),transparent_30%),linear-gradient(135deg,#252424,#111)]" />
            <img src={representative} alt="Customer service representative wearing a headset" className="absolute bottom-[-12%] left-[18%] h-[114%] w-[70%] max-w-none object-contain object-bottom" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#101010]/65 via-transparent to-transparent" />
            <div className="absolute bottom-7 left-[7%] right-[7%] rounded-2xl border border-white/10 bg-[#222220]/95 p-3"><div className="rounded-xl bg-[#444039] px-4 py-3 text-[10px] text-[#e9e2d2]"><span className="mr-2 inline-flex size-4 items-center justify-center rounded-full bg-[#ff5a32] align-middle"><Play className="size-2.5 fill-white text-white" /></span>Connecting sales conversations...</div><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-lg bg-[#3a3833] p-3 text-center text-[9px] text-[#d4cdbb]">Lead scoring</div><div className="rounded-lg bg-[#3a3833] p-3 text-center text-[9px] text-[#d4cdbb]">Deal signals</div><div className="rounded-lg bg-[#3a3833] p-3 text-center text-[9px] text-[#d4cdbb]">Revenue data</div></div></div>
          </div>
          <div className="absolute left-[-5%] top-8 rounded-lg bg-[#2b2b2a] px-4 py-3 text-[10px] text-[#eee7d5] shadow-xl"><span className="mr-2 inline-block size-2 rounded-full bg-[#ff5a32]" />24/7<br /><span className="pl-4 text-[9px] text-[#aaa79d]">Monitoring</span></div>
          <div className="absolute right-[-3%] top-[31%] rounded bg-[#292826] px-3 py-2 text-[9px] text-[#d7d0bb]">Sales pipeline <span className="ml-2 text-[#72cc7c]">● ACTIVE</span></div>
        </div>
      </section>
    </main>
  )
}
