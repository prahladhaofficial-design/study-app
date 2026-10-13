import { describe, expect, it } from 'vitest'
import { advance, initialCycle, phaseMinutes, shouldAutoStart } from './pomodoro'
import { DEFAULT_SETTINGS as S } from './settings'

describe('pomodoro cycle', () => {
  it('alternates focus and short breaks, with a long break every 4th', () => {
    let c = initialCycle
    const phases: string[] = []
    for (let i = 0; i < 9; i++) {
      c = advance(c, S)
      phases.push(c.phase)
    }
    expect(phases).toEqual(['short', 'focus', 'short', 'focus', 'short', 'focus', 'long', 'focus', 'short'])
  })

  it('uses the configured durations', () => {
    expect(phaseMinutes('focus', S)).toBe(25)
    expect(phaseMinutes('long', { ...S, longBreakMin: 30 })).toBe(30)
  })

  it('auto-starts according to settings', () => {
    expect(shouldAutoStart('short', { ...S, autoStartBreaks: true })).toBe(true)
    expect(shouldAutoStart('focus', S)).toBe(false)
  })
})
