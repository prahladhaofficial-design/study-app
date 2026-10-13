// Opens Dodo's customer portal, where users cancel, change card or download invoices.
import { admin, cors, dodo, json, siteUrl, userFromRequest } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const user = await userFromRequest(req)
  if (!user) return json({ error: 'Please sign in again.' }, 401)

  const { data } = await admin()
    .from('subscriptions')
    .select('provider_customer')
    .eq('user_id', user.id)
    .eq('provider', 'dodo')
    .not('provider_customer', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data?.provider_customer) return json({ error: 'No billing found for this account.' }, 404)

  const returnUrl = encodeURIComponent(`${siteUrl()}/account`)
  const res = await dodo.call('POST', `/customers/${encodeURIComponent(data.provider_customer)}/customer-portal/session?return_url=${returnUrl}`)
  if (!res.ok) {
    console.error('portal failed', res.status, await res.text())
    return json({ error: 'Could not open billing. Please try again.' }, 502)
  }
  const { link } = (await res.json()) as { link: string }
  return json({ url: link })
})
