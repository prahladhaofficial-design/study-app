import { dayKey } from './time'

export interface SessionLike {
  startedAt: number
  durationMs: number
}

export interface Insights {
  totalMs: number
  sessionCount: number
  thisWeekMs: number
  lastWeekMs: number
  /** Percent change week over week, or null when last week was empty. */
  weekChangePct: number | null
  avgSessionMs: number
  avgPerActiveDayMs: number
  activeDays: number
  /** Share of the last 30 days with any study, 0..1. */
  consistency: number
  currentStreak: number
  bestStreak: number
  longestSessionMs: number
  /** Oldest first. */
  last14: { key: string; date: Date; ms: number }[]
  /** Sunday-first totals. */
  weekday: number[]
  bestDays: { key: string; date: Date; ms: number }[]
}

const DAY = 86_400_000

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Monday-based start of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const s = startOfDay(d)
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7))
  return s
}

function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function computeInsights(sessions: SessionLike[], today: Date): Insights {
  const byDay = new Map<string, number>()
  const weekday = [0, 0, 0, 0, 0, 0, 0]
  let totalMs = 0
  let longest = 0
  const weekStart = startOfWeek(today).getTime()
  const lastWeekStart = weekStart - 7 * DAY
  let thisWeekMs = 0
  let lastWeekMs = 0

  for (const s of sessions) {
    const started = new Date(s.startedAt)
    const k = dayKey(started)
    byDay.set(k, (byDay.get(k) ?? 0) + s.durationMs)
    weekday[started.getDay()] += s.durationMs
    totalMs += s.durationMs
    longest = Math.max(longest, s.durationMs)
    if (s.startedAt >= weekStart) thisWeekMs += s.durationMs
    else if (s.startedAt >= lastWeekStart) lastWeekMs += s.durationMs
  }

  const activeDays = byDay.size
  const t0 = startOfDay(today)

  let active30 = 0
  for (let i = 0; i < 30; i++) if (byDay.has(dayKey(addDays(t0, -i)))) active30++

  let currentStreak = 0
  let cursor = byDay.has(dayKey(t0)) ? t0 : addDays(t0, -1)
  while (byDay.has(dayKey(cursor))) {
    currentStreak++
    cursor = addDays(cursor, -1)
  }

  let bestStreak = 0
  let run = 0
  let prev: Date | null = null
  for (const k of [...byDay.keys()].sort()) {
    const d = keyToDate(k)
    run = prev && dayKey(addDays(prev, 1)) === k ? run + 1 : 1
    bestStreak = Math.max(bestStreak, run)
    prev = d
  }

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(t0, i - 13)
    const key = dayKey(date)
    return { key, date, ms: byDay.get(key) ?? 0 }
  })

  const bestDays = [...byDay.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, ms]) => ({ key, date: keyToDate(key), ms }))

  return {
    totalMs,
    sessionCount: sessions.length,
    thisWeekMs,
    lastWeekMs,
    weekChangePct: lastWeekMs > 0 ? Math.round(((thisWeekMs - lastWeekMs) / lastWeekMs) * 100) : null,
    avgSessionMs: sessions.length ? totalMs / sessions.length : 0,
    avgPerActiveDayMs: activeDays ? totalMs / activeDays : 0,
    activeDays,
    consistency: active30 / 30,
    currentStreak,
    bestStreak,
    longestSessionMs: longest,
    last14,
    weekday,
    bestDays,
  }
}
