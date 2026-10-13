import { dayKey } from './time'

/** Minute thresholds for intensity levels 1..5 (level 0 = no study). */
export const HEAT_THRESHOLDS = [1, 15, 45, 90, 180] as const

export function levelFor(minutes: number): number {
  let level = 0
  HEAT_THRESHOLDS.forEach((t, i) => {
    if (minutes >= t) level = i + 1
  })
  return level
}

export interface HeatCell {
  key: string
  date: Date
  minutes: number
  level: number
  /** True for padding cells before the range start or after today. */
  outside: boolean
}

/**
 * Builds week columns (Sunday-first) covering the last `weeks` weeks up to `today`.
 * `minutesByDay` maps dayKey -> minutes studied.
 */
export function buildHeatmap(today: Date, minutesByDay: Record<string, number>, weeks = 53): HeatCell[][] {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(end)
  start.setDate(end.getDate() - end.getDay() - (weeks - 1) * 7)
  const columns: HeatCell[][] = []
  const cursor = new Date(start)
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor)
      const key = dayKey(date)
      const minutes = minutesByDay[key] ?? 0
      col.push({ key, date, minutes, level: levelFor(minutes), outside: date > end })
      cursor.setDate(cursor.getDate() + 1)
    }
    columns.push(col)
  }
  return columns
}

/** Consecutive days with study ending today (or yesterday, so a streak survives until midnight). */
export function currentStreak(today: Date, minutesByDay: Record<string, number>): number {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (!minutesByDay[dayKey(d)]) d.setDate(d.getDate() - 1)
  let streak = 0
  while ((minutesByDay[dayKey(d)] ?? 0) > 0) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}
