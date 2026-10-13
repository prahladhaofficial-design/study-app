import { dayKey } from './time'

export interface GoalLike {
  period: 'daily' | 'weekly'
  minutes: number
  subject: string | null
}

export interface SessionLike {
  startedAt: number
  durationMs: number
  subject: string | null
}

/** Start of the current goal window: today, or Monday of this week. */
export function periodStart(period: GoalLike['period'], now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'weekly') d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export interface GoalProgress {
  doneMinutes: number
  ratio: number
  complete: boolean
}

export function goalProgress(goal: GoalLike, sessions: SessionLike[], now: Date): GoalProgress {
  const from = periodStart(goal.period, now).getTime()
  const subject = goal.subject?.trim().toLowerCase() || null
  let ms = 0
  for (const s of sessions) {
    if (s.startedAt < from) continue
    if (subject && s.subject?.trim().toLowerCase() !== subject) continue
    ms += s.durationMs
  }
  const doneMinutes = Math.floor(ms / 60_000)
  const ratio = goal.minutes > 0 ? Math.min(1, doneMinutes / goal.minutes) : 0
  return { doneMinutes, ratio, complete: doneMinutes >= goal.minutes }
}

/** Consecutive past days (ending yesterday or today) on which a daily goal was met. */
export function dailyGoalStreak(goal: GoalLike, sessions: SessionLike[], now: Date): number {
  if (goal.period !== 'daily') return 0
  const subject = goal.subject?.trim().toLowerCase() || null
  const perDay = new Map<string, number>()
  for (const s of sessions) {
    if (subject && s.subject?.trim().toLowerCase() !== subject) continue
    const k = dayKey(new Date(s.startedAt))
    perDay.set(k, (perDay.get(k) ?? 0) + s.durationMs)
  }
  const met = (d: Date) => (perDay.get(dayKey(d)) ?? 0) >= goal.minutes * 60_000
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!met(d)) d.setDate(d.getDate() - 1)
  let streak = 0
  while (met(d)) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}
