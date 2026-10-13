// Calls the server functions that handle payments and account deletion.
import type { Plan } from './access'
import { isDesktopApp } from './platform'
import { supabase } from './supabase'

type Result = { url?: string; ok?: boolean; error?: string }

async function call(name: string, body?: unknown): Promise<Result> {
  if (!supabase) return { error: 'Payments need an account. This is a preview build.' }
  const { data, error } = await supabase.functions.invoke<Result>(name, { body: body ?? {} })
  if (data?.error) return { error: data.error }
  if (error) {
    // The function's own message (for example "Checkout opens very soon") is in the response body.
    const ctx = (error as { context?: Response }).context
    const msg = ctx ? ((await ctx.json().catch(() => null)) as Result | null)?.error : null
    return { error: msg ?? 'Something went wrong. Please try again.' }
  }
  return data ?? {}
}

export const startCheckout = (plan: Plan) => call('create-checkout', { plan })
export const openBillingPortal = () => call('billing-portal')
export const deleteAccount = () => call('delete-account')

/** Opens a payment page: the same tab on the web, the system browser in the desktop app. */
export async function openExternal(url: string) {
  if (isDesktopApp()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
    return
  }
  window.location.assign(url)
}
