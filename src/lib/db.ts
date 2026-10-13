import Dexie, { type EntityTable } from 'dexie'

// Local-first store. Everything is written here first so the app works
// offline; a later sync step mirrors rows to Supabase.

export interface StudySession {
  id: string
  startedAt: number
  endedAt: number
  durationMs: number
  mode: 'stopwatch' | 'countdown' | 'pomodoro'
  subject: string | null
  notes: string
  updatedAt: number
}

export interface Deck {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

export interface Card {
  id: string
  deckId: string
  front: string
  back: string
  /** Epoch ms when the card is next due. */
  due: number
  intervalDays: number
  ease: number
  reps: number
  lapses: number
  createdAt: number
  updatedAt: number
}

export interface BrainDump {
  id: string
  topic: string
  recalled: string
  source: string
  /** Share of source key terms found in the recall, 0..1, once compared. */
  coverage: number | null
  createdAt: number
  updatedAt: number
}

export interface Explanation {
  id: string
  topic: string
  text: string
  gaps: string
  createdAt: number
  updatedAt: number
}

export interface Sketch {
  id: string
  title: string
  /** PNG data URL. */
  image: string
  createdAt: number
  updatedAt: number
}

export interface Goal {
  id: string
  period: 'daily' | 'weekly'
  minutes: number
  /** Only count sessions with this subject; null counts everything. */
  subject: string | null
  createdAt: number
  updatedAt: number
}

export interface Task {
  id: string
  title: string
  done: boolean
  subject: string | null
  /** Optional due day as a dayKey (YYYY-MM-DD). */
  dueDay: string | null
  createdAt: number
  doneAt: number | null
  updatedAt: number
}

export interface Moment {
  id: string
  day: string
  caption: string
  /** JPEG data URL, resized before saving. */
  image: string
  createdAt: number
  updatedAt: number
}

export interface Project {
  id: string
  /** Sessions whose subject matches this name count towards the project. */
  name: string
  color: string
  targetHours: number
  /** Optional exam or deadline day (YYYY-MM-DD). */
  deadline: string | null
  archived: boolean
  createdAt: number
  updatedAt: number
}

/** A local change waiting to be uploaded. `at` changes on every edit. */
export interface OutboxEntry {
  key: string
  kind: SyncKind
  id: string
  at: number
}

export const SYNC_KINDS = ['sessions', 'decks', 'cards', 'dumps', 'explanations', 'sketches', 'goals', 'tasks', 'moments', 'projects'] as const
export type SyncKind = (typeof SYNC_KINDS)[number]

export const db = new Dexie('studyapp') as Dexie & {
  sessions: EntityTable<StudySession, 'id'>
  decks: EntityTable<Deck, 'id'>
  cards: EntityTable<Card, 'id'>
  dumps: EntityTable<BrainDump, 'id'>
  explanations: EntityTable<Explanation, 'id'>
  sketches: EntityTable<Sketch, 'id'>
  goals: EntityTable<Goal, 'id'>
  tasks: EntityTable<Task, 'id'>
  moments: EntityTable<Moment, 'id'>
  projects: EntityTable<Project, 'id'>
  outbox: EntityTable<OutboxEntry, 'key'>
}

db.version(1).stores({
  sessions: 'id, startedAt, updatedAt',
})

db.version(2).stores({
  sessions: 'id, startedAt, updatedAt',
  decks: 'id, name, updatedAt',
  cards: 'id, deckId, due, updatedAt',
  dumps: 'id, createdAt, updatedAt',
  explanations: 'id, createdAt, updatedAt',
  sketches: 'id, createdAt, updatedAt',
})

db.version(3).stores({
  sessions: 'id, startedAt, updatedAt',
  decks: 'id, name, updatedAt',
  cards: 'id, deckId, due, updatedAt',
  dumps: 'id, createdAt, updatedAt',
  explanations: 'id, createdAt, updatedAt',
  sketches: 'id, createdAt, updatedAt',
  goals: 'id, updatedAt',
  tasks: 'id, done, createdAt, updatedAt',
  moments: 'id, day, createdAt, updatedAt',
  projects: 'id, name, updatedAt',
})

db.version(4).stores({
  sessions: 'id, startedAt, updatedAt',
  decks: 'id, name, updatedAt',
  cards: 'id, deckId, due, updatedAt',
  dumps: 'id, createdAt, updatedAt',
  explanations: 'id, createdAt, updatedAt',
  sketches: 'id, createdAt, updatedAt',
  goals: 'id, updatedAt',
  tasks: 'id, done, createdAt, updatedAt',
  moments: 'id, day, createdAt, updatedAt',
  projects: 'id, name, updatedAt',
  outbox: 'key, at',
})

// Every write to a synced table queues the row for upload. Writes made by the
// sync engine itself are tagged on the transaction and skipped, so downloaded
// rows don't bounce straight back to the server.
type TaggedTx = { fromSync?: boolean; on: (event: 'complete', fn: () => void) => void }
const outboxListeners = new Set<() => void>()
export const onOutboxChange = (fn: () => void) => {
  outboxListeners.add(fn)
  return () => void outboxListeners.delete(fn)
}

for (const kind of SYNC_KINDS) {
  const queue = (id: unknown, tx: TaggedTx) => {
    if (tx.fromSync || typeof id !== 'string') return
    tx.on('complete', () => {
      void db.outbox.put({ key: `${kind}:${id}`, kind, id, at: Date.now() }).then(() => outboxListeners.forEach((l) => l()))
    })
  }
  const table = db.table(kind)
  table.hook('creating', (id, obj, tx) => queue(id ?? (obj as { id?: string }).id, tx as unknown as TaggedTx))
  table.hook('updating', (_mods, id, _obj, tx) => queue(id, tx as unknown as TaggedTx))
  table.hook('deleting', (id, _obj, tx) => queue(id, tx as unknown as TaggedTx))
}

export const newId = () => crypto.randomUUID()

/** Sessions shorter than this are discarded as accidental taps. */
export const MIN_SESSION_MS = 60_000

export async function saveSession(s: Omit<StudySession, 'id' | 'updatedAt'>): Promise<StudySession | null> {
  if (s.durationMs < MIN_SESSION_MS) return null
  const row: StudySession = { ...s, id: crypto.randomUUID(), updatedAt: Date.now() }
  await db.sessions.add(row)
  return row
}

export async function updateSession(id: string, patch: Partial<Pick<StudySession, 'subject' | 'notes' | 'startedAt' | 'durationMs'>>): Promise<void> {
  const row = await db.sessions.get(id)
  if (!row) return
  const next = { ...row, ...patch }
  next.endedAt = next.startedAt + next.durationMs
  await db.sessions.put({ ...next, updatedAt: Date.now() })
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id)
}
