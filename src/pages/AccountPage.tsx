import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { BRAND } from '../config/brand'
import { LEGAL_LINKS } from '../config/legal'
import { daysLeft } from '../lib/access'
import { deleteAccount, openBillingPortal, openExternal } from '../lib/billing'
import { isPhoneApp } from '../lib/platform'
import { supabase } from '../lib/supabase'
import { signOutCleanup, syncNow, useSyncStatus } from '../lib/sync'

export function AccountPage() {
  const { email, access, signOut, preview, refreshAccess } = useAuth()
  const [params, setParams] = useSearchParams()
  const paid = access?.allowed && access.reason !== 'trial'
  const [checkingOut, setCheckingOut] = useState(params.get('checkout') === 'done')
  const [billingError, setBillingError] = useState('')

  // Back from checkout: the payment notice can take a few seconds to arrive, so keep checking.
  useEffect(() => {
    if (!checkingOut) return
    if (paid) {
      setCheckingOut(false)
      setParams({}, { replace: true })
      return
    }
    let tries = 0
    const timer = window.setInterval(() => {
      tries += 1
      void refreshAccess()
      if (tries >= 20) window.clearInterval(timer)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [checkingOut, paid, refreshAccess, setParams])

  async function manageBilling() {
    setBillingError('')
    const res = await openBillingPortal()
    if (res.url) await openExternal(res.url)
    else setBillingError(res.error ?? 'Could not open billing.')
  }
  const sync = useSyncStatus()
  const syncLine =
    sync.state === 'syncing'
      ? 'Backing up…'
      : sync.state === 'offline'
        ? 'Offline. Changes will upload when you reconnect.'
        : sync.state === 'error'
          ? `Backup failed: ${sync.error}`
          : sync.lastSyncedAt
            ? `Backed up at ${new Date(sync.lastSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${sync.pending ? ` · ${sync.pending} waiting` : ''}`
            : 'Not backed up yet'
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
        {paid && access?.reason !== 'lifetime' && !isPhoneApp() ? (
          <button type="button" onClick={() => void manageBilling()} className="rounded-xl border border-line px-4 py-2 text-sm text-dim hover:text-ink">
            Manage billing
          </button>
        ) : !paid ? (
          <Link to="/upgrade" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
            See plans
          </Link>
        ) : null}
      </section>
      {checkingOut && <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">Thanks for your payment. Unlocking your plan, this usually takes a few seconds…</p>}
      {billingError && <p className="text-sm text-danger">{billingError}</p>}
      {!preview && (
        <section className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-faint">Cloud backup</p>
            <p className={`mt-1 text-sm ${sync.state === 'error' ? 'text-danger' : ''}`}>{syncLine}</p>
            <p className="mt-1 text-xs text-faint">Your sessions, cards and notes sync to every device you sign in on.</p>
          </div>
          <button
            type="button"
            disabled={sync.state === 'syncing'}
            onClick={() => void syncNow()}
            className="shrink-0 rounded-xl border border-line px-4 py-2 text-sm text-dim hover:text-ink disabled:opacity-50"
          >
            Sync now
          </button>
        </section>
      )}
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
      {!preview && <DeleteAccount />}
      <p className="flex gap-4 text-xs text-faint">
        {LEGAL_LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="hover:text-dim">
            {l.label}
          </Link>
        ))}
      </p>
    </div>
  )
}

function DeleteAccount() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    setBusy(true)
    setError('')
    const res = await deleteAccount()
    if (!res.ok) {
      setError(res.error ?? 'Could not delete the account.')
      setBusy(false)
      return
    }
    // The account is gone on the server; clear this device too.
    await signOutCleanup(true)
    await supabase?.auth.signOut().catch(() => undefined)
    navigate('/', { replace: true })
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-sm text-faint underline hover:text-danger">
        Delete my account
      </button>
    )
  }
  return (
    <section className="rounded-2xl border border-danger/40 bg-surface p-5">
      <p className="font-medium text-danger">Delete your account?</p>
      <p className="mt-1 text-sm text-dim">This permanently deletes your account and all your study data on every device, and cancels any renewing plan. It can't be undone.</p>
      <label className="mt-4 flex flex-col gap-1 text-sm">
        Type DELETE to confirm
        <input value={typed} onChange={(e) => setTyped(e.target.value)} className="rounded-lg border border-line bg-surface-2 px-3 py-2" />
      </label>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button type="button" disabled={typed !== 'DELETE' || busy} onClick={() => void confirm()} className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Deleting…' : 'Delete forever'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-line px-4 py-2 text-sm text-dim hover:text-ink">
          Cancel
        </button>
      </div>
    </section>
  )
}
