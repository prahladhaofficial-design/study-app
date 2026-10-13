import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BRAND } from '../config/brand'
import { bestAccess, type AccessResult } from '../lib/access'
import { isNativeApp } from '../lib/platform'
import { isPreviewMode, supabase } from '../lib/supabase'
import { signOutCleanup, startSync, stopSync } from '../lib/sync'

interface AuthContextValue {
  loading: boolean
  session: Session | null
  email: string | null
  access: AccessResult | null
  preview: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signInWithGoogle: () => Promise<string | null>
  signOut: () => Promise<void>
  refreshAccess: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// In preview mode (no Supabase keys) we pretend the visitor is mid-trial so
// every screen can be explored without a backend.
const previewAccess = (): AccessResult => ({
  allowed: true,
  reason: 'trial',
  until: new Date(Date.now() + BRAND.trialDays * 86_400_000),
})

async function loadAccess(userId: string): Promise<AccessResult> {
  if (!supabase) return previewAccess()
  const [{ data: profile }, { data: subs }] = await Promise.all([
    supabase.from('profiles').select('trial_ends_at').eq('id', userId).maybeSingle(),
    supabase.from('subscriptions').select('plan,status,current_period_end').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
  ])
  return bestAccess(
    profile?.trial_ends_at ?? null,
    (subs ?? []).map((s) => ({ plan: s.plan, status: s.status, currentPeriodEnd: s.current_period_end })),
    new Date(),
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(!isPreviewMode)
  const [session, setSession] = useState<Session | null>(null)
  const [access, setAccess] = useState<AccessResult | null>(isPreviewMode ? previewAccess() : null)

  const refreshAccess = useCallback(async () => {
    const uid = session?.user.id
    setAccess(uid ? await loadAccess(uid) : isPreviewMode ? previewAccess() : null)
  }, [session])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isPreviewMode) return
    void refreshAccess()
    // Re-check the plan when the user comes back, for example after paying in the browser.
    const onVisible = () => document.visibilityState === 'visible' && void refreshAccess()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshAccess])

  const uid = session?.user.id
  useEffect(() => {
    if (!supabase || !uid) return
    void startSync(supabase, uid)
    return () => stopSync()
  }, [uid])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      email: session?.user.email ?? (isPreviewMode ? 'preview@local' : null),
      access,
      preview: isPreviewMode,
      async signIn(email, password) {
        if (!supabase) return null
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return error?.message ?? null
      },
      async signUp(email, password) {
        if (!supabase) return null
        const { error } = await supabase.auth.signUp({
          email,
          password,
          // Confirmation links open the website; the apps have no web address of their own.
          options: { emailRedirectTo: isNativeApp() ? BRAND.siteUrl : window.location.origin },
        })
        return error?.message ?? null
      },
      async signInWithGoogle() {
        if (!supabase) return null
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        })
        return error?.message ?? null
      },
      async signOut() {
        // Upload pending changes, then clear this account's data from the device.
        if (!(await signOutCleanup())) {
          if (!window.confirm("Some changes haven't been backed up yet (you may be offline). Sign out anyway and lose them?")) return
          await signOutCleanup(true)
        }
        await supabase?.auth.signOut()
      },
      refreshAccess,
    }),
    [loading, session, access, refreshAccess],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
