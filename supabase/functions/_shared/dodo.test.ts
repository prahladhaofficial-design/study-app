import { describe, expect, it } from 'vitest'
import { planForProduct, revokedPayment, rowFromEvent, signPayload, verifyWebhook } from './dodo'

const SECRET = 'whsec_' + btoa('a-very-secret-signing-key')
const PRODUCTS = { monthly: 'pdt_m', yearly: 'pdt_y', lifetime: 'pdt_l' }

describe('verifyWebhook', () => {
  const body = '{"type":"payment.succeeded"}'
  const now = 1_800_000_000

  it('accepts a correct signature', async () => {
    const sig = await signPayload(SECRET, 'msg_1', String(now), body)
    expect(await verifyWebhook(SECRET, { id: 'msg_1', timestamp: String(now), signature: `v1,${sig}` }, body, now)).toBe(true)
  })

  it('accepts when any of several signatures matches', async () => {
    const sig = await signPayload(SECRET, 'msg_1', String(now), body)
    expect(await verifyWebhook(SECRET, { id: 'msg_1', timestamp: String(now), signature: `v1,bogus v1,${sig}` }, body, now)).toBe(true)
  })

  it('rejects a changed body, a wrong secret, an old timestamp or missing headers', async () => {
    const sig = await signPayload(SECRET, 'msg_1', String(now), body)
    const headers = { id: 'msg_1', timestamp: String(now), signature: `v1,${sig}` }
    expect(await verifyWebhook(SECRET, headers, body + ' ', now)).toBe(false)
    expect(await verifyWebhook('whsec_' + btoa('other'), headers, body, now)).toBe(false)
    expect(await verifyWebhook(SECRET, headers, body, now + 301)).toBe(false)
    expect(await verifyWebhook(SECRET, { ...headers, signature: null }, body, now)).toBe(false)
  })
})

describe('rowFromEvent', () => {
  it('maps an active subscription with its renewal date', () => {
    const row = rowFromEvent(
      {
        type: 'subscription.active',
        data: { subscription_id: 'sub_1', product_id: 'pdt_y', status: 'active', next_billing_date: '2027-10-13T00:00:00Z', customer: { customer_id: 'cus_1' }, metadata: { user_id: 'u1' } },
      },
      PRODUCTS,
    )
    expect(row).toEqual({ userId: 'u1', customerId: 'cus_1', providerRef: 'sub_1', plan: 'yearly', status: 'active', currentPeriodEnd: '2027-10-13T00:00:00Z' })
  })

  it('maps cancellation and failed renewals to statuses the app understands', () => {
    const base = { subscription_id: 'sub_1', product_id: 'pdt_m', next_billing_date: '2026-11-13T00:00:00Z', metadata: {} }
    expect(rowFromEvent({ type: 'subscription.cancelled', data: { ...base, status: 'cancelled' } }, PRODUCTS)?.status).toBe('canceled')
    expect(rowFromEvent({ type: 'subscription.on_hold', data: { ...base, status: 'on_hold' } }, PRODUCTS)?.status).toBe('past_due')
    expect(rowFromEvent({ type: 'subscription.expired', data: { ...base, status: 'expired' } }, PRODUCTS)?.status).toBe('expired')
  })

  it('records a lifetime purchase from its one-time payment', () => {
    const row = rowFromEvent({ type: 'payment.succeeded', data: { payment_id: 'pay_1', subscription_id: null, product_cart: [{ product_id: 'pdt_l', quantity: 1 }], metadata: { user_id: 'u1' } } }, PRODUCTS)
    expect(row).toMatchObject({ userId: 'u1', providerRef: 'pay_1', plan: 'lifetime', status: 'active', currentPeriodEnd: null })
  })

  it('ignores subscription payments, unknown products and other events', () => {
    expect(rowFromEvent({ type: 'payment.succeeded', data: { payment_id: 'pay_2', subscription_id: 'sub_1', product_cart: [{ product_id: 'pdt_m' }] } }, PRODUCTS)).toBeNull()
    expect(rowFromEvent({ type: 'subscription.active', data: { subscription_id: 'sub_9', product_id: 'pdt_other', status: 'active' } }, PRODUCTS)).toBeNull()
    expect(rowFromEvent({ type: 'payment.failed', data: {} }, PRODUCTS)).toBeNull()
  })
})

describe('helpers', () => {
  it('finds the plan for a product id', () => {
    expect(planForProduct('pdt_l', PRODUCTS)).toBe('lifetime')
    expect(planForProduct(undefined, PRODUCTS)).toBeNull()
  })

  it('names the payment a refund revokes', () => {
    expect(revokedPayment({ type: 'refund.succeeded', data: { payment_id: 'pay_1' } })).toBe('pay_1')
    expect(revokedPayment({ type: 'payment.succeeded', data: { payment_id: 'pay_1' } })).toBeNull()
  })
})
