import { useSyncExternalStore } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { db, onOutboxChange, SYNC_KINDS, type OutboxEntry, type SyncKind } from './db'

// Two-way sync between the local database and Supabase's sync_rows table.
// Local edits are queued in the outbox and uploaded; changes from other
// devices are pulled by server timestamp. The newest edit wins.

export interface RemoteRow {
  kind: SyncKind
  id: string
  data: Record<string, unknown> | null
  deleted: boolean
  updated_at: number
  server_ts: string
}

/** What to do locally with a downloaded row. */
export function decide(remote: Pick<RemoteRow, 'deleted' | 'updated_at'>, pending: Pick<OutboxEntry, 'at'> | undefined): 'put' | 'delete' | 'skip' {
  // An unsent local edit that is newer than the remote one wins; it uploads next.
  if (pending && pending.at > remote.updated_at) return 'skip'
  return remote.deleted ? 'delete' : 'put'
}

/** Splits rows into upload batches under a rough byte budget (images make some rows large). */
export function batchBySize<T>(items: T[], sizeOf: (t: T) => number, maxBytes = 900_000, maxCount = 200): T[][] {
  const batches: T[][] = []
  let current: T[] = []
  let bytes = 0
  for (const item of items) {
    const size = sizeOf(item)
    if (current.length && (bytes + size > maxBytes || current.length >= maxCount)) {
      batches.push(current)
      current = []
      bytes = 0
    }
    current.push(item)
    bytes += size
  }
  if (current.length) batches.push(current)
  return batches
}

/** Pull cursors step back a little so rows committed slightly out of order aren't missed. */
export function cursorWithOverlap(serverTs: string | null, overlapMs = 10_000): string {
  if (!serverTs) return '1970-01-01T00:00:00Z'
  return new Date(new Date(serverTs).getTime() - overlapMs).toISOString()
}

// ---- Status store for the UI ----

export interface SyncStatus {
  state: 'off' | 'syncing' | 'idle' | 'error' | 'offline'
  lastSyncedAt: number | null
  pending: number
  error: string | null
}

let status: SyncStatus = { state: 'off', lastSyncedAt: null, pending: 0, error: null }
const listeners = new Set<() => void>()
function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch }
  listeners.forEach((l) => l())
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
  )
}

// ---- Engine ----

const OWNER_KEY = 'sync.owner'
const cursorKey = (uid: string) => `sync.cursor.${uid}`
const PAGE = 500

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* sync restarts from the beginning next time, which is safe */
  }
}

async function wipeLocal() {
  await db.transaction('rw', [...SYNC_KINDS.map((k) => db.table(k)), db.outbox], async (tx) => {
    // Removing this device's copy must not queue deletes for upload, or the
    // next sign-in would erase the account's data on the server too.
    ;(tx as unknown as { fromSync: boolean }).fromSync = true
    for (const k of SYNC_KINDS) await db.table(k).clear()
    await db.outbox.clear()
  })
}

/** Queues every local row for upload, used the first time an account syncs on this device. */
async function enqueueAll() {
  const now = Date.now()
  // Entries left from before this account (including deletes queued by older
  // versions when signing out) belong to no one, so start from what is here.
  await db.outbox.clear()
  for (const kind of SYNC_KINDS) {
    const rows = (await db.table(kind).toArray()) as { id: string; updatedAt?: number }[]
    await db.outbox.bulkPut(rows.map((r) => ({ key: `${kind}:${r.id}`, kind, id: r.id, at: r.updatedAt ?? now })))
  }
}

async function push(client: SupabaseClient) {
  const entries = await db.outbox.toArray()
  if (!entries.length) return
  const rows = await Promise.all(
    entries.map(async (e) => {
      const data = (await db.table(e.kind).get(e.id)) as Record<string, unknown> | undefined
      return { entry: e, row: { kind: e.kind, id: e.id, data: data ?? null, deleted: !data, updated_at: e.at } }
    }),
  )
  for (const batch of batchBySize(rows, (r) => (r.row.data ? JSON.stringify(r.row.data).length : 64))) {
    const { error } = await client.from('sync_rows').upsert(
      batch.map((b) => b.row),
      { onConflict: 'user_id,kind,id' },
    )
    if (error) throw new Error(error.message)
    // Only clear entries that weren't edited again while uploading.
    await db.transaction('rw', db.outbox, async () => {
      for (const { entry } of batch) {
        const current = await db.outbox.get(entry.key)
        if (current && current.at === entry.at) await db.outbox.delete(entry.key)
      }
    })
  }
}

async function pull(client: SupabaseClient, uid: string) {
  // Step back once per run to catch rows committed out of order, then page strictly forward.
  let after = cursorWithOverlap(read(cursorKey(uid)))
  for (;;) {
    const { data, error } = await client
      .from('sync_rows')
      .select('kind,id,data,deleted,updated_at,server_ts')
      .gt('server_ts', after)
      .order('server_ts', { ascending: true })
      .limit(PAGE)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as RemoteRow[]
    if (!rows.length) break
    await db.transaction('rw', [...SYNC_KINDS.map((k) => db.table(k)), db.outbox], async (tx) => {
      ;(tx as unknown as { fromSync: boolean }).fromSync = true
      for (const r of rows) {
        if (!SYNC_KINDS.includes(r.kind)) continue
        const action = decide(r, await db.outbox.get(`${r.kind}:${r.id}`))
        if (action === 'put' && r.data) await db.table(r.kind).put(r.data)
        else if (action === 'delete') await db.table(r.kind).delete(r.id)
      }
    })
    after = rows[rows.length - 1].server_ts
    write(cursorKey(uid), after)
    if (rows.length < PAGE) break
  }
}

let running: Promise<void> | null = null
let again = false
let active: { client: SupabaseClient; uid: string } | null = null

/** Runs one push and pull. Calls made while a sync is running coalesce into one more run. */
export function syncNow(): Promise<void> {
  if (!active) return Promise.resolve()
  if (running) {
    again = true
    return running
  }
  const { client, uid } = active
  running = (async () => {
    if (!navigator.onLine) {
      setStatus({ state: 'offline' })
      return
    }
    setStatus({ state: 'syncing', error: null })
    try {
      await push(client)
      await pull(client, uid)
      setStatus({ state: 'idle', lastSyncedAt: Date.now(), pending: await db.outbox.count() })
    } catch (e) {
      setStatus({ state: 'error', error: e instanceof Error ? e.message : String(e), pending: await db.outbox.count() })
    }
  })().finally(() => {
    running = null
    if (again && active) {
      again = false
      void syncNow()
    }
  })
  return running
}

let stopFns: (() => void)[] = []

/** Starts syncing for a signed-in user. Clears local data that belongs to a different account. */
export async function startSync(client: SupabaseClient, uid: string) {
  stopSync()
  const owner = read(OWNER_KEY)
  if (owner && owner !== uid) {
    await wipeLocal()
    write(cursorKey(owner), null)
  }
  if (owner !== uid) {
    // First sync of this account on this device: upload anything already here.
    await enqueueAll()
    write(OWNER_KEY, uid)
  }
  active = { client, uid }

  let debounce: number | undefined
  const soon = () => {
    window.clearTimeout(debounce)
    debounce = window.setTimeout(() => void syncNow(), 2_000)
  }
  const onVisible = () => document.visibilityState === 'visible' && void syncNow()
  const interval = window.setInterval(() => void syncNow(), 60_000)
  const offOutbox = onOutboxChange(soon)
  window.addEventListener('online', soon)
  document.addEventListener('visibilitychange', onVisible)
  stopFns = [
    () => window.clearInterval(interval),
    () => window.clearTimeout(debounce),
    offOutbox,
    () => window.removeEventListener('online', soon),
    () => document.removeEventListener('visibilitychange', onVisible),
  ]
  await syncNow()
}

export function stopSync() {
  stopFns.forEach((f) => f())
  stopFns = []
  active = null
  setStatus({ state: 'off' })
}

/** Uploads what's left, then removes this account's data from the device. Returns false if unsent changes remain. */
export async function signOutCleanup(force = false): Promise<boolean> {
  await syncNow()
  const pending = await db.outbox.count()
  if (pending && !force) return false
  const owner = read(OWNER_KEY)
  stopSync()
  await wipeLocal()
  if (owner) write(cursorKey(owner), null)
  write(OWNER_KEY, null)
  return true
}
