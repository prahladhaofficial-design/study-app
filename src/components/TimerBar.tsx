import clsx from 'clsx'
import { Maximize2, Pause, Play, RotateCcw, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BRAND } from '../config/brand'
import { saveSession } from '../lib/db'
import { formatClock } from '../lib/time'
import * as T from '../lib/timer'

const PRESETS = [25, 45, 90]

export function TimerBar({ onSaved }: { onSaved?: () => void }) {
  const [state, setState] = useState(() => T.initialTimer())
  const [now, setNow] = useState(() => Date.now())
  const running = state.runningSince !== null
  const finishing = useRef(false)

  // Re-render a few times a second while running; the time itself comes from timestamps.
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [running])

  const shown = T.display(state, now)

  useEffect(() => {
    document.title = running ? `${formatClock(shown)} · ${BRAND.name}` : BRAND.name
  }, [running, shown])

  async function finish() {
    if (finishing.current) return
    finishing.current = true
    const end = Date.now()
    const durationMs = T.elapsed(state, end)
    if (state.sessionStartedAt) {
      const saved = await saveSession({
        startedAt: state.sessionStartedAt,
        endedAt: end,
        durationMs,
        mode: state.mode,
        subject: null,
        notes: '',
      })
      if (saved) onSaved?.()
    }
    setState(T.reset(state))
    finishing.current = false
  }

  // Countdown completion: chime-free for now (sounds land on Day 2), auto-log the session.
  useEffect(() => {
    if (running && T.isFinished(state, now)) void finish()
  }, [now])

  const toggle = () => setState((s) => (s.runningSince === null ? T.start(s, Date.now()) : T.pause(s, Date.now())))
  const started = state.sessionStartedAt !== null

  // Keyboard: Space start/pause, Escape finishes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, [contenteditable="true"]')) return
      if (e.code === 'Space') {
        e.preventDefault()
        toggle()
      } else if (e.key === 'Escape' && started) {
        void finish()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lg shadow-black/20 sm:flex-nowrap sm:justify-between sm:px-5">
      <div className="flex items-center gap-2">
        <select
          aria-label="Timer mode"
          value={state.mode}
          disabled={started}
          onChange={(e) => setState(T.setMode(state, e.target.value as T.TimerMode))}
          className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink disabled:opacity-50"
        >
          <option value="stopwatch">Stopwatch</option>
          <option value="countdown">Countdown</option>
        </select>
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
      </div>

      <output aria-live="off" className="font-mono text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
        {formatClock(shown)}
      </output>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={running ? 'Pause' : 'Start'}
          className="grid size-12 place-items-center rounded-xl bg-accent text-accent-ink hover:opacity-90"
        >
          {running ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
        <button
          type="button"
          onClick={() => void finish()}
          disabled={!started}
          aria-label="Finish and save session"
          className="grid size-10 place-items-center rounded-xl border border-line text-dim hover:text-danger disabled:opacity-30"
        >
          <Square size={16} />
        </button>
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
