import clsx from 'clsx'
import { Maximize2, Pause, Play, RotateCcw, SkipForward, Square } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BRAND } from '../config/brand'
import { notify, playAlert } from '../lib/alerts'
import { db, saveSession } from '../lib/db'
import { advance, initialCycle, PHASE_LABEL, phaseMinutes, shouldAutoStart, type Cycle } from '../lib/pomodoro'
import { getSettings, useSettings } from '../lib/settings'
import { formatClock } from '../lib/time'
import * as T from '../lib/timer'

const PRESETS = [25, 45, 90]
const MODE_KEY = 'timer.mode'
const SUBJECT_KEY = 'timer.subject'

function savedSubject(): string {
  try {
    return localStorage.getItem(SUBJECT_KEY) ?? ''
  } catch {
    return ''
  }
}

function savedMode(): T.TimerMode {
  try {
    const m = localStorage.getItem(MODE_KEY)
    return m === 'countdown' || m === 'pomodoro' ? m : 'stopwatch'
  } catch {
    return 'stopwatch'
  }
}

export function TimerBar() {
  const settings = useSettings()
  const [cycle, setCycle] = useState<Cycle>(initialCycle)
  const [state, setState] = useState(() => {
    const mode = savedMode()
    return T.initialTimer(mode, (mode === 'pomodoro' ? getSettings().focusMin : 25) * 60_000)
  })
  const [now, setNow] = useState(() => Date.now())
  const running = state.runningSince !== null
  const started = state.sessionStartedAt !== null
  const isBreak = state.mode === 'pomodoro' && cycle.phase !== 'focus'
  const busy = useRef(false)
  const [subject, setSubject] = useState(savedSubject)
  // Suggest project names first, then recent subjects.
  const suggestions = useLiveQuery(async () => {
    const projects = await db.projects.filter((p) => !p.archived).toArray()
    const recent = await db.sessions.orderBy('startedAt').reverse().limit(200).toArray()
    return [...new Set([...projects.map((p) => p.name), ...recent.map((r) => r.subject).filter((x): x is string => !!x)])]
  }, [], [] as string[])

  function changeSubject(value: string) {
    setSubject(value)
    try {
      localStorage.setItem(SUBJECT_KEY, value)
    } catch {
      /* not remembered across visits */
    }
  }

  // Re-render while running; the time itself always comes from timestamps.
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [running])

  // Keep an idle pomodoro in step with edited durations.
  useEffect(() => {
    if (state.mode !== 'pomodoro' || started) return
    const target = phaseMinutes(cycle.phase, settings) * 60_000
    if (target !== state.targetMs) setState((s) => T.setTarget(s, target))
  }, [settings, cycle.phase, state.mode, state.targetMs, started])

  const shown = T.display(state, now)

  useEffect(() => {
    const label = state.mode === 'pomodoro' ? PHASE_LABEL[cycle.phase] : 'Focus'
    document.title = running ? `${formatClock(shown)} · ${label}` : BRAND.name
  }, [running, shown, state.mode, cycle.phase])

  const logFocus = useCallback(
    async (s: T.TimerState, end: number) => {
      if (!s.sessionStartedAt) return
      await saveSession({
        startedAt: s.sessionStartedAt,
        endedAt: end,
        durationMs: T.elapsed(s, end),
        mode: s.mode,
        subject: subject.trim() || null,
        notes: '',
      })
    },
    [subject],
  )

  /** Ends the current block. `completed` is true when a countdown reached zero. */
  const finish = useCallback(
    async (completed: boolean) => {
      if (busy.current) return
      busy.current = true
      const end = Date.now()
      const s = getSettings()
      if (!isBreak) await logFocus(state, end)

      if (state.mode === 'pomodoro') {
        const next = completed ? advance(cycle, s) : cycle
        if (completed) {
          playAlert()
          notify(next.phase === 'focus' ? 'Break over' : 'Focus block done', next.phase === 'focus' ? 'Time to focus again.' : `${PHASE_LABEL[next.phase]} time.`)
        }
        setCycle(next)
        const fresh = T.initialTimer('pomodoro', phaseMinutes(next.phase, s) * 60_000)
        setState(completed && shouldAutoStart(next.phase, s) ? T.start(fresh, end) : fresh)
      } else {
        if (completed) {
          playAlert()
          notify('Session complete', 'Nice work. Your session was saved.')
        }
        setState(T.reset(state))
      }
      busy.current = false
    },
    [state, cycle, isBreak, logFocus],
  )

  useEffect(() => {
    if (running && T.isFinished(state, now)) void finish(true)
  }, [now, running, state, finish])

  const toggle = useCallback(
    () => setState((s) => (s.runningSince === null ? T.start(s, Date.now()) : T.pause(s, Date.now()))),
    [],
  )

  function changeMode(mode: T.TimerMode) {
    try {
      localStorage.setItem(MODE_KEY, mode)
    } catch {
      /* not remembered across visits */
    }
    setCycle(initialCycle)
    setState(T.setMode(state, mode, (mode === 'pomodoro' ? settings.focusMin : 25) * 60_000))
  }

  function skipPhase() {
    const next = advance(cycle, settings)
    setCycle(next)
    setState(T.initialTimer('pomodoro', phaseMinutes(next.phase, settings) * 60_000))
  }

  // Keyboard: Space start/pause, Escape finishes and saves.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.code === 'Space') {
        e.preventDefault()
        toggle()
      } else if (e.key === 'Escape' && started) {
        void finish(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, finish, started])

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
          onChange={(e) => changeMode(e.target.value as T.TimerMode)}
          className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink disabled:opacity-50"
        >
          <option value="stopwatch">Stopwatch</option>
          <option value="countdown">Countdown</option>
          <option value="pomodoro">Pomodoro</option>
        </select>
        <input
          list="timer-subjects"
          value={subject}
          onChange={(e) => changeSubject(e.target.value)}
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
                onClick={() => setState(T.setTarget(state, m * 60_000))}
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
          onClick={toggle}
          aria-label={running ? 'Pause' : 'Start'}
          className={clsx('grid size-12 place-items-center rounded-xl hover:opacity-90', isBreak ? 'bg-warm text-black' : 'bg-accent text-accent-ink')}
        >
          {running ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
        {state.mode === 'pomodoro' ? (
          <button type="button" onClick={skipPhase} aria-label="Skip to next phase" className="grid size-10 place-items-center rounded-xl border border-line text-dim hover:text-ink">
            <SkipForward size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void finish(false)}
            disabled={!started}
            aria-label="Finish and save session"
            className="grid size-10 place-items-center rounded-xl border border-line text-dim hover:text-danger disabled:opacity-30"
          >
            <Square size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setState(T.reset(state))}
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
