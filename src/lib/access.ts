// Decides whether a user may use the app. The product is paid-only:
// access comes from an active trial, an active subscription, or lifetime.

export type Plan = 'monthly' | 'yearly' | 'lifetime'

export interface AccessInput {
  trialEndsAt: string | null
  plan: Plan | null
  status: 'active' | 'canceled' | 'past_due' | 'expired' | null
  currentPeriodEnd: string | null
}

export type AccessResult =
  | { allowed: true; reason: 'lifetime' | 'subscription' | 'trial'; until: Date | null }
  | { allowed: false; reason: 'trial_ended' | 'subscription_ended' | 'no_plan' }

export function evaluateAccess(input: AccessInput, now: Date): AccessResult {
  if (input.plan === 'lifetime' && input.status === 'active') {
    return { allowed: true, reason: 'lifetime', until: null }
  }
  if (input.plan && input.currentPeriodEnd) {
    const end = new Date(input.currentPeriodEnd)
    // A canceled subscription keeps access until the paid period ends.
    if ((input.status === 'active' || input.status === 'canceled') && end > now) {
      return { allowed: true, reason: 'subscription', until: end }
    }
  }
  if (input.trialEndsAt) {
    const end = new Date(input.trialEndsAt)
    if (end > now) return { allowed: true, reason: 'trial', until: end }
    return { allowed: false, reason: input.plan ? 'subscription_ended' : 'trial_ended' }
  }
  return { allowed: false, reason: input.plan ? 'subscription_ended' : 'no_plan' }
}

export function daysLeft(until: Date, now: Date): number {
  return Math.max(0, Math.ceil((until.getTime() - now.getTime()) / 86_400_000))
}
