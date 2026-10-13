import { describe, expect, it } from 'vitest'
import { display, elapsed, initialTimer, isFinished, pause, reset, start } from './timer'

describe('timer engine', () => {
  it('stopwatch counts up across pause and resume', () => {
    let s = start(initialTimer('stopwatch'), 1_000)
    s = pause(s, 61_000)
    expect(elapsed(s, 999_999)).toBe(60_000)
    s = start(s, 100_000)
    expect(display(s, 130_000)).toBe(90_000)
    expect(s.sessionStartedAt).toBe(1_000)
  })

  it('countdown shows remaining time and finishes', () => {
    const s = start(initialTimer('countdown', 10_000), 0)
    expect(display(s, 4_000)).toBe(6_000)
    expect(isFinished(s, 9_999)).toBe(false)
    expect(isFinished(s, 12_000)).toBe(true)
    expect(display(s, 12_000)).toBe(0)
  })

  it('start is idempotent and reset clears progress', () => {
    const s = start(initialTimer(), 5)
    expect(start(s, 50)).toBe(s)
    expect(reset(s).accumulatedMs).toBe(0)
    expect(reset(s).runningSince).toBeNull()
  })
})
