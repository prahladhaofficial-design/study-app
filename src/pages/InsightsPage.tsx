import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, type ReactNode } from 'react'
import { Card, PageHeader } from '../components/ui'
import { db } from '../lib/db'
import { computeInsights } from '../lib/stats'
import { formatDuration } from '../lib/time'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-dim">{sub}</p>}
    </Card>
  )
}

function Bars({ items, label }: { items: { label: string; ms: number; title: string }[]; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.ms))
  return (
    <div role="img" aria-label={label} className="flex h-40 items-end gap-1.5">
      {items.map((i, idx) => (
        <div key={idx} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={i.title}>
          <div className="w-full rounded-t-md bg-accent/80" style={{ height: `${Math.max(i.ms > 0 ? 4 : 0, (i.ms / max) * 100)}%` }} />
          <span className="text-[10px] text-faint">{i.label}</span>
        </div>
      ))}
    </div>
  )
}

export function InsightsPage() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const r = useMemo(() => computeInsights(sessions, new Date()), [sessions])

  if (sessions.length === 0) {
    return (
      <div className="mx-auto max-w-4xl py-6">
        <PageHeader title="Insights" />
        <Card className="py-12 text-center text-dim">Your patterns appear here after a few sessions.</Card>
      </div>
    )
  }

  const change =
    r.weekChangePct === null ? 'First tracked week' : `${r.weekChangePct >= 0 ? '+' : ''}${r.weekChangePct}% vs last week`

  return (
    <div className="mx-auto max-w-4xl py-6">
      <PageHeader title="Insights" subtitle="How, when and how much you study." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total focus" value={formatDuration(r.totalMs)} sub={`${r.sessionCount} sessions`} />
        <Stat label="This week" value={formatDuration(r.thisWeekMs)} sub={change} />
        <Stat label="Avg session" value={formatDuration(r.avgSessionMs)} sub={`${formatDuration(r.avgPerActiveDayMs)} per active day`} />
        <Stat label="Consistency" value={`${Math.round(r.consistency * 100)}%`} sub={`${r.currentStreak}-day streak · best ${r.bestStreak}`} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-5">
        <Card className="md:col-span-3">
          <h2 className="mb-4 text-sm font-semibold">Last 14 days</h2>
          <Bars
            label="Study time per day over the last 14 days"
            items={r.last14.map((d) => ({
              label: String(d.date.getDate()),
              ms: d.ms,
              title: `${d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${formatDuration(d.ms)}`,
            }))}
          />
        </Card>
        <Card className="md:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Weekly rhythm</h2>
          <Bars
            label="Total study time by weekday"
            items={r.weekday.map((ms, i) => ({ label: WEEKDAYS[i], ms, title: `${WEEKDAYS[i]}: ${formatDuration(ms)}` }))}
          />
        </Card>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Highlights</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex justify-between"><span className="text-dim">Longest session</span><span className="font-mono">{formatDuration(r.longestSessionMs)}</span></li>
            <li className="flex justify-between"><span className="text-dim">Best streak</span><span className="font-mono">{r.bestStreak} days</span></li>
            <li className="flex justify-between"><span className="text-dim">Active days</span><span className="font-mono">{r.activeDays}</span></li>
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Best days</h2>
          <ol className="flex flex-col gap-2 text-sm">
            {r.bestDays.map((d, i) => (
              <li key={d.key} className="flex justify-between">
                <span className="text-dim">
                  {i + 1}. {d.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span className="font-mono">{formatDuration(d.ms)}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  )
}
