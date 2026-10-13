import { describe, expect, it } from 'vitest'
import { friendlyAuthError } from './authErrors'

describe('friendlyAuthError', () => {
  it('explains the email rate limit and wrong passwords', () => {
    expect(friendlyAuthError('email rate limit exceeded')).toMatch(/wait a few minutes/)
    expect(friendlyAuthError('Invalid login credentials')).toMatch(/reset your password/)
  })

  it('passes unknown messages through', () => {
    expect(friendlyAuthError('Something odd')).toBe('Something odd')
  })
})
