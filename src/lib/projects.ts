import type { SessionLike } from './goals'

export const PROJECT_COLORS = ['#14b8a6', '#f59e0b', '#60a5fa', '#a78bfa', '#f472b6', '#4ade80', '#ef4444']

export interface ProjectLike {
  name: string
  targetHours: number
  deadline: string | null
}

export interface ProjectStats {
  hours: number
  ratio: number
  sessions: number
  lastStudied: number | null
  /** Whole days until the deadline, counting today; null without one. Negative once passed. */
  daysLeft: number | null
  /** Hours per day still needed to hit the target by the deadline. */
  perDayNeeded: number | null
}

const norm = (s: string | null) => s?.trim().toLowerCase() ?? ''

export function projectStats(p: ProjectLike, sessions: SessionLike[], now: Date): ProjectStats {
  const name = norm(p.name)
  let ms = 0
  let count = 0
  let last: number | null = null
  for (const s of sessions) {
    if (norm(s.subject) !== name) continue
    ms += s.durationMs
    count++
    if (last === null || s.startedAt > last) last = s.startedAt
  }
  const hours = ms / 3_600_000
  const ratio = p.targetHours > 0 ? Math.min(1, hours / p.targetHours) : 0

  let daysLeft: number | null = null
  let perDayNeeded: number | null = null
  if (p.deadline) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const [y, m, d] = p.deadline.split('-').map(Number)
    const due = new Date(y, m - 1, d).getTime()
    // Round to absorb daylight-saving shifts; today counts as a day to study.
    daysLeft = Math.round((due - today) / 86_400_000) + 1
    const remaining = Math.max(0, p.targetHours - hours)
    perDayNeeded = daysLeft > 0 && p.targetHours > 0 ? remaining / daysLeft : null
  }
  return { hours, ratio, sessions: count, lastStudied: last, daysLeft, perDayNeeded }
}
