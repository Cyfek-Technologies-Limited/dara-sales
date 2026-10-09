'use client'

import Link from 'next/link'
import { ArrowUpRight, BarChart3, Check, Gauge, MessageSquareText, Users } from 'lucide-react'

const representative = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Professional%20Customer%20Service%20Representative-KuQFGu0UuUowzYnbFwwTkdTPaAf5eS.png'

const workflow = [
  { number: '01', title: 'Capture every signal', text: 'Bring conversations, activities, and opportunities into one clear view.' },
  { number: '02', title: 'Prioritize the next move', text: 'Let AI surface the deals and follow-ups that deserve attention now.' },
  { number: '03', title: 'Grow the whole team', text: 'Coach with real performance data and repeat what works.' },
]

const benefits = [
  { icon: MessageSquareText, title: 'One place for every conversation', text: 'Give reps the context they need before every call, email, and handoff.' },
  { icon: Gauge, title: 'Momentum you can see', text: 'Spot stalled deals early and keep the pipeline moving with confidence.' },
  { icon: Users, title: 'A stronger sales team', text: 'Understand how your team works, then turn top-performer habits into shared systems.' },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f0ead7] text-[#171717]">
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between bg-[#f0ead7] px-8 text-[9px] font-medium tracking-[-0.01em] sm:px-12 lg:px-14">
        <Link href="/" className="flex items-center gap-1.5 font-sans font-bold tracking-[-0.08em]"><span className="text-[14px]">▰</span> / Sequoia.ai</Link>
        <nav className="hidden items-center gap-5 sm:flex"><a href="#product">Product</a><span>·</span><a href="#solutions">Solutions</a><span>·</span><a href="#workflow">Workflow</a><span>·</span><a href="#pricing">Pricing</a></nav>
        <div className="flex items-center gap-5"><Link href="/dashboard">Log in</Link><Link href="/dashboard" className="rounded-full bg-[#171717] px-4 py-2 text-[8px] text-white">Get it Now—It&apos;s Free</Link></div>
      </header>

      <section id="product" className="relative min-h-[calc(100vh-3rem)] overflow-hidden rounded-t-[10px] bg-[#101010] px-9 py-14 text-[#f2ecd9] sm:px-14 lg:px-[8%] lg:py-[9vh]" aria-label="Sequoia sales pipeline">
        <div className="relative z-10 max-w-[470px] pt-10 lg:pt-[3vh]">
          <div className="flex items-center gap-2 text-[10px] font-medium"><span className="inline-flex size-5 items-center justify-center rounded-full bg-[#f2ecd9] text-[#101010]">✦</span><span>Built for teams that want to close with clarity</span></div>
          <h1 className="mt-9 whitespace-nowrap font-serif text-[clamp(4.1rem,8vw,8.4rem)] font-normal leading-[0.78] tracking-[-0.09em]">Sales pipeline</h1>
          <p className="mt-9 max-w-[300px] border-t border-white/[0.08] pt-4 text-[12px] leading-[1.55] text-[#aaa79d]">AI-powered sales intelligence that continuously monitors every opportunity, conversation, and next step.</p>
          <div className="mt-5 flex gap-3 text-[12px] text-[#d8d1bf]"><span>99.9% Success Rate for Sales</span><span>•</span><span>5.0</span></div>
          <div className="mt-5 border-t border-white/[0.08] pt-6"><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-[#ff5a32] px-4 py-2.5 text-[9px] font-medium text-white">Start for free <ArrowUpRight className="size-3" /></Link><Link href="#pricing" className="ml-4 text-[8px] underline underline-offset-2">See how it works ↗</Link></div>
        </div>
        <div className="pointer-events-none absolute right-[-2%] top-[3%] h-[96%] w-[58%] min-w-[480px] max-w-[860px]"><img src={representative} alt="Customer service representative wearing a headset" className="absolute bottom-0 right-0 h-[100%] w-full max-w-none object-contain object-bottom drop-shadow-[0_28px_70px_rgba(255,90,50,0.28)]" /></div>
      </section>

      <section id="solutions" className="bg-[#f0ead7] px-8 py-24 sm:px-14 lg:px-[10%] lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end"><div><p className="text-[10px] uppercase tracking-[0.18em] text-[#ff5a32]">Why Sequoia</p><h2 className="mt-5 max-w-[560px] font-serif text-5xl font-normal leading-[0.9] tracking-[-0.06em] sm:text-7xl">Your team is already selling. Make every move count.</h2></div><p className="max-w-[390px] text-sm leading-7 text-[#625f56]">Sequoia gives sales leaders a living picture of the business and gives every rep a clearer path to their next win. Less guesswork. Better coaching. More revenue.</p></div>
        <div className="mt-20 grid gap-px overflow-hidden rounded-2xl bg-[#cfc7b3] md:grid-cols-3">{benefits.map(({ icon: Icon, title, text }) => <article key={title} className="bg-[#f0ead7] p-8"><Icon className="size-5 text-[#ff5a32]" /><h3 className="mt-16 max-w-[220px] font-serif text-3xl leading-none tracking-[-0.04em]">{title}</h3><p className="mt-5 text-sm leading-6 text-[#625f56]">{text}</p></article>)}</div>
      </section>

      <section id="workflow" className="bg-[#101010] px-8 py-24 text-[#f2ecd9] sm:px-14 lg:px-[10%] lg:py-32"><div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="text-[10px] uppercase tracking-[0.18em] text-[#ff5a32]">The workflow</p><h2 className="mt-5 max-w-[420px] font-serif text-5xl font-normal leading-[0.9] tracking-[-0.06em] sm:text-7xl">From first signal to closed deal.</h2><p className="mt-8 max-w-[330px] text-sm leading-6 text-[#aaa79d]">A simple operating rhythm for modern sales teams—powered by the data you already create every day.</p></div><div className="divide-y divide-white/10 border-y border-white/10">{workflow.map((item) => <div key={item.number} className="grid gap-5 py-8 sm:grid-cols-[70px_1fr_1fr]"><span className="font-serif text-3xl text-[#ff5a32]">{item.number}</span><h3 className="font-serif text-3xl leading-none">{item.title}</h3><p className="text-sm leading-6 text-[#aaa79d]">{item.text}</p></div>)}</div></div></section>

      <section className="bg-[#ff5a32] px-8 py-20 text-[#171717] sm:px-14 lg:px-[10%] lg:py-28"><div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-[10px] uppercase tracking-[0.18em]">For sales leaders and their teams</p><h2 className="mt-5 max-w-[650px] font-serif text-5xl leading-[0.88] tracking-[-0.06em] sm:text-7xl">See the work. Support the people. Scale the wins.</h2></div><Link href="/dashboard" className="inline-flex w-fit items-center gap-2 rounded-full bg-[#171717] px-6 py-3 text-xs font-medium text-white">Open your workspace <ArrowUpRight className="size-4" /></Link></div></section>

      <footer id="pricing" className="flex flex-col gap-5 bg-[#f0ead7] px-8 py-8 text-[10px] text-[#625f56] sm:flex-row sm:items-center sm:justify-between sm:px-14 lg:px-[10%]"><span>© 2026 Sequoia.ai</span><span>Sales, in motion.</span><Link href="/dashboard" className="text-[#171717] underline underline-offset-2">Start free ↗</Link></footer>
    </main>
  )
}
