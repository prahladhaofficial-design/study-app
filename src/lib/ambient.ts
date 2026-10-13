import { useSyncExternalStore } from 'react'

// Ambient soundscapes generated in the browser with Web Audio, so there are
// no audio files to license or download. The engine lives at module level so
// sound keeps playing while you move between pages.

export type SoundId = 'rain' | 'ocean' | 'fan' | 'brown' | 'pink' | 'white'

export const SOUNDS: { id: SoundId; label: string; hint: string }[] = [
  { id: 'rain', label: 'Rain', hint: 'Steady rainfall' },
  { id: 'ocean', label: 'Waves', hint: 'Slow rolling surf' },
  { id: 'fan', label: 'Fan', hint: 'Low, even hum' },
  { id: 'brown', label: 'Brown noise', hint: 'Deep and soft' },
  { id: 'pink', label: 'Pink noise', hint: 'Balanced, like wind' },
  { id: 'white', label: 'White noise', hint: 'Bright, masks chatter' },
]

export interface MixState {
  playing: boolean
  master: number
  levels: Record<SoundId, number>
}

const KEY = 'sounds.v1'
const DEFAULT: MixState = { playing: false, master: 0.7, levels: { rain: 0.6, ocean: 0, fan: 0, brown: 0.3, pink: 0, white: 0 } }

function load(): MixState {
  try {
    const raw = localStorage.getItem(KEY)
    // Never auto-play on load; browsers block it and it would surprise people.
    if (raw) {
      const saved = JSON.parse(raw) as Partial<MixState>
      return { ...DEFAULT, ...saved, levels: { ...DEFAULT.levels, ...saved.levels }, playing: false }
    }
  } catch {
    /* fall through to defaults */
  }
  return DEFAULT
}

let state = load()
const listeners = new Set<() => void>()

function set(next: MixState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* not remembered across visits */
  }
  listeners.forEach((l) => l())
  apply()
}

export function useMix(): MixState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export function setLevel(id: SoundId, level: number) {
  set({ ...state, levels: { ...state.levels, [id]: level } })
}

export function setMaster(master: number) {
  set({ ...state, master })
}

export function setPlaying(playing: boolean) {
  set({ ...state, playing })
}

export function applyPreset(levels: Partial<Record<SoundId, number>>) {
  const zero = Object.fromEntries(SOUNDS.map((s) => [s.id, 0])) as Record<SoundId, number>
  set({ ...state, playing: true, levels: { ...zero, ...levels } })
}

export const PRESETS: { label: string; levels: Partial<Record<SoundId, number>> }[] = [
  { label: 'Rainy library', levels: { rain: 0.7, brown: 0.25 } },
  { label: 'Seaside', levels: { ocean: 0.8, pink: 0.1 } },
  { label: 'Late night', levels: { fan: 0.6, brown: 0.4 } },
  { label: 'Deep focus', levels: { brown: 0.8 } },
]

// ---- Audio graph ----

let ctx: AudioContext | null = null
let master: GainNode | null = null
const channels = new Map<SoundId, GainNode>()

function noiseBuffer(c: AudioContext, kind: 'white' | 'pink' | 'brown'): AudioBuffer {
  const seconds = 6
  const buf = c.createBuffer(2, c.sampleRate * seconds, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1
      if (kind === 'white') data[i] = w * 0.35
      else if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02
        data[i] = last * 3.2
      } else {
        // Paul Kellet's pink noise filter.
        b0 = 0.99886 * b0 + w * 0.0555179
        b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.969 * b2 + w * 0.153852
        b3 = 0.8665 * b3 + w * 0.3104856
        b4 = 0.55 * b4 + w * 0.5329522
        b5 = -0.7616 * b5 - w * 0.016898
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.09
        b6 = w * 0.115926
      }
    }
    // Crossfade the ends so the loop has no click.
    const fade = Math.floor(c.sampleRate * 0.05)
    for (let i = 0; i < fade; i++) {
      const t = i / fade
      const end = data.length - fade + i
      data[i] = data[i] * t + data[end] * (1 - t)
    }
  }
  return buf
}

function loop(c: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = c.createBufferSource()
  src.buffer = buffer
  src.loop = true
  src.loopEnd = buffer.duration - 0.05
  src.start(0, Math.random() * (buffer.duration - 0.1))
  return src
}

function filter(c: AudioContext, type: BiquadFilterType, frequency: number, Q = 0.7): BiquadFilterNode {
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = frequency
  f.Q.value = Q
  return f
}

/** Slowly modulates a gain so the sound swells and recedes. */
function swell(c: AudioContext, target: AudioParam, rate: number, depth: number) {
  const lfo = c.createOscillator()
  lfo.frequency.value = rate
  const amount = c.createGain()
  amount.gain.value = depth
  lfo.connect(amount).connect(target)
  lfo.start()
}

function build(c: AudioContext, out: AudioNode) {
  const white = noiseBuffer(c, 'white')
  const pink = noiseBuffer(c, 'pink')
  const brown = noiseBuffer(c, 'brown')

  const add = (id: SoundId, chain: (g: GainNode) => void) => {
    const g = c.createGain()
    g.gain.value = 0
    g.connect(out)
    chain(g)
    channels.set(id, g)
  }

  add('white', (g) => loop(c, white).connect(g))
  add('pink', (g) => loop(c, pink).connect(g))
  add('brown', (g) => loop(c, brown).connect(g))

  add('rain', (g) => {
    // A bright hiss for the drops over a softer body.
    const hiss = c.createGain()
    hiss.gain.value = 0.6
    loop(c, white).connect(filter(c, 'highpass', 2500)).connect(filter(c, 'lowpass', 9000)).connect(hiss).connect(g)
    const body = c.createGain()
    body.gain.value = 0.9
    loop(c, pink).connect(filter(c, 'lowpass', 1200)).connect(body).connect(g)
    swell(c, hiss.gain, 0.23, 0.12)
  })

  add('ocean', (g) => {
    const wave = c.createGain()
    wave.gain.value = 0.55
    loop(c, brown).connect(filter(c, 'lowpass', 900)).connect(wave).connect(g)
    swell(c, wave.gain, 0.09, 0.45)
    const foam = c.createGain()
    foam.gain.value = 0.08
    loop(c, pink).connect(filter(c, 'bandpass', 3000, 0.4)).connect(foam).connect(g)
    swell(c, foam.gain, 0.09, 0.07)
  })

  add('fan', (g) => {
    const air = c.createGain()
    air.gain.value = 1.4
    loop(c, brown).connect(filter(c, 'lowpass', 380)).connect(filter(c, 'peaking', 120, 1.2)).connect(air).connect(g)
    const hum = c.createOscillator()
    hum.frequency.value = 100
    const humGain = c.createGain()
    humGain.gain.value = 0.015
    hum.connect(humGain).connect(g)
    hum.start()
  })
}

function apply() {
  if (!state.playing) {
    if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.15)
    window.setTimeout(() => {
      if (!state.playing) void ctx?.suspend()
    }, 600)
    return
  }
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    build(ctx, master)
  }
  void ctx.resume()
  const t = ctx.currentTime
  master!.gain.setTargetAtTime(state.master, t, 0.2)
  for (const [id, g] of channels) g.gain.setTargetAtTime(state.levels[id] ** 2, t, 0.2)
}
