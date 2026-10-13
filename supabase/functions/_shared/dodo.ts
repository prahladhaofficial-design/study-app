// Pure Dodo Payments helpers shared by the edge functions and the unit tests.
// No Deno or Node specifics: only Web Crypto and plain objects.

export type Plan = 'monthly' | 'yearly' | 'lifetime'
export type SubStatus = 'active' | 'canceled' | 'past_due' | 'expired'

export function apiBase(mode: string | undefined): string {
  return mode === 'live' ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com'
}

// ---- Webhook signatures (Standard Webhooks) ----

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64(bytes: ArrayBuffer): string {
  let bin = ''
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b)
  return btoa(bin)
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function signPayload(secret: string, id: string, timestamp: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', b64ToBytes(secret.replace(/^whsec_/, '')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${body}`))
  return bytesToB64(sig)
}

/** Checks a webhook's signature headers against the raw body. Rejects anything older or newer than 5 minutes. */
export async function verifyWebhook(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) return false
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > 300) return false
  const expected = await signPayload(secret, id, timestamp, body)
  return signature.split(' ').some((part) => {
    const [version, sig] = part.split(',')
    return version === 'v1' && !!sig && safeEqual(sig, expected)
  })
}

// ---- Turning events into subscription rows ----

export interface ProductIds {
  monthly?: string
  yearly?: string
  lifetime?: string
}

export function planForProduct(productId: string | null | undefined, products: ProductIds): Plan | null {
  if (!productId) return null
  for (const plan of ['monthly', 'yearly', 'lifetime'] as const) if (products[plan] === productId) return plan
  return null
}

const STATUS: Record<string, SubStatus> = {
  active: 'active',
  pending: 'active',
  cancelled: 'canceled',
  on_hold: 'past_due',
  past_due: 'past_due',
  paused: 'expired',
  failed: 'expired',
  expired: 'expired',
}

export interface SubscriptionUpsert {
  userId: string | null
  customerId: string | null
  providerRef: string
  plan: Plan
  status: SubStatus
  currentPeriodEnd: string | null
}

type Obj = Record<string, unknown>
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
const obj = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {})

/**
 * Maps a Dodo webhook event to the subscription row it implies, or null when
 * the event doesn't change anyone's access. userId comes from the checkout
 * metadata; when it's missing the caller falls back to the Dodo customer id.
 */
export function rowFromEvent(event: { type?: unknown; data?: unknown }, products: ProductIds): SubscriptionUpsert | null {
  const type = str(event.type) ?? ''
  const data = obj(event.data)
  const metadata = obj(data.metadata)
  const customerId = str(obj(data.customer).customer_id)
  const userId = str(metadata.user_id)

  if (type.startsWith('subscription.')) {
    const ref = str(data.subscription_id)
    const plan = planForProduct(str(data.product_id), products) ?? (str(metadata.plan) as Plan | null)
    const status = STATUS[str(data.status) ?? '']
    if (!ref || !plan || plan === 'lifetime' || !status) return null
    return { userId, customerId, providerRef: ref, plan, status, currentPeriodEnd: str(data.next_billing_date) }
  }

  if (type === 'payment.succeeded') {
    // Subscription payments are covered by the subscription events; only a one-time lifetime purchase is handled here.
    if (str(data.subscription_id)) return null
    const cart = Array.isArray(data.product_cart) ? (data.product_cart as Obj[]) : []
    const isLifetime = cart.some((item) => planForProduct(str(item.product_id), products) === 'lifetime')
    const ref = str(data.payment_id)
    if (!isLifetime || !ref) return null
    return { userId, customerId, providerRef: ref, plan: 'lifetime', status: 'active', currentPeriodEnd: null }
  }

  return null
}

/** A refunded or disputed one-time payment removes lifetime access. Returns the payment id to expire. */
export function revokedPayment(event: { type?: unknown; data?: unknown }): string | null {
  const type = str(event.type) ?? ''
  if (type !== 'refund.succeeded' && type !== 'dispute.lost') return null
  return str(obj(event.data).payment_id)
}
