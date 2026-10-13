// Timestamp-based timer engine. Elapsed time is derived from Date.now(),
// so background tabs, sleep and throttled intervals never lose time.

export type TimerMode = 'stopwatch' | 'countdown' | 'pomodoro'

export interface TimerState {
  mode: TimerMode
  /** Countdown length in ms (ignored by the stopwatch). */
  targetMs: number
  /** Epoch ms when the current run segment started, or null when paused. */
  runningSince: number | null
  /** Time banked from previous run segments. */
  accumulatedMs: number
  /** Epoch ms when the session first started, or null if never started. */
  sessionStartedAt: number | null
}

export const initialTimer = (mode: TimerMode = 'stopwatch', targetMs = 25 * 60_000): TimerState => ({
  mode,
  targetMs,
  runningSince: null,
  accumulatedMs: 0,
  sessionStartedAt: null,
})

/** Countdown and pomodoro both count down to targetMs. */
export const countsDown = (mode: TimerMode) => mode !== 'stopwatch'

export function elapsed(state: TimerState, now: number): number {
  const live = state.runningSince === null ? 0 : now - state.runningSince
  const total = state.accumulatedMs + live
  return countsDown(state.mode) ? Math.min(total, state.targetMs) : total
}

/** What the clock face shows: elapsed for stopwatch, remaining for countdown. */
export function display(state: TimerState, now: number): number {
  const e = elapsed(state, now)
  return countsDown(state.mode) ? state.targetMs - e : e
}

export function isFinished(state: TimerState, now: number): boolean {
  return countsDown(state.mode) && elapsed(state, now) >= state.targetMs
}

export function start(state: TimerState, now: number): TimerState {
  if (state.runningSince !== null) return state
  return { ...state, runningSince: now, sessionStartedAt: state.sessionStartedAt ?? now }
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.runningSince === null) return state
  return { ...state, accumulatedMs: elapsed(state, now), runningSince: null }
}

export function reset(state: TimerState): TimerState {
  return initialTimer(state.mode, state.targetMs)
}

export function setMode(state: TimerState, mode: TimerMode, targetMs = state.targetMs): TimerState {
  return initialTimer(mode, targetMs)
}

export function setTarget(state: TimerState, targetMs: number): TimerState {
  return { ...initialTimer(state.mode, targetMs) }
}
