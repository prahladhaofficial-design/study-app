import clsx from 'clsx'
import { Crown, EyeOff, Globe2, Pencil, RefreshCw, Trophy } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Card, PageHeader, Segmented } from '../components/ui'
import {
  COUNTRIES,
  countryName,
  fetchCountries,
  fetchLeaderboard,
  fetchProfile,
  flag,
  guessCountry,
  PERIOD_LABEL,
  periodSince,
  saveProfile,
  type ArenaPeriod,
  type ArenaProfile,
  type CountryRow,
  type LeaderRow,
} from '../lib/arena'
import { syncNow } from '../lib/sync'
import { formatDuration } from '../lib/time'

type Tab = 'people' | 'countries'

// Shown in preview mode only, so the screen can be explored without a backend.
const SAMPLE_PEOPLE: LeaderRow[] = [
  { rank: 1, display_name: 'Ananya', country_code: 'IN', minutes: 1960, is_me: false },
  { rank: 2, display_name: 'Lucas', country_code: 'BR', minutes: 1745, is_me: false },
  { rank: 3, display_name: 'Mei', country_code: 'SG', minutes: 1610, is_me: false },
  { rank: 4, display_name: 'You', country_code: 'IN', minutes: 1320, is_me: true },
  { rank: 5, display_name: 'Omar', country_code: 'EG', minutes: 1190, is_me: false },
  { rank: 6, display_name: 'Sofia', country_code: 'ES', minutes: 980, is_me: false },
  { rank: 7, display_name: 'Arjun', country_code: 'IN', minutes: 905, is_me: false },
]
const SAMPLE_COUNTRIES: CountryRow[] = [
  { country_code: 'IN', minutes: 48200, students: 41 },
  { country_code: 'US', minutes: 31950, students: 30 },
  { country_code: 'BR', minutes: 20410, students: 17 },
  { country_code: 'GB', minutes: 15880, students: 12 },
  { country_code: 'SG', minutes: 9120, students: 6 },
]

const MEDAL = ['text-[#f5c542]', 'text-[#c0c7cf]', 'text-[#d38b4f]']

export function ArenaPage() {
  const { session, preview } = useAuth()
  const uid = session?.user.id ?? null
  const [tab, setTab] = useState<Tab>('people')
  const [period, setPeriod] = useState<ArenaPeriod>('week')
  const [people, setPeople] = useState<LeaderRow[] | null>(null)
  const [countries, setCountries] = useState<CountryRow[] | null>(null)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<ArenaProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    if (preview) {
      setPeople(SAMPLE_PEOPLE)
      setCountries(SAMPLE_COUNTRIES)
      return
    }
    setLoading(true)
    setError('')
    try {
      // Upload recent sessions first so your own total is current.
      await syncNow()
      const since = periodSince(period, new Date())
      const [p, c] = await Promise.all([fetchLeaderboard(since), fetchCountries(since)])
      setPeople(p)
      setCountries(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the arena.')
    } finally {
      setLoading(false)
    }
  }, [period, preview])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (uid) void fetchProfile(uid).then(setProfile)
  }, [uid])

  const needsProfile = !preview && profile !== null && (!profile.display_name || !profile.country_code)
  const joined = !preview && profile !== null && !needsProfile
  const me = people?.find((r) => r.is_me)
  const top = countries?.[0]?.minutes ?? 1

  return (
    <div className="mx-auto max-w-4xl py-6">
      <PageHeader
        title="Study arena"
        subtitle="See how your focus time stacks up against students everywhere."
        actions={
          <div className="flex gap-2">
            {joined && !editing && (
              <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-xl border border-line px-3 text-sm text-dim hover:text-ink">
                <Pencil size={14} /> Edit profile
              </button>
            )}
          <button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh" className="grid size-10 place-items-center rounded-xl border border-line text-dim hover:text-ink disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          </div>
        }
      />

      {preview && <p className="mb-4 rounded-xl border border-warm/40 bg-warm/10 px-4 py-2 text-sm text-warm">Preview mode: showing sample data.</p>}
      {(needsProfile || editing) && uid && profile && (
        <JoinCard
          uid={uid}
          profile={profile}
          editing={!needsProfile}
          onCancel={() => setEditing(false)}
          onSaved={(p) => {
            setProfile(p)
            setEditing(false)
            void load()
          }}
        />
      )}
      {joined && profile?.arena_hidden && !editing && (
        <Card className="mb-5 flex items-center gap-3 text-sm text-dim">
          <EyeOff size={16} /> You're hidden from the arena. Your focus time doesn't appear on the leaderboard or in country totals.
        </Card>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="View"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'people', label: 'Leaderboard' },
            { value: 'countries', label: 'Countries' },
          ]}
        />
        <Segmented label="Period" value={period} onChange={setPeriod} options={(Object.keys(PERIOD_LABEL) as ArenaPeriod[]).map((p) => ({ value: p, label: PERIOD_LABEL[p] }))} />
      </div>

      {error && <Card className="mb-4 text-sm text-danger">{error}</Card>}

      {tab === 'people' && people && (
        <>
          {me && (
            <Card className="mb-4 flex items-center justify-between gap-3 border-accent/50">
              <div className="flex items-center gap-3">
                <Trophy size={20} className="text-accent" />
                <span>
                  You're <b>#{me.rank}</b> {PERIOD_LABEL[period].toLowerCase()}
                </span>
              </div>
              <span className="font-mono font-semibold">{formatDuration(me.minutes * 60_000)}</span>
            </Card>
          )}
          {people.length === 0 ? (
            <Card className="py-12 text-center text-dim">Nobody has logged focus time {PERIOD_LABEL[period].toLowerCase()} yet. Start a session and take first place.</Card>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {people.map((r) => (
                <li
                  key={`${r.rank}-${r.display_name}-${r.is_me}`}
                  className={clsx('flex items-center gap-3 rounded-xl border px-4 py-3', r.is_me ? 'border-accent/60 bg-accent/10' : 'border-line bg-surface')}
                >
                  <span className={clsx('w-8 text-center font-mono font-semibold', r.rank <= 3 ? MEDAL[r.rank - 1] : 'text-faint')}>
                    {r.rank <= 3 ? <Crown size={16} className="mx-auto" /> : r.rank}
                  </span>
                  <span className="text-lg" title={r.country_code ? countryName(r.country_code) : undefined}>
                    {flag(r.country_code)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {r.display_name}
                    {r.is_me && <span className="ml-2 text-xs text-accent">you</span>}
                  </span>
                  <span className="font-mono text-sm tabular-nums">{formatDuration(r.minutes * 60_000)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {tab === 'countries' && countries && (
        <>
          {countries.length === 0 ? (
            <Card className="py-12 text-center text-dim">No country totals yet. Set your country to put it on the board.</Card>
          ) : (
            <ol className="flex flex-col gap-2">
              {countries.map((c, i) => {
                const mine = c.country_code === profile?.country_code || (preview && c.country_code === 'IN')
                return (
                  <li key={c.country_code} className={clsx('rounded-xl border px-4 py-3', mine ? 'border-accent/60' : 'border-line', 'bg-surface')}>
                    <div className="mb-2 flex items-center gap-3">
                      <span className="w-6 font-mono text-sm text-faint">{i + 1}</span>
                      <span className="text-xl">{flag(c.country_code)}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{countryName(c.country_code)}</span>
                      <span className="text-xs text-faint">
                        {c.students} student{c.students === 1 ? '' : 's'}
                      </span>
                      <span className="w-20 text-right font-mono text-sm tabular-nums">{formatDuration(c.minutes * 60_000)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className={clsx('h-full rounded-full', mine ? 'bg-accent' : 'bg-dim/60')} style={{ width: `${Math.max(2, (c.minutes / top) * 100)}%` }} />
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
            <Globe2 size={12} /> Every minute you focus adds to your country's total.
          </p>
        </>
      )}
    </div>
  )
}

function JoinCard({
  uid,
  profile,
  editing,
  onSaved,
  onCancel,
}: {
  uid: string
  profile: ArenaProfile
  editing: boolean
  onSaved: (p: ArenaProfile) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(profile.display_name ?? '')
  const [hidden, setHidden] = useState(profile.arena_hidden)
  const [country, setCountry] = useState(profile.country_code ?? guessCountry(navigator.languages ?? []) ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const p = { display_name: name.trim().slice(0, 24) || null, country_code: country || null, arena_hidden: hidden }
    if (!p.display_name || !p.country_code) return setError('Pick a name and a country.')
    setBusy(true)
    const err = await saveProfile(uid, p)
    setBusy(false)
    if (err) setError(err)
    else onSaved(p)
  }

  return (
    <Card className="mb-5">
      <p className="font-medium">{editing ? 'Your arena profile' : 'Join the arena'}</p>
      <p className="mb-3 text-sm text-dim">Choose how you appear on the leaderboard. Only your name, country and focus time are shown. Timed sessions count, up to 16 hours a day; sessions added by hand don't.</p>
      <form onSubmit={(e) => void submit(e)} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
          Display name
          <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya" className="rounded-lg border border-line bg-surface-2 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Country
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-lg border border-line bg-surface-2 px-3 py-2">
            <option value="">Choose…</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {flag(c.code)} {c.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={busy} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-60">
          {busy ? 'Saving…' : editing ? 'Save' : 'Join'}
        </button>
        {editing && (
          <button type="button" onClick={onCancel} className="rounded-xl border border-line px-4 py-2.5 text-sm text-dim hover:text-ink">
            Cancel
          </button>
        )}
        <label className="flex w-full items-center gap-2 text-sm text-dim">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          Hide me from the leaderboard and country totals
        </label>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  )
}
