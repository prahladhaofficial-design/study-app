import { describe, expect, it } from 'vitest'
import { computeInsights } from './stats'

const H = 3_600_000
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).getTime()
const today = new Date(2026, 9, 14, 18) // Wed 14 Oct 2026

describe('computeInsights', () => {
  const sessions = [
    { startedAt: at(2026, 10, 14), durationMs: 2 * H },
    { startedAt: at(2026, 10, 13), durationMs: 1 * H },
    { startedAt: at(2026, 10, 12), durationMs: 1 * H }, // Monday: this week starts here
    { startedAt: at(2026, 10, 8), durationMs: 2 * H }, // last week
    { startedAt: at(2026, 10, 1), durationMs: 0.5 * H },
    { startedAt: at(2026, 9, 30), durationMs: 0.5 * H },
  ]
  const r = computeInsights(sessions, today)

  it('totals and averages', () => {
    expect(r.totalMs).toBe(7 * H)
    expect(r.sessionCount).toBe(6)
    expect(r.activeDays).toBe(6)
    expect(r.longestSessionMs).toBe(2 * H)
  })

  it('compares this week with last week (Monday start)', () => {
    expect(r.thisWeekMs).toBe(4 * H)
    expect(r.lastWeekMs).toBe(2 * H)
    expect(r.weekChangePct).toBe(100)
  })

  it('tracks streaks', () => {
    expect(r.currentStreak).toBe(3)
    expect(r.bestStreak).toBe(3)
  })

  it('builds the 14-day trend ending today', () => {
    expect(r.last14).toHaveLength(14)
    expect(r.last14[13].key).toBe('2026-10-14')
    expect(r.last14[13].ms).toBe(2 * H)
  })

  it('handles no sessions', () => {
    const e = computeInsights([], today)
    expect(e.weekChangePct).toBeNull()
    expect(e.avgSessionMs).toBe(0)
    expect(e.consistency).toBe(0)
  })
})
