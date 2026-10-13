// Receives Dodo Payments webhooks and keeps the subscriptions table in step,
// which is what unlocks (or locks) the app. Deployed without JWT checks: Dodo
// signs each request instead, and unsigned requests are rejected.
import { revokedPayment, rowFromEvent, verifyWebhook } from '../_shared/dodo.ts'
import { admin, dodo, json } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const secret = Deno.env.get('DODO_WEBHOOK_SECRET')
  if (!secret) return json({ error: 'Webhook secret not set' }, 503)

  const body = await req.text()
  const webhookId = req.headers.get('webhook-id')
  const valid = await verifyWebhook(
    secret,
    { id: webhookId, timestamp: req.headers.get('webhook-timestamp'), signature: req.headers.get('webhook-signature') },
    body,
  )
  if (!valid || !webhookId) return json({ error: 'Invalid signature' }, 401)

  const event = JSON.parse(body) as { type?: string; timestamp?: string; data?: unknown }
  const db = admin()

  // Process each delivery once; Dodo retries until it gets a 2xx.
  const { error: seen } = await db.from('payment_events').insert({ id: webhookId, type: event.type ?? 'unknown' })
  if (seen?.code === '23505') return json({ ok: true, duplicate: true })
  if (seen) return json({ error: seen.message }, 500)

  try {
    const row = rowFromEvent(event, dodo.products())
    if (row) {
      const { data: existing } = await db
        .from('subscriptions')
        .select('user_id,provider_event_at')
        .eq('provider', 'dodo')
        .eq('provider_ref', row.providerRef)
        .maybeSingle()
      let userId = row.userId ?? existing?.user_id ?? null
      if (!userId && row.customerId) {
        const { data } = await db.from('subscriptions').select('user_id').eq('provider', 'dodo').eq('provider_customer', row.customerId).limit(1).maybeSingle()
        userId = data?.user_id ?? null
      }
      if (!userId) {
        console.error('webhook for unknown user', event.type, row.providerRef)
        return json({ ok: true, skipped: 'unknown user' })
      }
      const eventAt = event.timestamp ?? new Date().toISOString()
      // Ignore a delivery that is older than the state we already have.
      if (!existing?.provider_event_at || new Date(existing.provider_event_at) <= new Date(eventAt)) {
        const { error } = await db.from('subscriptions').upsert(
          {
            user_id: userId,
            provider: 'dodo',
            provider_ref: row.providerRef,
            provider_customer: row.customerId,
            plan: row.plan,
            status: row.status,
            current_period_end: row.currentPeriodEnd,
            provider_event_at: eventAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'provider,provider_ref' },
        )
        if (error) throw new Error(error.message)
      }
    }

    const refunded = revokedPayment(event)
    if (refunded) {
      const { error } = await db.from('subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('provider', 'dodo').eq('provider_ref', refunded)
      if (error) throw new Error(error.message)
    }
    return json({ ok: true })
  } catch (e) {
    // Forget this delivery so Dodo's retry is processed.
    await db.from('payment_events').delete().eq('id', webhookId)
    console.error('webhook failed', event.type, e)
    return json({ error: 'Processing failed' }, 500)
  }
})
