// Starts a Dodo checkout for the signed-in user and returns the payment page URL.
import type { Plan } from '../_shared/dodo.ts'
import { cors, dodo, json, siteUrl, userFromRequest } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const user = await userFromRequest(req)
  if (!user?.email) return json({ error: 'Please sign in again.' }, 401)

  const { plan } = (await req.json().catch(() => ({}))) as { plan?: Plan }
  if (plan !== 'monthly' && plan !== 'yearly' && plan !== 'lifetime') return json({ error: 'Unknown plan.' }, 400)
  const productId = dodo.products()[plan]
  if (!dodo.key() || !productId) return json({ error: 'Checkout opens very soon. Please check back shortly.', code: 'not_configured' }, 503)

  const res = await dodo.call('POST', '/checkouts', {
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { email: user.email },
    // The webhook uses these to know whose account to unlock.
    metadata: { user_id: user.id, plan },
    return_url: `${siteUrl()}/account?checkout=done`,
    cancel_url: `${siteUrl()}/upgrade`,
  })
  if (!res.ok) {
    console.error('checkout failed', res.status, await res.text())
    return json({ error: 'Could not open checkout. Please try again.' }, 502)
  }
  const { checkout_url } = (await res.json()) as { checkout_url?: string }
  return checkout_url ? json({ url: checkout_url }) : json({ error: 'Could not open checkout. Please try again.' }, 502)
})
