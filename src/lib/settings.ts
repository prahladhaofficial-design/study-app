import { useSyncExternalStore } from 'react'

export type SoundChoice = 'chime' | 'bell' | 'off'

export interface Settings {
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  longBreakEvery: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
  sound: SoundChoice
  volume: number
  notifications: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  sound: 'chime',
  volume: 0.6,
  notifications: false,
}

const KEY = 'settings.v1'
const listeners = new Set<() => void>()

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

let current = load()

export function getSettings(): Settings {
  return current
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* settings still apply for this visit */
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings)
}
