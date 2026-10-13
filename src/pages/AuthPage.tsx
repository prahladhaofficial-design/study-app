import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { BRAND } from '../config/brand'
import { isNativeApp } from '../lib/platform'

export function AuthPage() {
  const { session, preview, signIn, signUp, signInWithGoogle, sendPasswordReset } = useAuth()
  const initial = (useLocation().state as { mode?: 'signin' } | null)?.mode ?? 'signup'
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initial)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session || preview) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    if (mode === 'forgot') {
      const err = await sendPasswordReset(email)
      setBusy(false)
      if (err) setError(err)
      else setNotice('If that email has an account, a reset link is on its way. Check your inbox and spam folder.')
      return
    }
    if (mode === 'signin') {
      const err = await signIn(email, password)
      setBusy(false)
      if (err) setError(err)
      return
    }
    const res = await signUp(email, password)
    setBusy(false)
    if (res.error) setError(res.error)
    else if (res.existing) {
      setMode('signin')
      setNotice('This email already has an account. Sign in below, or use "Forgot password?" if you need a new one.')
    } else setNotice('Check your inbox to confirm your email, then sign in.')
  }

  function switchMode(next: 'signin' | 'signup' | 'forgot') {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  return (
    <div className="grid min-h-full place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link to="/" aria-label={`${BRAND.name} home`}>
            <img src="/favicon.svg" alt="" className="size-12" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{mode === 'signup' ? `Start your ${BRAND.trialDays}-day free trial` : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}</h1>
          <p className="text-sm text-dim">{BRAND.tagline}</p>
        </div>

        {/* Google's sign-in redirect only returns to the website, so the apps use email for now. */}
        {BRAND.googleSignIn && !isNativeApp() && mode !== 'forgot' && (
          <>
            <button
              type="button"
              onClick={async () => setError(await signInWithGoogle())}
              className="w-full rounded-xl border border-line bg-surface py-3 text-sm font-medium hover:bg-surface-2"
            >
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-faint">
              <span className="h-px flex-1 bg-line" />
              or with email
              <span className="h-px flex-1 bg-line" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2.5 text-ink" />
          </label>
          {mode !== 'forgot' && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-center justify-between">
              Password
              {mode === 'signin' && (
                <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-accent">
                  Forgot password?
                </button>
              )}
            </span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-2.5 text-ink"
            />
          </label>
          )}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {notice && <p className="text-sm text-accent">{notice}</p>}
          <button type="submit" disabled={busy} className="mt-1 rounded-xl bg-accent py-3 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60">
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-dim">
          {mode === 'signup' ? 'Already have an account?' : mode === 'forgot' ? 'Remembered it?' : 'New here?'}{' '}
          <button type="button" className="font-medium text-accent" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </button>
        </p>
        <p className="mt-4 text-center text-xs text-faint">
          By continuing you agree to the{' '}
          <Link to="/terms" className="underline hover:text-dim">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline hover:text-dim">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
