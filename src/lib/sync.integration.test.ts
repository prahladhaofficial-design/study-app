import 'fake-indexeddb/auto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

// A tiny in-memory stand-in for the sync_rows table, including the server
// trigger's rules: stamp server_ts and ignore writes older than what's stored.
type Row = { kind: string; id: string; data: Record<string, unknown> | null; deleted: boolean; updated_at: number; server_ts: string }
const server = new Map<string, Row>()
let clock = Date.UTC(2026, 0, 1)
const stamp = () => new Date((clock += 1000)).toISOString()

function serverWrite(r: Omit<Row, 'server_ts'>) {
  const key = `${r.kind}:${r.id}`
  const old = server.get(key)
  if (old && r.updated_at < old.updated_at) return
  server.set(key, { ...r, server_ts: stamp() })
}

const fakeClient = {
  from() {
    return {
      async upsert(rows: Omit<Row, 'server_ts'>[]) {
        rows.forEach(serverWrite)
        return { error: null }
      },
      select() {
        let after = ''
        let limit = Infinity
        const q = {
          gt(_col: string, v: string) {
            after = v
            return q
          },
          order() {
            return q
          },
          limit(n: number) {
            limit = n
            return q
          },
          then(resolve: (v: { data: Row[]; error: null }) => void) {
            const data = [...server.values()].filter((r) => r.server_ts > after).sort((a, b) => a.server_ts.localeCompare(b.server_ts)).slice(0, limit)
            resolve({ data, error: null })
          },
        }
        return q
      },
    }
  },
} as unknown as SupabaseClient

beforeAll(() => {
  vi.stubGlobal('navigator', { onLine: true })
  vi.stubGlobal('window', { setInterval: () => 0, clearInterval: () => {}, setTimeout: () => 0, clearTimeout: () => {}, addEventListener: () => {}, removeEventListener: () => {} })
  vi.stubGlobal('document', { addEventListener: () => {}, removeEventListener: () => {}, visibilityState: 'visible' })
})
afterAll(() => vi.unstubAllGlobals())

const settle = () => new Promise((r) => setTimeout(r, 20))

describe('sync engine', async () => {
  const { db } = await import('./db')
  const { startSync, syncNow, stopSync, signOutCleanup } = await import('./sync')

  it('uploads rows that existed before the first sign-in', async () => {
    await db.tasks.add({ id: 't1', title: 'Old task', done: false, subject: null, dueDay: null, createdAt: 1, doneAt: null, updatedAt: 1 })
    await settle()
    await startSync(fakeClient, 'user-a')
    expect(server.get('tasks:t1')?.data?.title).toBe('Old task')
    expect(await db.outbox.count()).toBe(0)
  })

  it('uploads edits and deletes as they happen', async () => {
    await db.tasks.update('t1', { title: 'Renamed', updatedAt: 2 })
    await db.decks.add({ id: 'd1', name: 'Bio', createdAt: 1, updatedAt: 1 })
    await settle()
    await db.decks.delete('d1')
    await settle()
    await syncNow()
    expect(server.get('tasks:t1')?.data?.title).toBe('Renamed')
    expect(server.get('decks:d1')?.deleted).toBe(true)
  })

  it('applies changes from another device without re-uploading them', async () => {
    serverWrite({ kind: 'goals', id: 'g1', data: { id: 'g1', period: 'daily', minutes: 60, subject: null, createdAt: 1, updatedAt: 1 }, deleted: false, updated_at: Date.now() })
    serverWrite({ kind: 'tasks', id: 't1', data: null, deleted: true, updated_at: Date.now() + 10_000 })
    await syncNow()
    await settle()
    expect((await db.goals.get('g1'))?.minutes).toBe(60)
    expect(await db.tasks.get('t1')).toBeUndefined()
    expect(await db.outbox.count()).toBe(0)
  })

  it('keeps a newer local edit over an older remote one', async () => {
    await db.projects.add({ id: 'p1', name: 'Local', color: '#fff', targetHours: 1, deadline: null, archived: false, createdAt: 1, updatedAt: 1 })
    await settle()
    serverWrite({ kind: 'projects', id: 'p1', data: { id: 'p1', name: 'Stale remote' }, deleted: false, updated_at: 5 })
    await syncNow()
    expect((await db.projects.get('p1'))?.name).toBe('Local')
    expect(server.get('projects:p1')?.data?.name).toBe('Local')
  })

  it('keeps the account data after signing out and back in', async () => {
    await db.sessions.add({ id: 's1', startedAt: 1, endedAt: 2, durationMs: 60_000, mode: 'stopwatch', subject: null, notes: '', updatedAt: 3 })
    await settle()
    expect(await signOutCleanup()).toBe(true)
    await settle()
    expect(await db.sessions.count()).toBe(0)
    expect(await db.outbox.count()).toBe(0)

    await startSync(fakeClient, 'user-a')
    expect(server.get('sessions:s1')?.deleted).toBe(false)
    expect(server.get('projects:p1')?.deleted).toBe(false)
    expect((await db.sessions.get('s1'))?.durationMs).toBe(60_000)
    stopSync()
  })

  it('ignores deletes left queued by an earlier sign-out', async () => {
    await signOutCleanup()
    await db.outbox.put({ key: 'sessions:s1', kind: 'sessions', id: 's1', at: Date.now() })
    await startSync(fakeClient, 'user-a')
    expect(server.get('sessions:s1')?.deleted).toBe(false)
    expect(await db.sessions.get('s1')).toBeDefined()
    stopSync()
  })
})
