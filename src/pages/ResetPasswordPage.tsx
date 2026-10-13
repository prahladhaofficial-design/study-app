import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { BRAND } from '../config/brand'

/** Where the password reset email lands. The link signs the user in; here they choose a new password. */
export function ResetPasswordPage() {
  const { loading, session, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) return setError("The two passwords don't match.")
    setBusy(true)
    setError(null)
    const err = await updatePassword(password)
    setBusy(false)
    if (err) setError(err)
    else navigate('/', { replace: true, state: { passwordChanged: true } })
  }

  return (
    <div className="grid min-h-full place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link to="/" aria-label={`${BRAND.name} home`}>
            <img src="/favicon.svg" alt="" className="size-12" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        </div>
        {loading ? (
          <p className="text-center text-dim">Loading…</p>
        ) : !session ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-dim">This reset link has expired or was already used. Request a new one from the sign-in page.</p>
            <Link to="/login" state={{ mode: 'signin' }} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              New password
              <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2.5 text-ink" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Type it again
              <input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2.5 text-ink" />
            </label>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <button type="submit" disabled={busy} className="mt-1 rounded-xl bg-accent py-3 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60">
              {busy ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
