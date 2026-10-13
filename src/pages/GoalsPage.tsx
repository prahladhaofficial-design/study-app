import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Card, PageHeader, Segmented } from '../components/ui'
import { db, newId, type Goal } from '../lib/db'
import { dailyGoalStreak, goalProgress, periodStart } from '../lib/goals'
import { formatDuration } from '../lib/time'

type Period = Goal['period']

export function GoalsPage() {
  const goals = useLiveQuery(() => db.goals.orderBy('updatedAt').toArray(), [], [])
  // Daily streaks look back over the past year at most.
  const sessions = useLiveQuery(() => db.sessions.where('startedAt').above(Date.now() - 366 * 86_400_000).toArray(), [], [])
  const [period, setPeriod] = useState<Period>('daily')
  const [hours, setHours] = useState('2')
  const [subject, setSubject] = useState('')
  const now = new Date()

  async function add(e: FormEvent) {
    e.preventDefault()
    const minutes = Math.round(parseFloat(hours) * 60)
    if (!minutes || minutes <= 0) return
    const t = Date.now()
    await db.goals.add({ id: newId(), period, minutes, subject: subject.trim() || null, createdAt: t, updatedAt: t })
    setSubject('')
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this goal?')) return
    await db.goals.delete(id)
  }

  const subjects = [...new Set(sessions.map((s) => s.subject).filter((s): s is string => !!s))]

  return (
    <div className="mx-auto max-w-4xl py-6">
      <PageHeader title="Goals" subtitle="Set a daily or weekly target. Every focus session counts towards it automatically." />

      <Card className="mb-6">
        <form onSubmit={(e) => void add(e)} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 text-sm">
            Every
            <Segmented
              label="Period"
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'daily', label: 'Day' },
                { value: 'weekly', label: 'Week' },
              ]}
            />
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Hours
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-24 rounded-lg border border-line bg-surface-2 px-3 py-2"
            />
          </label>
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
            Subject (optional)
            <input
              list="goal-subjects"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="All subjects"
              className="rounded-lg border border-line bg-surface-2 px-3 py-2"
            />
            <datalist id="goal-subjects">
              {subjects.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <button type="submit" className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink">
            <Plus size={16} /> Add goal
          </button>
        </form>
      </Card>

      {goals.length === 0 ? (
        <Card className="py-12 text-center text-dim">No goals yet. Most people start with 2 hours a day.</Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => {
            const p = goalProgress(g, sessions, now)
            const streak = dailyGoalStreak(g, sessions, now)
            const left = Math.max(0, g.minutes - p.doneMinutes)
            const since = periodStart(g.period, now)
            return (
              <li key={g.id}>
                <Card className="group flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-faint">{g.period === 'daily' ? 'Today' : `Week of ${since.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}</p>
                      <p className="mt-1 font-medium">
                        {formatDuration(g.minutes * 60_000)} {g.subject ? `of ${g.subject}` : 'of focus'}
                      </p>
                    </div>
                    <button type="button" aria-label="Delete goal" onClick={() => void remove(g.id)} className="p-1 text-faint opacity-0 hover:text-danger group-hover:opacity-100 focus:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <Ring ratio={p.ratio} label={`${Math.round(p.ratio * 100)}%`} complete={p.complete} />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dim">{p.complete ? 'Goal reached. Nice work.' : `${formatDuration(left * 60_000)} to go`}</span>
                    {g.period === 'daily' && streak > 0 && (
                      <span className="inline-flex items-center gap-1 text-warm">
                        <Flame size={14} /> {streak} day{streak === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Ring({ ratio, label, complete }: { ratio: number; label: string; complete: boolean }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative mx-auto size-36">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-surface-2" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className={complete ? 'stroke-warm transition-all' : 'stroke-accent transition-all'}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-2xl font-bold">{label}</span>
    </div>
  )
}
