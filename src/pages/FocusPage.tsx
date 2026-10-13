import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { HeatLegend, Heatmap } from '../components/Heatmap'
import { TimerBar } from '../components/TimerBar'
import { db } from '../lib/db'
import { currentStreak } from '../lib/heatmap'
import { dayKey, formatDuration } from '../lib/time'

export function FocusPage() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])

  const { minutesByDay, totalMs } = useMemo(() => {
    const byDay: Record<string, number> = {}
    let total = 0
    for (const s of sessions) {
      const k = dayKey(new Date(s.startedAt))
      byDay[k] = (byDay[k] ?? 0) + s.durationMs / 60_000
      total += s.durationMs
    }
    return { minutesByDay: byDay, totalMs: total }
  }, [sessions])

  const streak = currentStreak(new Date(), minutesByDay)
  const todayMin = Math.round(minutesByDay[dayKey(new Date())] ?? 0)

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center gap-10 py-6">
      <p className="text-center text-dim">
        {sessions.length === 0
          ? 'Press start and your first square lights up.'
          : `Today ${formatDuration(todayMin * 60_000)} · ${streak}-day streak`}
      </p>

      <section aria-label="Study activity" className="w-full rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <Heatmap minutesByDay={minutesByDay} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-xs text-dim">
            {formatDuration(totalMs)} total · {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
          </span>
          <HeatLegend />
        </div>
      </section>

      <TimerBar />
    </div>
  )
}
