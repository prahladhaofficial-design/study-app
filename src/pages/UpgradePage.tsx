import clsx from 'clsx'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { BRAND } from '../config/brand'
import { PLANS } from '../config/pricing'
import type { Plan } from '../lib/access'
import { openExternal, startCheckout } from '../lib/billing'
import { isPhoneApp } from '../lib/platform'

const PERKS = [
  'Unlimited focus sessions on every device',
  'Flashcards with smart review scheduling',
  'Brain dump, quick recall and explain-it tools',
  'Insights, goals and streaks',
  'Study arena and leaderboards',
  'Sync across web, desktop and phone',
]

export function UpgradePage() {
  const { access, signOut, preview, refreshAccess } = useAuth()
  const ended = access && !access.allowed
  const [busy, setBusy] = useState<Plan | null>(null)
  const [error, setError] = useState('')

  async function buy(plan: Plan) {
    setBusy(plan)
    setError('')
    const res = await startCheckout(plan)
    if (res.url) await openExternal(res.url)
    else setError(res.error ?? 'Something went wrong. Please try again.')
    setBusy(null)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{ended ? 'Your free trial has ended' : `Unlock all of ${BRAND.name}`}</h1>
        <p className="text-dim">{isPhoneApp() ? 'Your data is safe and waiting.' : 'Pick a plan to keep your streak going. Your data is safe and waiting.'}</p>
      </div>

      <ul className="grid w-full gap-2 text-left text-sm sm:grid-cols-2">
        {PERKS.map((p) => (
          <li key={p} className="flex items-center gap-2 text-dim">
            <Check size={16} className="text-accent" /> {p}
          </li>
        ))}
      </ul>

      {isPhoneApp() ? (
        // App store rules: no outside payment links inside the phone apps.
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-6">
          <p className="text-sm text-dim">Subscriptions in the phone app are coming soon. If you already have a plan, it works here automatically.</p>
          <button type="button" onClick={() => void refreshAccess()} className="rounded-xl border border-line px-4 py-2 text-sm text-dim hover:text-ink">
            I already have a plan
          </button>
        </div>
      ) : (
        <>
          <div className="grid w-full gap-3 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                disabled={busy !== null}
                onClick={() => void buy(plan.id)}
                className={clsx(
                  'flex flex-col items-start gap-1 rounded-2xl border p-5 text-left transition-colors disabled:opacity-60',
                  plan.highlight ? 'border-accent bg-accent/10 hover:bg-accent/15' : 'border-line bg-surface hover:bg-surface-2',
                )}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-faint">{plan.label}</span>
                <span className="text-2xl font-semibold">
                  {plan.price}
                  <span className="ml-1 text-sm font-normal text-dim">{plan.per}</span>
                </span>
                <span className="text-sm text-dim">{busy === plan.id ? 'Opening checkout…' : plan.note}</span>
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <p className="text-xs text-faint">
            Secure checkout by Dodo Payments. See our{' '}
            <Link to="/refunds" className="underline">
              refund policy
            </Link>
            .
          </p>
        </>
      )}

      {access?.allowed ? (
        <Link to="/" className="text-sm text-dim underline">
          Back to the app
        </Link>
      ) : (
        !preview && (
          <button type="button" onClick={() => void signOut()} className="text-sm text-dim underline">
            Sign out
          </button>
        )
      )}
    </div>
  )
}
