import { describe, expect, it } from 'vitest'
import { daysLeft, evaluateAccess, bestAccess } from './access'

const now = new Date('2026-10-13T12:00:00Z')
const base = { trialEndsAt: null, plan: null, status: null, currentPeriodEnd: null } as const

describe('evaluateAccess', () => {
  it('allows an active trial', () => {
    const r = evaluateAccess({ ...base, trialEndsAt: '2026-10-16T12:00:00Z' }, now)
    expect(r).toMatchObject({ allowed: true, reason: 'trial' })
  })

  it('blocks an ended trial', () => {
    expect(evaluateAccess({ ...base, trialEndsAt: '2026-10-01T00:00:00Z' }, now)).toMatchObject({
      allowed: false,
      reason: 'trial_ended',
    })
  })

  it('allows lifetime forever', () => {
    expect(evaluateAccess({ ...base, plan: 'lifetime', status: 'active' }, now).allowed).toBe(true)
  })

  it('keeps a canceled subscription until its period ends', () => {
    const r = evaluateAccess(
      { ...base, plan: 'monthly', status: 'canceled', currentPeriodEnd: '2026-10-20T00:00:00Z' },
      now,
    )
    expect(r).toMatchObject({ allowed: true, reason: 'subscription' })
    const after = evaluateAccess(
      { ...base, plan: 'monthly', status: 'canceled', currentPeriodEnd: '2026-10-01T00:00:00Z' },
      now,
    )
    expect(after).toMatchObject({ allowed: false, reason: 'subscription_ended' })
  })

  it('counts days left rounding up', () => {
    expect(daysLeft(new Date('2026-10-14T13:00:00Z'), now)).toBe(2)
  })
})

describe('bestAccess', () => {
  const now = new Date('2026-10-13T12:00:00Z')
  it('prefers lifetime over an older ended subscription', () => {
    const r = bestAccess(null, [
      { plan: 'monthly', status: 'expired', currentPeriodEnd: '2026-09-01T00:00:00Z' },
      { plan: 'lifetime', status: 'active', currentPeriodEnd: null },
    ], now)
    expect(r).toMatchObject({ allowed: true, reason: 'lifetime' })
  })
  it('falls back to the trial when there are no plans', () => {
    expect(bestAccess('2026-10-20T00:00:00Z', [], now)).toMatchObject({ allowed: true, reason: 'trial' })
  })
  it('reports an ended subscription when nothing grants access', () => {
    expect(bestAccess('2026-10-01T00:00:00Z', [{ plan: 'yearly', status: 'expired', currentPeriodEnd: '2026-10-01T00:00:00Z' }], now)).toMatchObject({ allowed: false, reason: 'subscription_ended' })
  })
})
