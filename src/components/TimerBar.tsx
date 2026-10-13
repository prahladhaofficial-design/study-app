import clsx from 'clsx'
import { Maximize2, Pause, Play, RotateCcw, SkipForward, Square } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BRAND } from '../config/brand'
import { db } from '../lib/db'
import { PHASE_LABEL } from '../lib/pomodoro'
import { useSettings } from '../lib/settings'
import { formatClock } from '../lib/time'
import * as T from '../lib/timer'
import * as Timer from '../lib/timerStore'

const PRESETS = [25, 45, 90]

/** Re-renders a few times a second while the timer runs. The time itself always comes from timestamps. */
export function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [running])
  return now
}

/**
 * Runs once for the whole app: finishes countdowns on time on any page,
 * keeps the tab title showing the clock, and follows edited pomodoro lengths.
 */
export function TimerEngine() {
  const { state, cycle } = Timer.useTimer()
  const settings = useSettings()
  const running = state.runningSince !== null
  const now = useNow(running)
  const shown = T.display(state, now)

  useEffect(() => {
    Timer.tick(now)
  }, [now])

  // A countdown that ran out while the app was closed is saved on the next open.
  useEffect(() => {
    Timer.tick()
  }, [])

  useEffect(() => {
    Timer.syncIdlePomodoro()
  }, [settings, cycle.phase, state.mode, state.sessionStartedAt])

  useEffect(() => {
    const label = state.mode === 'pomodoro' ? PHASE_LABEL[cycle.phase] : 'Focus'
    document.title = running ? `${formatClock(shown)} · ${label}` : BRAND.name
  }, [running, shown, state.mode, cycle.phase])

  return null
}

export function TimerBar() {
  const settings = useSettings()
  const timer = Timer.useTimer()
  const { state, cycle, subject } = timer
  const running = state.runningSince !== null
  const started = state.sessionStartedAt !== null
  const isBreak = Timer.isBreak(timer)
  const now = useNow(running)
  // Suggest project names first, then recent subjects.
  const suggestions = useLiveQuery(async () => {
    const projects = await db.projects.filter((p) => !p.archived).toArray()
    const recent = await db.sessions.orderBy('startedAt').reverse().limit(200).toArray()
    return [...new Set([...projects.map((p) => p.name), ...recent.map((r) => r.subject).filter((x): x is string => !!x)])]
  }, [], [] as string[])

  const shown = T.display(state, now)

  // Keyboard: Space start/pause, Escape finishes and saves.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest('input, textarea, select, button, [contenteditable="true"]')) return
      if (e.code === 'Space') {
        e.preventDefault()
        Timer.toggle()
      } else if (e.key === 'Escape' && started) {
        void Timer.finish(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [started])

  return (
    <div
      className={clsx(
        'mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-3 rounded-2xl border bg-surface p-3 shadow-lg shadow-black/20 sm:flex-nowrap sm:justify-between sm:px-5',
        isBreak ? 'border-warm/50' : 'border-line',
      )}
    >
      <div className="flex items-center gap-2">
        <select
          aria-label="Timer mode"
          value={state.mode}
          disabled={started}
          onChange={(e) => Timer.changeMode(e.target.value as T.TimerMode)}
          className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink disabled:opacity-50"
        >
          <option value="stopwatch">Stopwatch</option>
          <option value="countdown">Countdown</option>
          <option value="pomodoro">Pomodoro</option>
        </select>
        <input
          list="timer-subjects"
          value={subject}
          onChange={(e) => Timer.setSubject(e.target.value)}
          placeholder="Subject"
          aria-label="Subject for this session"
          className="w-28 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm sm:w-32"
        />
        <datalist id="timer-subjects">
          {suggestions.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
        {state.mode === 'countdown' && !started && (
          <div className="flex gap-1">
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => Timer.setTarget(m * 60_000)}
                className={clsx(
                  'rounded-md px-2 py-1 text-xs',
                  state.targetMs === m * 60_000 ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-dim hover:text-ink',
                )}
              >
                {m}m
              </button>
            ))}
          </div>
        )}
        {state.mode === 'pomodoro' && (
          <div className="flex flex-col leading-tight">
            <span className={clsx('text-xs font-semibold', isBreak ? 'text-warm' : 'text-accent')}>{PHASE_LABEL[cycle.phase]}</span>
            <span className="text-[11px] text-faint">
              {cycle.completedFocus % settings.longBreakEvery}/{settings.longBreakEvery} blocks
            </span>
          </div>
        )}
      </div>

      <output aria-live="off" className="font-mono text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
        {formatClock(shown)}
      </output>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => Timer.toggle()}
          aria-label={running ? 'Pause' : 'Start'}
          className={clsx('grid size-12 place-items-center rounded-xl hover:opacity-90', isBreak ? 'bg-warm text-black' : 'bg-accent text-accent-ink')}
        >
          {running ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
        {state.mode === 'pomodoro' ? (
          <button type="button" onClick={() => Timer.skipPhase()} aria-label="Skip to next phase" className="grid size-10 place-items-center rounded-xl border border-line text-dim hover:text-ink">
            <SkipForward size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void Timer.finish(false)}
            disabled={!started}
            aria-label="Finish and save session"
            className="grid size-10 place-items-center rounded-xl border border-line text-dim hover:text-danger disabled:opacity-30"
          >
            <Square size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={() => Timer.discard()}
          disabled={!started}
          aria-label="Discard session"
          className="grid size-10 place-items-center rounded-xl border border-line text-dim hover:text-ink disabled:opacity-30"
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          onClick={() => void document.documentElement.requestFullscreen?.()}
          aria-label="Fullscreen"
          className="hidden size-10 place-items-center rounded-xl border border-line text-dim hover:text-ink sm:grid"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  )
}

/** A small clock in the top bar so a running session stays visible on every other page. */
export function MiniTimer() {
  const timer = Timer.useTimer()
  const { state, cycle } = timer
  const running = state.runningSince !== null
  const now = useNow(running)
  if (state.sessionStartedAt === null) return null
  const label = state.mode === 'pomodoro' ? PHASE_LABEL[cycle.phase] : running ? 'Focusing' : 'Paused'
  return (
    <div className={clsx('flex items-center gap-1 rounded-full border bg-surface py-1 pl-3 pr-1', Timer.isBreak(timer) ? 'border-warm/50' : 'border-accent/50')}>
      <Link to="/" className="flex items-baseline gap-2" aria-label="Open the timer">
        <span className="hidden text-xs text-dim sm:inline">{label}</span>
        <span className="font-mono text-sm font-semibold tabular-nums">{formatClock(T.display(state, now))}</span>
      </Link>
      <button type="button" onClick={() => Timer.toggle()} aria-label={running ? 'Pause' : 'Resume'} className="grid size-8 place-items-center rounded-full text-dim hover:text-ink">
        {running ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
    </div>
  )
}
