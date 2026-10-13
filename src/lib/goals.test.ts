import { describe, expect, it } from 'vitest'
import { dailyGoalStreak, goalProgress, periodStart } from './goals'

const at = (d: number, h = 10) => new Date(2026, 9, d, h).getTime()
const now = new Date(2026, 9, 14, 20) // Wed 14 Oct
const sessions = [
  { startedAt: at(14), durationMs: 50 * 60_000, subject: 'Physics' },
  { startedAt: at(14, 15), durationMs: 20 * 60_000, subject: 'Maths' },
  { startedAt: at(13), durationMs: 60 * 60_000, subject: 'physics ' },
  { startedAt: at(12), durationMs: 90 * 60_000, subject: 'Physics' },
  { startedAt: at(10), durationMs: 120 * 60_000, subject: 'Physics' }, // previous week
]

describe('goals', () => {
  it('weekly window starts Monday', () => {
    expect(periodStart('weekly', now).getDate()).toBe(12)
  })

  it('daily progress counts today only', () => {
    expect(goalProgress({ period: 'daily', minutes: 60, subject: null }, sessions, now)).toEqual({ doneMinutes: 70, ratio: 1, complete: true })
  })

  it('subject filter is case and space insensitive', () => {
    const p = goalProgress({ period: 'weekly', minutes: 400, subject: 'Physics' }, sessions, now)
    expect(p.doneMinutes).toBe(200)
    expect(p.ratio).toBeCloseTo(0.5)
    expect(p.complete).toBe(false)
  })

  it('daily goal streak', () => {
    expect(dailyGoalStreak({ period: 'daily', minutes: 45, subject: 'Physics' }, sessions, now)).toBe(3)
  })
})
