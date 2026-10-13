import { describe, expect, it } from 'vitest'
import { newCardState, previewLabel, review } from './srs'

const now = 1_700_000_000_000
const DAY = 86_400_000

describe('spaced repetition', () => {
  it('schedules a new card by grade', () => {
    const c = newCardState(now)
    expect(review(c, 'again', now).due - now).toBe(10 * 60_000)
    expect(review(c, 'hard', now).due - now).toBe(30 * 60_000)
    expect(review(c, 'good', now).intervalDays).toBe(1)
    expect(review(c, 'easy', now).intervalDays).toBe(4)
  })

  it('grows intervals with repeated good answers', () => {
    let c = newCardState(now)
    const intervals: number[] = []
    for (let i = 0; i < 5; i++) {
      c = review(c, 'good', now)
      intervals.push(c.intervalDays)
    }
    expect(intervals).toEqual([1, 3, 8, 20, 50])
  })

  it('a lapse resets progress and lowers ease', () => {
    let c = review(review(newCardState(now), 'good', now), 'good', now)
    c = review(c, 'again', now)
    expect(c.reps).toBe(0)
    expect(c.lapses).toBe(1)
    expect(c.ease).toBeCloseTo(2.3)
  })

  it('never lets ease drop below the floor', () => {
    let c = newCardState(now)
    for (let i = 0; i < 20; i++) c = review(c, 'again', now)
    expect(c.ease).toBe(1.3)
  })

  it('labels the next interval', () => {
    const c = newCardState(now)
    expect(previewLabel(c, 'again', now)).toBe('10m')
    expect(previewLabel(c, 'easy', now)).toBe('4d')
    expect(previewLabel({ ...c, reps: 5, intervalDays: 200 }, 'good', now)).toBe('1.4y')
    expect(review(c, 'good', now).due).toBe(now + DAY)
  })
})
