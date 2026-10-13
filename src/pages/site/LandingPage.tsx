import clsx from 'clsx'
import {
  Brain,
  Check,
  CloudUpload,
  Flame,
  Headphones,
  Layers,
  ListChecks,
  Target,
  Timer,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BRAND } from '../../config/brand'
import { PLANS } from '../../config/pricing'
import { SiteLayout } from './SiteLayout'

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Timer, title: 'Focus timer', body: 'Stopwatch, countdown or Pomodoro. Tag each session with a subject and it is logged for you.' },
  { icon: Flame, title: 'Study heatmap', body: 'A year of study at a glance. Every focused day lights up a square, so streaks are hard to break.' },
  { icon: Layers, title: 'Flashcards', body: 'Spaced repetition schedules each card for the day you are about to forget it.' },
  { icon: Brain, title: 'Active recall tools', body: 'Brain dump, quick recall, explain it simply and sketch pads turn reading into remembering.' },
  { icon: Target, title: 'Goals and streaks', body: 'Set daily or weekly hour targets per subject and watch the ring fill as you work.' },
  { icon: ListChecks, title: 'Tasks and projects', body: 'Plan what to study today, group work into projects, and tick it off as you go.' },
  { icon: Headphones, title: 'Focus sounds', body: 'Mix rain, ocean, fan and noise into your own background. Generated on device, works offline.' },
  { icon: Trophy, title: 'Study arena', body: 'Daily, weekly and all-time leaderboards, plus a country board where every minute counts.' },
  { icon: CloudUpload, title: 'Backed up and synced', body: 'Works offline first, then backs up to the cloud so your history follows you to any device.' },
]

const STEPS = [
  { title: 'Start a session', body: 'Pick a subject and press start. That is the whole setup.' },
  { title: 'Learn actively', body: 'Review flashcards, dump what you remember, explain it in plain words.' },
  { title: 'Watch it add up', body: 'Your heatmap, goals and rank update the moment you finish.' },
]

const FAQ = [
  { q: 'Is there a free trial?', a: `Yes. Every new account gets ${BRAND.trialDays} days with every feature unlocked. No card is needed to start.` },
  { q: 'What happens when the trial ends?', a: 'Choose a monthly, yearly or lifetime plan to keep going. Your study history is kept safe either way.' },
  { q: 'Can I cancel any time?', a: 'Yes. Cancel your monthly or yearly plan whenever you like and keep access until the end of the period you paid for.' },
  { q: 'Does it work offline?', a: 'Yes. Everything is saved on your device first and backed up to the cloud when you are online again.' },
  { q: 'Which devices does it run on?', a: 'Any modern browser on a laptop, tablet or phone today. Desktop and phone apps are on the way, and your account works across all of them.' },
  { q: 'Can I get a refund?', a: 'Yes, within the window described in our refund policy. Write to us and we will sort it out.' },
]

export function LandingPage() {
  useEffect(() => {
    document.title = `${BRAND.name}: focus timer, study tracker and flashcards`
  }, [])

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-96 max-w-3xl rounded-full bg-accent/15 blur-3xl" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-16 text-center sm:pt-24">
          <p className="mb-5 rounded-full border border-line bg-surface px-3 py-1 text-xs text-dim">{BRAND.trialDays}-day free trial · no card needed</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Study with focus. <span className="text-accent">See every hour add up.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-dim">
            A focus timer, study tracker and flashcard app in one place. Log sessions, build streaks, learn actively and climb the leaderboard.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/login" className="rounded-xl bg-accent px-6 py-3 font-semibold text-accent-ink hover:opacity-90">
              Start free trial
            </Link>
            <a href="#features" className="rounded-xl border border-line bg-surface px-6 py-3 font-medium hover:bg-surface-2">
              See features
            </a>
          </div>
          <Shot src="/screens/focus.webp" alt="Focus timer with a year-long study heatmap" className="mt-14" eager />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <SectionTitle eyebrow="Features" title="Everything a serious study session needs" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-2xl border border-line bg-surface p-5">
                <span className="mb-4 grid size-10 place-items-center rounded-xl bg-accent/15 text-accent">
                  <Icon size={18} />
                </span>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-dim">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Showcase */}
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2">
          <div>
            <SectionTitle eyebrow="Progress you can see" title="Know exactly where your hours go" align="left" />
            <p className="text-dim">Insights break your study down by week and by day. Spot your best days, protect your streak and see consistency improve over a term.</p>
          </div>
          <Shot src="/screens/insights.webp" alt="Insights page with weekly totals and best days" />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 lg:grid-cols-2">
          <Shot src="/screens/review.webp" alt="Flashcard review with spaced repetition" className="lg:order-first" />
          <div>
            <SectionTitle eyebrow="Remember more" title="Flashcards that schedule themselves" align="left" />
            <p className="text-dim">Rate each card as you review it. Hard cards come back soon, easy ones wait longer, so your review time goes where it matters.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <SectionTitle eyebrow="How it works" title="Three steps, every day" />
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-line bg-surface p-6">
                <span className="font-mono text-sm text-accent">0{i + 1}</span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-dim">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 border-t border-line bg-surface/40">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <SectionTitle eyebrow="Pricing" title="Try everything free, then pick a plan" />
          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.id} className={clsx('flex flex-col rounded-2xl border p-6', p.highlight ? 'border-accent bg-accent/10' : 'border-line bg-surface')}>
                <p className="text-xs font-semibold uppercase tracking-wider text-faint">{p.label}</p>
                <p className="mt-3">
                  <span className="text-4xl font-semibold">{p.price}</span>
                  <span className="ml-1 text-sm text-dim">{p.per}</span>
                </p>
                <p className="mt-1 text-sm text-dim">{p.note}</p>
                <ul className="my-6 flex flex-col gap-2 text-sm">
                  {['Every feature included', 'Sync across devices', `${BRAND.trialDays}-day free trial first`].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-dim">
                      <Check size={15} className="text-accent" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={clsx('mt-auto rounded-xl py-2.5 text-center text-sm font-semibold', p.highlight ? 'bg-accent text-accent-ink' : 'border border-line hover:bg-surface-2')}
                >
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-faint">
            Prices in Indian rupees. Taxes may be added at checkout. See the{' '}
            <Link to="/refunds" className="underline">
              refund policy
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <SectionTitle eyebrow="FAQ" title="Questions, answered" />
          <div className="flex flex-col gap-2">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-line bg-surface px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span className="text-xl text-faint transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-dim">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="border-t border-line">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Your next study session starts here</h2>
          <p className="mt-3 text-dim">{BRAND.tagline}</p>
          <Link to="/login" className="mt-8 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-ink hover:opacity-90">
            Start your free trial
          </Link>
        </div>
      </section>
    </SiteLayout>
  )
}

function SectionTitle({ eyebrow, title, align = 'center' }: { eyebrow: string; title: string; align?: 'center' | 'left' }) {
  return (
    <div className={clsx('mb-10', align === 'center' && 'text-center')}>
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
    </div>
  )
}

function Shot({ src, alt, className, eager }: { src: string; alt: string; className?: string; eager?: boolean }) {
  return (
    <div className={clsx('w-full max-w-5xl overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-2xl shadow-black/30', className)}>
      <img src={src} alt={alt} width={1440} height={900} loading={eager ? 'eager' : 'lazy'} className="h-auto w-full rounded-xl" />
    </div>
  )
}
