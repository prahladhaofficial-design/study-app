import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { BRAND } from '../config/brand'
import { daysLeft } from '../lib/access'

export function AccountPage() {
  const { email, access, signOut, preview } = useAuth()
  const planLine = !access
    ? '—'
    : !access.allowed
      ? 'No active plan'
      : access.reason === 'lifetime'
        ? 'Lifetime'
        : access.reason === 'trial' && access.until
          ? `Free trial · ${daysLeft(access.until, new Date())} days left`
          : `Subscribed${access.until ? ` · renews ${access.until.toLocaleDateString()}` : ''}`

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-8">
      <h1 className="text-2xl font-semibold">Account</h1>
      <section className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-faint">Signed in as</p>
        <p className="mt-1">{email}</p>
        {preview && <p className="mt-2 text-sm text-warm">Preview mode: connect Supabase to enable real accounts.</p>}
      </section>
      <section className="flex items-center justify-between rounded-2xl border border-line bg-surface p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-faint">Plan</p>
          <p className="mt-1">{planLine}</p>
        </div>
        <Link to="/upgrade" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
          See plans
        </Link>
      </section>
      <section className="flex flex-wrap gap-3">
        <a href={`mailto:${BRAND.supportEmail}`} className="rounded-xl border border-line px-4 py-2 text-sm text-dim hover:text-ink">
          Contact support
        </a>
        {!preview && (
          <button type="button" onClick={() => void signOut()} className="rounded-xl border border-line px-4 py-2 text-sm text-dim hover:text-ink">
            Sign out
          </button>
        )}
      </section>
    </div>
  )
}
