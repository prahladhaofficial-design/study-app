import { describe, expect, it } from 'vitest'
import { flag, guessCountry, periodSince } from './arena'

describe('periodSince', () => {
  const now = new Date(2026, 9, 15, 18, 30) // Thursday
  it('starts today at midnight', () => expect(periodSince('day', now)).toEqual(new Date(2026, 9, 15)))
  it('starts the week on Monday', () => expect(periodSince('week', now)).toEqual(new Date(2026, 9, 12)))
  it('starts the month on the 1st', () => expect(periodSince('month', now)).toEqual(new Date(2026, 9, 1)))
  it('covers all time', () => expect(periodSince('all', now).getTime()).toBe(0))
})

describe('flag', () => {
  it('builds regional-indicator flags', () => expect(flag('IN')).toBe('🇮🇳'))
  it('falls back for missing codes', () => expect(flag(null)).toBe('🏳️'))
})

describe('guessCountry', () => {
  it('reads the region from the locale', () => expect(guessCountry(['en-IN', 'en'])).toBe('IN'))
  it('returns null without a region', () => expect(guessCountry(['en'])).toBeNull())
})
