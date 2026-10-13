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

export const db = new Dexie('studyapp') as Dexie & {
  sessions: EntityTable<StudySession, 'id'>
  decks: EntityTable<Deck, 'id'>
  cards: EntityTable<Card, 'id'>
  dumps: EntityTable<BrainDump, 'id'>
  explanations: EntityTable<Explanation, 'id'>
  sketches: EntityTable<Sketch, 'id'>
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
