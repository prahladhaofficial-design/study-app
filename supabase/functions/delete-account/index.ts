// Permanently deletes the signed-in user's account and data, after stopping any
// renewing Dodo subscription so they are never charged again.
import { admin, cors, dodo, json, userFromRequest } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const user = await userFromRequest(req)
  if (!user) return json({ error: 'Please sign in again.' }, 401)

  const db = admin()
  const { data: subs } = await db.from('subscriptions').select('provider_ref,plan,status').eq('user_id', user.id).eq('provider', 'dodo')
  for (const s of subs ?? []) {
    if (s.plan === 'lifetime' || s.status === 'canceled' || s.status === 'expired') continue
    const res = await dodo.call('PATCH', `/subscriptions/${encodeURIComponent(s.provider_ref)}`, { status: 'cancelled' })
    if (!res.ok) {
      console.error('cancel failed', s.provider_ref, res.status, await res.text())
      return json({ error: 'We could not cancel your subscription, so your account was not deleted. Please contact support.' }, 502)
    }
  }

  // Profiles, subscriptions and synced study data are removed by "on delete cascade".
  const { error } = await db.auth.admin.deleteUser(user.id)
  if (error) return json({ error: 'Could not delete the account. Please try again.' }, 500)
  return json({ ok: true })
})
