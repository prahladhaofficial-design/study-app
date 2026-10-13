import { describe, expect, it } from 'vitest'
import { buildHeatmap, currentStreak, levelFor } from './heatmap'

describe('heatmap', () => {
  it('maps minutes to levels', () => {
    expect(levelFor(0)).toBe(0)
    expect(levelFor(1)).toBe(1)
    expect(levelFor(44)).toBe(2)
    expect(levelFor(45)).toBe(3)
    expect(levelFor(500)).toBe(5)
  })

  it('builds Sunday-first weeks ending on the current week', () => {
    const today = new Date(2026, 9, 13) // Tue 13 Oct 2026
    const cols = buildHeatmap(today, { '2026-10-13': 30 }, 2)
    expect(cols).toHaveLength(2)
    expect(cols[0][0].date.getDay()).toBe(0)
    const todayCell = cols[1][2]
    expect(todayCell.key).toBe('2026-10-13')
    expect(todayCell.minutes).toBe(30)
    expect(cols[1][3].outside).toBe(true)
  })

  it('counts streaks that end today or yesterday', () => {
    const today = new Date(2026, 9, 13)
    const data = { '2026-10-11': 10, '2026-10-12': 5 }
    expect(currentStreak(today, data)).toBe(2)
    expect(currentStreak(today, { ...data, '2026-10-13': 1 })).toBe(3)
    expect(currentStreak(today, { '2026-10-10': 5 })).toBe(0)
  })
})
