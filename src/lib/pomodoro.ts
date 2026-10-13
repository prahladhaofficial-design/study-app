import type { Settings } from './settings'

export type Phase = 'focus' | 'short' | 'long'

export interface Cycle {
  phase: Phase
  /** Focus blocks finished in the current set. */
  completedFocus: number
}

export const initialCycle: Cycle = { phase: 'focus', completedFocus: 0 }

export function phaseMinutes(phase: Phase, s: Settings): number {
  return phase === 'focus' ? s.focusMin : phase === 'short' ? s.shortBreakMin : s.longBreakMin
}

/** Moves to the next phase after the current one completes. */
export function advance(cycle: Cycle, s: Settings): Cycle {
  if (cycle.phase !== 'focus') {
    return { phase: 'focus', completedFocus: cycle.phase === 'long' ? 0 : cycle.completedFocus }
  }
  const done = cycle.completedFocus + 1
  return { phase: done % s.longBreakEvery === 0 ? 'long' : 'short', completedFocus: done }
}

export function shouldAutoStart(next: Phase, s: Settings): boolean {
  return next === 'focus' ? s.autoStartFocus : s.autoStartBreaks
}

export const PHASE_LABEL: Record<Phase, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' }
