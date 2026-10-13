// The one running timer for the whole app. It lives outside any page so it
// keeps going when you switch pages, and it's saved to localStorage so a
// refresh, a closed tab or a crash never loses a session.

import { useSyncExternalStore } from 'react'
import { notify, playAlert } from './alerts'
import { saveSession } from './db'
import { advance, initialCycle, PHASE_LABEL, phaseMinutes, shouldAutoStart, type Cycle } from './pomodoro'
import { getSettings } from './settings'
import * as T from './timer'

export interface TimerSnapshot {
  state: T.TimerState
  cycle: Cycle
  subject: string
}

const KEY = 'timer.v2'
const OLD_MODE_KEY = 'timer.mode'
const OLD_SUBJECT_KEY = 'timer.subject'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function fresh(): TimerSnapshot {
  const m = read(OLD_MODE_KEY)
  const mode: T.TimerMode = m === 'countdown' || m === 'pomodoro' ? m : 'stopwatch'
  return {
    state: T.initialTimer(mode, (mode === 'pomodoro' ? getSettings().focusMin : 25) * 60_000),
    cycle: initialCycle,
    subject: read(OLD_SUBJECT_KEY) ?? '',
  }
}

/** Reads a saved snapshot, falling back to a fresh timer when it's missing or malformed. */
export function parseSnapshot(raw: string | null): TimerSnapshot | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as TimerSnapshot
    const s = v?.state
    const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x)
    const numOrNull = (x: unknown) => x === null || num(x)
    if (!s || !['stopwatch', 'countdown', 'pomodoro'].includes(s.mode)) return null
    if (!num(s.targetMs) || !num(s.accumulatedMs) || !numOrNull(s.runningSince) || !numOrNull(s.sessionStartedAt)) return null
    const cycle = v.cycle && ['focus', 'short', 'long'].includes(v.cycle.phase) && num(v.cycle.completedFocus) ? v.cycle : initialCycle
    return { state: s, cycle, subject: typeof v.subject === 'string' ? v.subject : '' }
  } catch {
    return null
  }
}

let current: TimerSnapshot = parseSnapshot(read(KEY)) ?? fresh()
const listeners = new Set<() => void>()

function set(next: TimerSnapshot) {
  current = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* the timer still works for this visit */
  }
  listeners.forEach((l) => l())
}

// Another tab changed the timer: follow it so both tabs show the same clock.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    const next = parseSnapshot(e.newValue)
    if (next) {
      current = next
      listeners.forEach((l) => l())
    }
  })
}

export function getTimer(): TimerSnapshot {
  return current
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useTimer(): TimerSnapshot {
  return useSyncExternalStore(subscribe, getTimer, getTimer)
}

export const isBreak = (t: TimerSnapshot) => t.state.mode === 'pomodoro' && t.cycle.phase !== 'focus'

// ---- Actions ----

export function toggle(now = Date.now()) {
  const s = current.state
  set({ ...current, state: s.runningSince === null ? T.start(s, now) : T.pause(s, now) })
}

export function changeMode(mode: T.TimerMode) {
  try {
    localStorage.setItem(OLD_MODE_KEY, mode)
  } catch {
    /* not remembered across visits */
  }
  set({ ...current, cycle: initialCycle, state: T.setMode(current.state, mode, (mode === 'pomodoro' ? getSettings().focusMin : 25) * 60_000) })
}

export function setTarget(targetMs: number) {
  set({ ...current, state: T.setTarget(current.state, targetMs) })
}

export function setSubject(subject: string) {
  try {
    localStorage.setItem(OLD_SUBJECT_KEY, subject)
  } catch {
    /* not remembered across visits */
  }
  set({ ...current, subject })
}

export function discard() {
  set({ ...current, state: T.reset(current.state) })
}

export function skipPhase() {
  const next = advance(current.cycle, getSettings())
  set({ ...current, cycle: next, state: T.initialTimer('pomodoro', phaseMinutes(next.phase, getSettings()) * 60_000) })
}

/** Keeps an idle pomodoro in step with edited durations. */
export function syncIdlePomodoro() {
  const { state, cycle } = current
  if (state.mode !== 'pomodoro' || state.sessionStartedAt !== null) return
  const target = phaseMinutes(cycle.phase, getSettings()) * 60_000
  if (target !== state.targetMs) set({ ...current, state: T.setTarget(state, target) })
}

let busy = false

/**
 * Ends the current block and saves it. `completed` is true when a countdown
 * reached zero. A countdown that ran out while the app was closed is saved
 * with the time it actually ended, not when the app reopened.
 */
export async function finish(completed: boolean, now = Date.now()) {
  if (busy) return
  busy = true
  try {
    const snap = current
    const { state, cycle } = snap
    if (state.sessionStartedAt === null) return
    const end = completed && state.runningSince !== null ? Math.min(now, state.runningSince + (state.targetMs - state.accumulatedMs)) : now
    const settings = getSettings()

    // Clear the timer first so a second tab can't save the same session again.
    let next: TimerSnapshot
    if (state.mode === 'pomodoro') {
      const nextCycle = completed ? advance(cycle, settings) : cycle
      const fresh = T.initialTimer('pomodoro', phaseMinutes(nextCycle.phase, settings) * 60_000)
      next = { ...snap, cycle: nextCycle, state: completed && shouldAutoStart(nextCycle.phase, settings) ? T.start(fresh, now) : fresh }
    } else {
      next = { ...snap, state: T.reset(state) }
    }
    set(next)

    if (!isBreak(snap)) {
      await saveSession({
        startedAt: state.sessionStartedAt,
        endedAt: end,
        durationMs: T.elapsed(state, end),
        mode: state.mode,
        subject: snap.subject.trim() || null,
        notes: '',
      }, `timer-${state.sessionStartedAt}`)
    }
    if (completed) {
      playAlert()
      if (state.mode === 'pomodoro') {
        const phase = next.cycle.phase
        notify(phase === 'focus' ? 'Break over' : 'Focus block done', phase === 'focus' ? 'Time to focus again.' : `${PHASE_LABEL[phase]} time.`)
      } else {
        notify('Session complete', 'Nice work. Your session was saved.')
      }
    }
  } finally {
    busy = false
  }
}

/** Called on a timer tick: finishes a countdown that has reached zero. */
export function tick(now = Date.now()) {
  const { state } = current
  if (state.runningSince !== null && T.isFinished(state, now)) void finish(true, now)
}

/** Clears the timer on sign-out so the next person on this device starts fresh. */
export function clearTimer() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(OLD_SUBJECT_KEY)
  } catch {
    /* nothing saved */
  }
  current = fresh()
  listeners.forEach((l) => l())
}
