import { beforeEach, describe, expect, it, vi } from 'vitest'

const saved: unknown[] = []
vi.mock('./db', () => ({ saveSession: vi.fn(async (s: unknown, id: string) => void saved.push({ ...(s as object), id })) }))
vi.mock('./alerts', () => ({ playAlert: vi.fn(), notify: vi.fn() }))

const Timer = await import('./timerStore')

describe('timer store', () => {
  beforeEach(() => {
    saved.length = 0
    Timer.clearTimer()
  })

  it('rejects saved timers that are malformed', () => {
    expect(Timer.parseSnapshot(null)).toBeNull()
    expect(Timer.parseSnapshot('not json')).toBeNull()
    expect(Timer.parseSnapshot(JSON.stringify({ state: { mode: 'stopwatch', targetMs: 'x' } }))).toBeNull()
    const ok = { state: { mode: 'countdown', targetMs: 60_000, runningSince: 5, accumulatedMs: 0, sessionStartedAt: 5 }, cycle: { phase: 'nope' }, subject: 3 }
    expect(Timer.parseSnapshot(JSON.stringify(ok))).toEqual({ ...ok, cycle: { phase: 'focus', completedFocus: 0 }, subject: '' })
  })

  it('keeps running between calls and saves a stopwatch session once', async () => {
    Timer.toggle(1_000)
    expect(Timer.getTimer().state.runningSince).toBe(1_000)
    await Timer.finish(false, 1_000 + 30 * 60_000)
    await Timer.finish(false, 1_000 + 31 * 60_000)
    expect(saved).toEqual([expect.objectContaining({ startedAt: 1_000, durationMs: 30 * 60_000, id: 'timer-1000' })])
    expect(Timer.getTimer().state.sessionStartedAt).toBeNull()
  })

  it('saves a countdown that ran out while the app was closed at the time it ended', async () => {
    Timer.changeMode('countdown')
    Timer.setTarget(25 * 60_000)
    Timer.toggle(0)
    Timer.tick(3 * 3_600_000)
    await vi.waitFor(() => expect(saved).toHaveLength(1))
    expect(saved[0]).toMatchObject({ startedAt: 0, endedAt: 25 * 60_000, durationMs: 25 * 60_000, mode: 'countdown' })
  })
})
