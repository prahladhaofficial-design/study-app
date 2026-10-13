import { afterEach, describe, expect, it } from 'vitest'
import { isDesktopApp, isNativeApp, isPhoneApp } from './platform'

const w = globalThis as unknown as Record<string, unknown>

describe('platform', () => {
  afterEach(() => {
    delete w.window
  })

  it('is the web app in a plain browser', () => {
    w.window = {}
    expect(isNativeApp()).toBe(false)
  })

  it('detects the desktop app', () => {
    w.window = { __TAURI_INTERNALS__: {} }
    expect(isDesktopApp()).toBe(true)
    expect(isNativeApp()).toBe(true)
  })

  it('detects the phone app but not Capacitor running on the web', () => {
    w.window = { Capacitor: { isNativePlatform: () => true } }
    expect(isPhoneApp()).toBe(true)
    w.window = { Capacitor: { isNativePlatform: () => false } }
    expect(isPhoneApp()).toBe(false)
  })
})
