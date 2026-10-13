import { getSettings } from './settings'

let ctx: AudioContext | null = null

// Synthesised tones, so the app ships with no third-party audio files.
const TONES: Record<'chime' | 'bell', { freqs: number[]; gap: number; decay: number }> = {
  chime: { freqs: [660, 880, 1320], gap: 0.16, decay: 0.9 },
  bell: { freqs: [523.25, 523.25], gap: 0.5, decay: 1.6 },
}

export function playAlert(kind = getSettings().sound, volume = getSettings().volume): void {
  if (kind === 'off' || volume <= 0) return
  try {
    ctx ??= new AudioContext()
    const tone = TONES[kind]
    const t0 = ctx.currentTime
    tone.freqs.forEach((f, i) => {
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      const start = t0 + i * tone.gap
      osc.type = 'sine'
      osc.frequency.value = f
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.25 * volume, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.decay)
      osc.connect(gain).connect(ctx!.destination)
      osc.start(start)
      osc.stop(start + tone.decay)
    })
  } catch {
    /* audio unavailable */
  }
}

export async function requestNotifications(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  return (await Notification.requestPermission()) === 'granted'
}

export function notify(title: string, body: string): void {
  if (!getSettings().notifications || !('Notification' in window) || Notification.permission !== 'granted') return
  if (document.visibilityState === 'visible') return
  try {
    new Notification(title, { body, icon: '/favicon.svg' })
  } catch {
    /* some platforms only allow notifications from a service worker */
  }
}
