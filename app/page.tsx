"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MessageSquareText,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

const representative =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Professional%20Customer%20Service%20Representative-KuQFGu0UuUowzYnbFwwTkdTPaAf5eS.png";

const capabilities = [
  {
    number: "01",
    icon: Target,
    title: "Give every rep a clear target.",
    text: "Assign daily outreach goals, define target industries, and make sure everyone knows which prospects they should be pursuing.",
    tags: ["Daily targets", "Assigned niches"],
  },
  {
    number: "02",
    icon: ClipboardCheck,
    title: "Keep every lead moving.",
    text: "Track prospects from first contact to follow-up and final outcome. Know who has been contacted, who needs attention, and what happens next.",
    tags: ["Lead tracking", "Follow-up reminders"],
  },
  {
    number: "03",
    icon: Activity,
    title: "See the work behind the numbers.",
    text: "Give your team a place to log calls, emails, messages, replies, meetings, and sales so their progress is visible throughout the day.",
    tags: ["Activity logs", "Daily reports"],
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Manage with real visibility.",
    text: "Review individual and team performance, compare activity against targets, and identify where your sales process needs attention.",
    tags: ["Performance dashboard", "Team reporting"],
  },
];

const outcomes = [
  {
    icon: Clock3,
    title: "Fewer forgotten follow-ups",
    text: "Give every prospect a clear next step instead of relying on memory, scattered notes, or unread messages.",
  },
  {
    icon: Users,
    title: "More accountable teams",
    text: "Make expectations visible and give team members a consistent way to report their progress.",
  },
  {
    icon: TrendingUp,
    title: "Better-informed decisions",
    text: "Understand where your team is putting in the work, where prospects are dropping off, and where to improve.",
  },
];

const workflow = [
  {
    number: "01",
    title: "Set the direction",
    text: "Choose your target markets, assign prospects or industries, and define the activity goals your team should meet.",
  },
  {
    number: "02",
    title: "Work the pipeline",
    text: "Your reps find prospects, record outreach, update lead statuses, and keep track of the next action for each opportunity.",
  },
  {
    number: "03",
    title: "Review the results",
    text: "See activity and sales progress in one place. Coach your team using actual work records rather than guesswork.",
  },
];

const useCases = [
  {
    title: "Outbound sales teams",
    text: "Organize prospecting, cold calls, emails, follow-ups, and daily outreach goals.",
    label: "PROSPECTING",
  },
  {
    title: "Startups and small businesses",
    text: "Build a repeatable sales process before your growing team becomes difficult to manage.",
    label: "GROWTH",
  },
  {
    title: "Sales managers and agencies",
    text: "Manage multiple salespeople, review their activities, and spot bottlenecks before they affect results.",
    label: "TEAM MANAGEMENT",
  },
  {
    title: "Commission-based teams",
    text: "Keep sales activity and recorded outcomes organized so performance and commission reviews have a clearer basis.",
    label: "PERFORMANCE",
  },
];

const dashboardActivities = [
  { name: "Prospects researched", value: "12", percent: 60 },
  { name: "Businesses contacted", value: "16", percent: 80 },
  { name: "Follow-ups completed", value: "8", percent: 40 },
];

function SectionEyebrow({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <p
      className={`text-[10px] font-medium uppercase tracking-[0.2em] ${
        light ? "text-[#a5f36c]" : "text-[#5366df]"
      }`}
    >
      {children}
    </p>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f6f9] text-[#111827]">
      <div className="bg-[#06101c] px-3 py-3 sm:px-6 sm:py-6">
        <section
          id="product"
          aria-label="Manage your sales team"
          className="relative mx-auto flex min-h-[min(850px,92vh)] max-w-[1400px] flex-col overflow-hidden rounded-[24px] bg-cover bg-center text-white"
          style={{ backgroundImage: "url('/luminous-waves-deep-navy.png')" }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[#03101c]/25"
          />
          <header className="relative z-20 flex h-[68px] items-center justify-between px-5 sm:px-8 lg:px-12">
            <Link
              href="/"
              aria-label="Dara home"
              className="flex size-9 items-center justify-center rounded-full bg-white text-xl font-black tracking-[-0.12em] text-[#07121f]"
            >
              D<span className="text-[#5366df]">.</span>
            </Link>
            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-[14px] text-white/80 sm:flex">
              <a className="text-white" href="#product">
                Business
              </a>
              <a href="#pricing">Pricing</a>
              <a href="#solutions">Features</a>
              <a href="#workflow">About</a>
            </nav>
            <Link
              href="/sign-in"
              className="rounded-full border border-white/15 bg-white/[0.08] px-5 py-2.5 text-[11px] font-medium text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              Login
            </Link>
          </header>
          <div className="relative z-10 mx-auto flex w-full flex-1 flex-col items-center justify-center px-5 pb-28 pt-10 text-center sm:pb-36">
            <h1 className="max-w-[850px] text-[clamp(2.5rem,6vw,5.5rem)] font-semibold leading-[1.02] tracking-[-0.055em] drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]">
              Manage your sales team
              <br className="hidden sm:block" /> with{" "}
              <span className="text-[#a5f36c]">clarity.</span>
            </h1>
            <p className="mt-6 max-w-[570px] text-[13px] leading-6 text-white/75 sm:text-[15px] sm:leading-7">
              Set clear goals, keep every follow-up moving, and understand the
              work behind your team&apos;s results — all in one place.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-full bg-[#a5f36c] px-6 py-3 text-xs font-semibold text-[#07121b] shadow-[0_0_30px_rgba(165,243,108,0.24)] transition hover:bg-[#b7ff80]"
              >
                How it works <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#solutions"
                className="inline-flex min-w-[150px] items-center justify-center rounded-full border border-white/20 bg-[#091521]/45 px-6 py-3 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                Book Demo
              </Link>
            </div>
          </div>
        </section>
      </div>
      {/* 1. The problem: make visitors recognize their situation */}
      <section
        id="solutions"
        className="px-8 py-24 sm:px-14 lg:px-[10%] lg:py-32"
      >
        <div className="grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <SectionEyebrow>The problem</SectionEyebrow>
            <h2 className="mt-6 max-w-[680px] font-serif text-5xl font-normal leading-[0.91] tracking-[-0.065em] sm:text-7xl">
              You can&apos;t grow a sales team you can&apos;t see.
            </h2>
          </div>

          <div className="max-w-[440px]">
            <p className="text-sm leading-7 text-[#596579]">
              Your salespeople are busy. Prospects are being contacted.
              Follow-ups are happening. But when the information lives in
              spreadsheets, chats, personal notes, and scattered reports, it
              becomes difficult to know what is actually getting done.
            </p>
            <p className="mt-5 text-sm leading-7 text-[#596579]">
              Dara brings your team&apos;s sales activities into one structured
              workspace, so everyone knows what to do and managers can see how
              the work is progressing.
            </p>
          </div>
        </div>

        <div className="mt-16 grid gap-3 md:grid-cols-3">
          {[
            {
              number: "01",
              title: "Leads get lost.",
              text: "Prospect details and conversations are scattered across different tools.",
            },
            {
              number: "02",
              title: "Follow-ups slip.",
              text: "Without a clear process, interested prospects can go cold.",
            },
            {
              number: "03",
              title: "Performance is unclear.",
              text: "Activity reports arrive late, and managers struggle to verify progress.",
            },
          ].map((item) => (
            <article
              key={item.number}
              className="rounded-xl border border-[#d6deea] p-7 sm:p-8"
            >
              <span className="text-[10px] tracking-[0.16em] text-[#5366df]">
                {item.number}
              </span>
              <h3 className="mt-10 font-serif text-3xl tracking-[-0.045em]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#596579]">
                {item.text}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-xl bg-[#e9eef5] p-5 sm:items-center sm:p-6">
          <Zap className="mt-0.5 size-5 shrink-0 text-[#5366df] sm:mt-0" />
          <p className="text-sm leading-6">
            <strong>Sales shouldn&apos;t depend on memory.</strong> Give your
            team a clear process for finding prospects, taking action, and
            reporting results.
          </p>
        </div>
      </section>

      {/* 2. Core product capabilities */}
      <section className="bg-[#07121f] px-8 py-24 text-[#f5f8fc] sm:px-14 lg:px-[10%] lg:py-32">
        <div className="max-w-[720px]">
          <SectionEyebrow light>
            One workspace. A clearer process.
          </SectionEyebrow>
          <h2 className="mt-6 font-serif text-5xl font-normal leading-[0.92] tracking-[-0.065em] sm:text-7xl">
            Everything your sales team needs to move forward.
          </h2>
          <p className="mt-6 max-w-[510px] text-sm leading-7 text-[#b5c0cf]">
            From the first prospect you discover to the final sale you record,
            manage your team&apos;s day-to-day sales operations without losing
            sight of the bigger picture.
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-2">
          {capabilities.map(({ number, icon: Icon, title, text, tags }) => (
            <article key={number} className="bg-[#0d1a29] p-7 sm:p-10">
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-full border border-white/10">
                  <Icon className="size-5 text-[#a5f36c]" />
                </div>
                <span className="font-serif text-2xl text-white/25">
                  {number}
                </span>
              </div>

              <h3 className="mt-12 max-w-[340px] font-serif text-3xl leading-[1.02] tracking-[-0.045em] sm:text-4xl">
                {title}
              </h3>

              <p className="mt-5 max-w-[390px] text-sm leading-7 text-[#b5c0cf]">
                {text}
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-[#d8e0ec]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 3. Show a tangible example of the product */}
      <section className="px-5 py-24 sm:px-10 lg:px-[10%] lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <SectionEyebrow>Clarity, every day</SectionEyebrow>
            <h2 className="mt-6 max-w-[500px] font-serif text-5xl font-normal leading-[0.91] tracking-[-0.065em] sm:text-6xl">
              Know what&apos;s happening before the day is over.
            </h2>
            <p className="mt-6 max-w-[410px] text-sm leading-7 text-[#596579]">
              Give every salesperson a clear view of their priorities and give
              managers a practical way to review the team&apos;s activity. No
              more piecing together updates from multiple conversations.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                "Daily activity against assigned targets",
                "A clearer record of prospects and outreach",
                "Follow-ups and outcomes in one workflow",
                "Performance visibility for managers",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#5366df]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Illustrative dashboard preview */}
          <div className="overflow-hidden rounded-2xl border border-[#d6deea] bg-[#f4f7fa] shadow-[0_24px_80px_rgba(23,23,23,0.08)]">
            <div className="flex items-center justify-between border-b border-[#e9eef5] px-5 py-4 sm:px-7">
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-[#657286]">
                  Sales workspace
                </p>
                <h3 className="mt-1 text-sm font-semibold">Daily overview</h3>
              </div>
              <span className="rounded-full bg-[#e9eef5] px-3 py-1.5 text-[9px]">
                Example dashboard
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-6">
              <div className="rounded-xl border border-[#e9eef5] bg-[#f4f6f9] p-4">
                <div className="flex items-center gap-2 text-[#657286]">
                  <Target className="size-4" />
                  <span className="text-[10px]">Daily target</span>
                </div>
                <p className="mt-5 font-serif text-3xl tracking-[-0.05em]">
                  20
                </p>
                <p className="mt-1 text-[10px] text-[#657286]">
                  Example activities
                </p>
              </div>

              <div className="rounded-xl border border-[#e9eef5] bg-[#f4f6f9] p-4">
                <div className="flex items-center gap-2 text-[#657286]">
                  <Activity className="size-4" />
                  <span className="text-[10px]">Completed</span>
                </div>
                <p className="mt-5 font-serif text-3xl tracking-[-0.05em]">
                  16
                </p>
                <p className="mt-1 text-[10px] text-[#657286]">
                  Example activities
                </p>
              </div>

              <div className="col-span-2 rounded-xl border border-[#e9eef5] bg-[#f4f6f9] p-4 sm:col-span-1">
                <div className="flex items-center gap-2 text-[#657286]">
                  <TrendingUp className="size-4" />
                  <span className="text-[10px]">Target progress</span>
                </div>
                <p className="mt-5 font-serif text-3xl tracking-[-0.05em]">
                  80%
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#d6deea]">
                  <div className="h-full w-4/5 rounded-full bg-[#5366df]" />
                </div>
              </div>
            </div>

            <div className="mx-4 mb-4 rounded-xl border border-[#e9eef5] bg-[#f4f6f9] p-4 sm:mx-6 sm:mb-6 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-xs font-semibold">Activity breakdown</h4>
                <span className="text-[9px] text-[#657286]">
                  Illustrative data
                </span>
              </div>

              <div className="mt-5 space-y-5">
                {dashboardActivities.map((activity) => (
                  <div key={activity.name}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs text-[#596579]">
                        {activity.name}
                      </span>
                      <span className="text-xs font-medium">
                        {activity.value}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#d6deea]">
                      <div
                        className="h-full rounded-full bg-[#5366df]"
                        style={{ width: `${activity.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-[#e9eef5] bg-[#e9eef5]/50 px-5 py-4 sm:px-7">
              <MessageSquareText className="mt-0.5 size-4 shrink-0 text-[#5366df]" />
              <p className="text-[10px] leading-5 text-[#596579]">
                This is a conceptual preview using sample figures, not a
                screenshot of a live dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Explain the operating rhythm */}
      <section
        id="workflow"
        className="bg-[#e9eef5] px-8 py-24 sm:px-14 lg:px-[10%] lg:py-32"
      >
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionEyebrow>How it works</SectionEyebrow>
            <h2 className="mt-6 max-w-[440px] font-serif text-5xl font-normal leading-[0.91] tracking-[-0.065em] sm:text-7xl">
              A better sales process starts with a better routine.
            </h2>
            <p className="mt-7 max-w-[340px] text-sm leading-7 text-[#596579]">
              Give your team a repeatable way to work, while keeping the
              flexibility to manage your own targets, people, and sales
              approach.
            </p>

            <Link
              href="/dashboard"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#111827] px-5 py-3 text-xs font-medium text-white transition hover:bg-[#333]"
            >
              Explore your workspace
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="divide-y divide-[#d6deea] border-y border-[#d6deea]">
            {workflow.map((item) => (
              <article
                key={item.number}
                className="grid gap-4 py-8 sm:grid-cols-[60px_1fr]"
              >
                <span className="font-serif text-3xl text-[#5366df]">
                  {item.number}
                </span>
                <div>
                  <h3 className="font-serif text-3xl tracking-[-0.045em]">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-[420px] text-sm leading-7 text-[#596579]">
                    {item.text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Who the product is for */}
      <section className="px-8 py-24 sm:px-14 lg:px-[10%] lg:py-32">
        <div className="max-w-[700px]">
          <SectionEyebrow>Built for the way you sell</SectionEyebrow>
          <h2 className="mt-6 font-serif text-5xl font-normal leading-[0.92] tracking-[-0.065em] sm:text-7xl">
            Whether you&apos;re a team of two or a team of twenty.
          </h2>
          <p className="mt-6 max-w-[490px] text-sm leading-7 text-[#596579]">
            A structured sales workflow can make a difference at any stage.
            Start with the processes your team needs today and build from there.
          </p>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-2">
          {useCases.map((item, index) => (
            <article
              key={item.title}
              className={`rounded-xl p-7 sm:p-9 ${
                index === 0 || index === 3
                  ? "bg-[#07121f] text-[#f5f8fc]"
                  : "border border-[#d6deea]"
              }`}
            >
              <span
                className={`text-[9px] tracking-[0.17em] ${
                  index === 0 || index === 3
                    ? "text-[#a5f36c]"
                    : "text-[#5366df]"
                }`}
              >
                {item.label}
              </span>
              <h3 className="mt-10 font-serif text-3xl tracking-[-0.045em] sm:text-4xl">
                {item.title}
              </h3>
              <p
                className={`mt-4 max-w-[390px] text-sm leading-7 ${
                  index === 0 || index === 3
                    ? "text-[#b5c0cf]"
                    : "text-[#596579]"
                }`}
              >
                {item.text}
              </p>
              <div
                className={`mt-8 flex size-9 items-center justify-center rounded-full ${
                  index === 0 || index === 3 ? "bg-white/10" : "bg-[#e9eef5]"
                }`}
              >
                <ArrowUpRight
                  className={`size-4 ${
                    index === 0 || index === 3
                      ? "text-[#a5f36c]"
                      : "text-[#111827]"
                  }`}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 6. Benefits: translate features into business outcomes */}
      <section className="bg-[#07121f] px-8 py-24 text-[#f5f8fc] sm:px-14 lg:px-[10%] lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionEyebrow light>The bigger picture</SectionEyebrow>
            <h2 className="mt-6 max-w-[490px] font-serif text-5xl font-normal leading-[0.91] tracking-[-0.065em] sm:text-7xl">
              Don&apos;t just track sales. Improve how sales happen.
            </h2>
          </div>

          <div className="divide-y divide-white/10 border-y border-white/10">
            {outcomes.map(({ icon: Icon, title, text }) => (
              <article key={title} className="flex gap-5 py-7 sm:py-8">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10">
                  <Icon className="size-4 text-[#a5f36c]" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl tracking-[-0.035em] sm:text-3xl">
                    {title}
                  </h3>
                  <p className="mt-3 max-w-[420px] text-sm leading-7 text-[#b5c0cf]">
                    {text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Handle the buyer's hesitation */}
      <section className="px-8 py-24 sm:px-14 lg:px-[10%] lg:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionEyebrow>Built around your team</SectionEyebrow>
            <h2 className="mt-6 max-w-[500px] font-serif text-5xl font-normal leading-[0.92] tracking-[-0.065em] sm:text-6xl">
              Your sales process deserves more than another spreadsheet.
            </h2>
            <p className="mt-6 max-w-[430px] text-sm leading-7 text-[#596579]">
              Keep the people, prospects, activities, and outcomes of your sales
              operation connected in a workspace designed for the work your team
              does every day.
            </p>
          </div>

          <div className="space-y-4">
            {[
              "Clear responsibilities for every salesperson",
              "A consistent way to record outreach and progress",
              "Better visibility into daily execution",
              "One place to review team performance",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-4 rounded-xl border border-[#d6deea] p-5"
              >
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e9eef5]">
                  <Check className="size-3.5 text-[#5366df]" />
                </div>
                <p className="text-sm leading-6">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Final conversion section */}
      <section
        id="pricing"
        className="relative overflow-hidden bg-[#5366df] px-8 py-24 sm:px-14 lg:px-[10%] lg:py-32"
      >
        <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full border border-black/10 sm:size-[440px]" />
        <div className="pointer-events-none absolute -right-8 -top-12 size-56 rounded-full border border-black/10 sm:size-[320px]" />

        <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em]">
              Take control of your sales process
            </p>
            <h2 className="mt-6 max-w-[740px] font-serif text-5xl font-normal leading-[0.87] tracking-[-0.065em] sm:text-7xl lg:text-8xl">
              Make every sales activity count.
            </h2>
            <p className="mt-7 max-w-[460px] text-sm leading-7 text-[#07121f]">
              Bring structure to your outreach, give your team clear priorities,
              and get a better view of the work driving your business forward.
            </p>
          </div>

          <div className="flex flex-col items-start gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-3 rounded-full bg-[#111827] px-6 py-4 text-xs font-medium text-white transition hover:bg-[#333]"
            >
              Get started
              <ArrowUpRight className="size-4" />
            </Link>
            <span className="text-[10px] text-[#07121f]">
              Start building a clearer sales workflow.
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f4f6f9] px-8 py-10 sm:px-14 lg:px-[10%]">
        <div className="flex flex-col gap-8 border-b border-[#d6deea] pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-sans text-sm font-bold tracking-[-0.08em]"
            >
              <span>▰</span> / Dara.ai
            </Link>
            <p className="mt-4 max-w-[270px] text-xs leading-6 text-[#596579]">
              A clearer way to organize sales activities, manage your team, and
              keep opportunities moving.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs">
            <a href="#product" className="transition hover:text-[#5366df]">
              Product
            </a>
            <a href="#solutions" className="transition hover:text-[#5366df]">
              Why Dara
            </a>
            <a href="#workflow" className="transition hover:text-[#5366df]">
              How it works
            </a>
            <Link href="/dashboard" className="transition hover:text-[#5366df]">
              Log in
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-[10px] text-[#657286] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Dara.ai</span>
          <span>Built for teams that want to sell with clarity.</span>
        </div>
      </footer>
    </main>
  );
}
