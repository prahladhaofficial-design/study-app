// Request helpers shared by the edge functions.
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'
import { apiBase, type ProductIds } from './dodo.ts'

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

/** A database client with full rights. Only ever used inside edge functions. */
export function admin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
}

/** The signed-in user who made the request, or null. */
export async function userFromRequest(req: Request): Promise<User | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!token) return null
  const { data } = await admin().auth.getUser(token)
  return data.user ?? null
}

export const dodo = {
  key: () => Deno.env.get('DODO_API_KEY') ?? '',
  base: () => apiBase(Deno.env.get('DODO_MODE')),
  products: (): ProductIds => ({
    monthly: Deno.env.get('DODO_PRODUCT_MONTHLY'),
    yearly: Deno.env.get('DODO_PRODUCT_YEARLY'),
    lifetime: Deno.env.get('DODO_PRODUCT_LIFETIME'),
  }),
  async call(method: string, path: string, body?: unknown): Promise<Response> {
    return fetch(`${dodo.base()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${dodo.key()}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  },
}

export const siteUrl = () => Deno.env.get('SITE_URL') ?? 'https://study-app-one-rho.vercel.app'
