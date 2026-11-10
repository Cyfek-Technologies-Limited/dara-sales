'use client'

import Link from 'next/link'
import { ArrowRight, ArrowUpRight, BarChart3, Check, CheckCircle2, Layers3, Radar, Users } from 'lucide-react'
import styles from './home-page.module.css'

const capabilities = [
  { icon: Radar, label: 'DISCOVER', title: 'Start with the right market.', description: 'Describe your product or service and target location. Dara suggests relevant industries and categories, then helps you find businesses worth approaching.', detail: 'Industry suggestions + business search' },
  { icon: Layers3, label: 'ORGANIZE', title: 'Build a pipeline you can trust.', description: 'Review business websites and public contact details with their source links. Save the prospects you want, with notes and a clear stage for each opportunity.', detail: 'Prospects / leads / clients' },
  { icon: Users, label: 'COORDINATE', title: 'Give your team direction.', description: 'Assign teammates to industries, distribute prospects, and record outreach and follow-ups. Keep today?s activity separate from your complete prospect history.', detail: 'Shared prospects + daily outreach' },
  { icon: BarChart3, label: 'UNDERSTAND', title: 'See which markets respond.', description: 'Compare prospects and client wins by industry and category. Use charts and team activity to decide where to focus your next sales effort.', detail: 'Industry analytics + team visibility' },
]
const steps = [
  { number: '01', title: 'Tell Dara what you sell.', text: 'Enter your product or service and the location you want to reach. Choose a suggested industry or one you have already saved.' },
  { number: '02', title: 'Discover. Review. Save.', text: 'Narrow the search with categories, keywords, business size, and contact preferences. Check the sources and add relevant businesses to your prospects.' },
  { number: '03', title: 'Work the opportunity.', text: 'Keep prospects unassigned or give them to a teammate. Log outreach, move conversations through the pipeline, and see where clients come from.' },
]
const questions = [
  { question: 'What does Dara actually do?', answer: 'Dara is an AI prospecting and sales team workspace. It helps you choose target industries, discover businesses in a location, review publicly sourced contact information, save prospects, record outreach, and track progress from prospect to client.' },
  { question: 'Can I use Dara without a sales team?', answer: 'Yes. You can research businesses and save prospects as unassigned. When you have active teammates, you can choose an assignee while saving new prospects.' },
  { question: 'Will every business have an email and phone number?', answer: 'Contact availability varies. Dara can surface general business emails and main phone numbers published on official business pages, with source links for review. You can also search for businesses without requiring contact details.' },
  { question: 'Does Dara send messages or close deals for me?', answer: 'Your team handles the conversations. Dara helps with research, prospect organization, outreach records, and pipeline visibility; it does not guarantee a response or a sale.' },
  { question: 'What can I learn from the analytics?', answer: 'You can compare current prospects, prospects, and client wins across your industries and categories, and review team activity. This helps you see which niches deserve more attention and where opportunities need a follow-up.' },
]
export default function LandingPage() {
  return <main className={styles.landingPage}>
    <a href="#main-content" className={styles.skipLink}>Skip to content</a>
    <section
        id="main-content"
        // aria-label="Dara business management"
        className={styles.originalHero + " relative h-screen mx-auto flex min-h-[min(900px,94vh)] w-full flex-col overflow-hidden bg-[#06101c] bg-cover lg:bg-left text-white lg:bg-[length:80%_auto] lg:bg-right lg:bg-no-repeat"}
        style={{ backgroundImage: "url('/dara-team-banner.png')" }}
      >
        {/* <div aria-hidden="true" className="absolute inset-0 bg-[#06101c]/35" /> */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#06101c]/45 via-[#06101c]/10 to-[#06101c]/30"
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-[10%] hidden w-[35%] bg-gradient-to-r from-[#06101c] via-[#06101c]/80 to-transparent lg:block"
        />
        <header className="relative z-20 flex h-24 shrink-0 items-center justify-between px-6 sm:h-28 sm:px-[7.5%]">
          <nav className="flex items-center gap-5 text-sm text-white/90 sm:gap-10 sm:text-lg lg:gap-14">
            <a href="#main-content" className="transition hover:text-white">
              Home
            </a>
            <a href="#why-dara" className="transition hover:text-white">
              Team
            </a>
            <a href="#footer" className="transition hover:text-white">
              Contacts
            </a>
            <Link
              href="/sign-up"
              className="font-semibold text-white transition hover:text-white/75"
            >
              Join
            </Link>
          </nav>
          <div className="flex items-center gap-4 sm:gap-8">
            <a
              href="#how-it-works"
              className="hidden text-sm text-white/90 transition hover:text-white sm:inline lg:text-lg"
            >
              Company
            </a>
            <a
              href="#footer"
              aria-label="More site links"
              className="flex size-10 flex-col items-center justify-center gap-1.5 rounded-lg transition hover:bg-white/10"
            >
              <span className="h-1 w-7 rounded-full bg-[#8ec5ff]" />
              <span className="h-1 w-7 rounded-full bg-[#8ec5ff]" />
              <span className="h-1 w-7 rounded-full bg-[#8ec5ff]" />
            </a>
          </div>
        </header>

        <div className={styles.originalHeroContent + " relative z-10 flex flex-1 items-center px-6 sm:px-[7.5%]"}>
          <div className={styles.originalHeroCopy}>
            <h1 className={styles.originalHeroTitle}>
              <span>Find the right businesses.</span>
              <span>Turn prospects into clients.</span>
            </h1>
            <p className={styles.originalHeroDescription}>
              Tell Dara what you sell and where you want to grow. Use AI to
              discover relevant businesses and publicly listed contact details,
              save prospects, and track your team&apos;s outreach from first contact
              to client. See which industries bring results, all in one workspace.
            </p>
            <Link
              href="/sign-up"
              className="mt-8 inline-flex min-w-[190px] items-center justify-center rounded-full border-[3px] border-white px-8 py-3.5 text-sm font-bold tracking-wide text-white transition hover:bg-white hover:text-[#2638b8] sm:mt-10 sm:min-w-[230px] sm:py-4 sm:text-lg"
            >
              GET STARTED
            </Link>
          </div>
        </div>
      </section>

    <div className={styles.journeyBand}><div className={styles.journeyInner}><p>FROM OPPORTUNITY<br /><strong>TO A CLEAR NEXT STEP.</strong></p><div>{['Discover businesses','Save your prospects','Record outreach','Track client wins'].map((item,index) => <span key={item}>{index > 0 && <ArrowRight size={15} aria-hidden="true" />}<span>{item}</span></span>)}</div></div></div>

    <section id="product" className={styles.section}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>A WORKSPACE THAT CONNECTS THE WORK</p><h2>From &ldquo;who should we target?&rdquo;<br />to &ldquo;what happens next?&rdquo;</h2></div><p>Finding a business is only the start. Dara connects prospect research, prospect records, team activity, and results so the next step stays clear.</p></div><div className={styles.featureGrid}>{capabilities.map(({ icon: Icon, label, title, description, detail }) => <article className={styles.featureCard} key={label}><div className={styles.featureTop}><span className={styles.featureIcon}><Icon size={22} /></span><span>{label}</span></div><h3>{title}</h3><p>{description}</p><div className={styles.featureDetail}><Check size={14} />{detail}</div></article>)}</div></section>

    <section id="why-dara" className={styles.darkSection}><div className={styles.darkInner}><div className={styles.darkHeading}><p className={styles.eyebrow}>WHY IT MATTERS FOR YOUR BUSINESS</p><h2>A prospect list isn&apos;t a sales process.<br /><span>Give it direction.</span></h2><p>When research lives in one place, outreach in another, and results in someone&apos;s head, opportunities become hard to follow. Dara puts the work in view so you can act on it.</p></div><div className={styles.benefitGrid}>{[
      { number: '01', title: 'Spend less time starting from scratch.', text: 'Use a focused industry and location search to build a relevant prospect list, instead of asking every salesperson to repeat the same research.' },
      { number: '02', title: 'Keep ownership and context clear.', text: 'Save business details, source links, notes, and outreach history together. See who is handling a prospect and which ones are still unassigned.' },
      { number: '03', title: 'Put your effort where it matters.', text: 'Compare industry and category results. See which conversations are turning into prospects and clients before deciding where to focus next.' },
    ].map((item) => <article key={item.number}><span className={styles.benefitNumber}>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></div></section>

    <section id="how-it-works" className={styles.section}><div className={styles.centerHeading}><p className={styles.eyebrow}>A SIMPLE WAY TO START</p><h2>Your next sales routine,<br />in three clear steps.</h2><p>One workflow for the owner setting the direction and the people having the conversations.</p></div><div className={styles.steps}>{steps.map((step) => <article key={step.number}><span className={styles.stepNumber}>{step.number}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div><div className={styles.workflowFootnote}><Users size={18} /><p><strong>Solo today, a team tomorrow.</strong> Save prospects without an assignee, then add teammates as your business grows.</p><Link href="/sign-up">Build your workspace<ArrowUpRight size={15} /></Link></div></section>

    <section className={styles.focusSection}><div className={styles.focusInner}><div><p className={styles.eyebrow}>LESS GUESSWORK. MORE CONTEXT.</p><h2>Know which niche<br />deserves your next call.</h2><p>One industry can contain very different opportunities. Group businesses into categories, assign your team a focus, and compare where prospects and client wins are coming from.</p><ul>{['Organize industries and their business categories','Compare prospects, prospects, and client wins','Review daily outreach and team progress'].map((item) => <li key={item}><CheckCircle2 size={17} />{item}</li>)}</ul></div><div className={styles.insightCard}><div className={styles.insightHeader}><span><BarChart3 size={19} />Industry insights</span><small>Sample data</small></div><h3>A clearer picture of your pipeline.</h3><p>Client wins by category</p>{[{ label:'Coworking spaces', count:7, width:88 },{ label:'Event venues', count:5, width:63 },{ label:'Retail businesses', count:3, width:38 }].map((item) => <div className={styles.insightRow} key={item.label}><div><span>{item.label}</span><strong>{item.count} clients</strong></div><div className={styles.insightTrack}><span style={{width:item.width+'%'}} /></div></div>)}<div className={styles.insightFooter}><span className={styles.eyebrowDot} />Illustrative figures. Your dashboard uses your saved pipeline.</div></div></div></section>

    <section id="faq" className={styles.faqSection}><div><p className={styles.eyebrow}>GOOD QUESTIONS</p><h2>A little more clarity.</h2><p>What to expect from your Dara workspace.</p></div><div className={styles.faqList}>{questions.map((item) => <details key={item.question}><summary>{item.question}<PlusIcon /></summary><p>{item.answer}</p></details>)}</div></section>

    <section className={styles.finalCta}><div><p className={styles.eyebrow}>YOUR NEXT OPPORTUNITY STARTS HERE</p><h2>Better prospects.<br />A clearer way forward.</h2><p>Bring your research, prospects, and sales team into one workspace. Start with what you sell. Build from there.</p></div><div><Link href="/sign-up" className={styles.primaryButton}>Get started with Dara<ArrowRight size={17} /></Link><span>No sales team required to start.</span></div></section>

    <footer id="footer" className={styles.footer}><div className={styles.footerTop}><div><Link href="/" className={styles.logo}><span className={styles.logoMark}><Radar size={21} /></span>Dara<span className={styles.logoDot}>.</span></Link><p>Find the right businesses.<br />Keep the next step in sight.</p></div><nav aria-label="Footer navigation"><a href="#product">Product</a><a href="#how-it-works">How it works</a><a href="#faq">FAQs</a><Link href="/sign-in">Log in<ArrowUpRight size={13} /></Link></nav></div><div className={styles.footerBottom}><span>&copy; {new Date().getFullYear()} Dara</span><span>Built for focused prospecting and connected teams.</span></div></footer>
  </main>
}

function PlusIcon() { return <span className={styles.faqIcon} aria-hidden="true">+</span> }
