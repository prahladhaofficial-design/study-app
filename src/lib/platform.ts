// Tells the web build apart from the desktop (Tauri) and phone (Capacitor) apps.
type NativeWindow = Window & { __TAURI_INTERNALS__?: unknown; Capacitor?: { isNativePlatform?: () => boolean } }

export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function isPhoneApp(): boolean {
  return typeof window !== 'undefined' && !!(window as NativeWindow).Capacitor?.isNativePlatform?.()
}

/** True inside an installed app, where the marketing page and web-only sign-in flows don't apply. */
export function isNativeApp(): boolean {
  return isDesktopApp() || isPhoneApp()
}
