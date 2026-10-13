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

export const db = new Dexie('studyapp') as Dexie & {
  sessions: EntityTable<StudySession, 'id'>
}

db.version(1).stores({
  sessions: 'id, startedAt, updatedAt',
})

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
