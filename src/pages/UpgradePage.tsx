import clsx from 'clsx'
import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { BRAND } from '../config/brand'
import { PLANS } from '../config/pricing'

const PERKS = [
  'Unlimited focus sessions on every device',
  'Flashcards with smart review scheduling',
  'Brain dump, quick recall and explain-it tools',
  'Insights, goals and streaks',
  'Study arena and leaderboards',
  'Sync across web, desktop and phone',
]

export function UpgradePage() {
  const { access, signOut, preview } = useAuth()
  const ended = access && !access.allowed

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{ended ? 'Your free trial has ended' : `Unlock all of ${BRAND.name}`}</h1>
        <p className="text-dim">Pick a plan to keep your streak going. Your data is safe and waiting.</p>
      </div>

      <ul className="grid w-full gap-2 text-left text-sm sm:grid-cols-2">
        {PERKS.map((p) => (
          <li key={p} className="flex items-center gap-2 text-dim">
            <Check size={16} className="text-accent" /> {p}
          </li>
        ))}
      </ul>

      <div className="grid w-full gap-3 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            disabled
            title="Checkout opens once payments are connected"
            className={clsx(
              'flex flex-col items-start gap-1 rounded-2xl border p-5 text-left',
              plan.highlight ? 'border-accent bg-accent/10' : 'border-line bg-surface',
            )}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-faint">{plan.label}</span>
            <span className="text-2xl font-semibold">
              {plan.price}
              <span className="ml-1 text-sm font-normal text-dim">{plan.per}</span>
            </span>
            <span className="text-sm text-dim">{plan.note}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-faint">
        Checkout opens here very soon. See our{' '}
        <Link to="/refunds" className="underline">
          refund policy
        </Link>
        .
      </p>

      {!preview && (
        <button type="button" onClick={() => void signOut()} className="text-sm text-dim underline">
          Sign out
        </button>
      )}
    </div>
  )
}
