import { describe, expect, it } from 'vitest'
import { projectStats } from './projects'

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).getTime()
const s = (startedAt: number, minutes: number, subject: string | null) => ({ startedAt, durationMs: minutes * 60_000, subject })

describe('projectStats', () => {
  const now = new Date(2026, 9, 13, 12)
  const sessions = [s(at(2026, 10, 1), 90, 'Physics'), s(at(2026, 10, 12), 30, ' physics '), s(at(2026, 10, 12), 60, 'Maths'), s(at(2026, 10, 12), 60, null)]

  it('counts sessions whose subject matches the project name', () => {
    const r = projectStats({ name: 'Physics', targetHours: 10, deadline: null }, sessions, now)
    expect(r.hours).toBe(2)
    expect(r.sessions).toBe(2)
    expect(r.ratio).toBeCloseTo(0.2)
    expect(r.lastStudied).toBe(at(2026, 10, 12))
    expect(r.daysLeft).toBeNull()
  })

  it('works out the daily pace needed for a deadline', () => {
    const r = projectStats({ name: 'Physics', targetHours: 10, deadline: '2026-10-16' }, sessions, now)
    expect(r.daysLeft).toBe(4)
    expect(r.perDayNeeded).toBe(2)
  })

  it('reports a passed deadline as negative days and no pace', () => {
    const r = projectStats({ name: 'Physics', targetHours: 10, deadline: '2026-10-10' }, sessions, now)
    expect(r.daysLeft).toBe(-2)
    expect(r.perDayNeeded).toBeNull()
  })
})
