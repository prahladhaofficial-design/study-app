import clsx from 'clsx'
import { CloudRain, Fan, Pause, Play, Volume2, Waves, Wind, type LucideIcon } from 'lucide-react'
import { Card, PageHeader } from '../components/ui'
import { applyPreset, PRESETS, setLevel, setMaster, setPlaying, SOUNDS, useMix, type SoundId } from '../lib/ambient'

const ICONS: Record<SoundId, LucideIcon> = { rain: CloudRain, ocean: Waves, fan: Fan, brown: Wind, pink: Wind, white: Wind }

export function SoundsPage() {
  const mix = useMix()

  return (
    <div className="mx-auto max-w-4xl py-6">
      <PageHeader
        title="Sounds"
        subtitle="Mix background sound to block out distractions. It keeps playing while you use the rest of the app."
        actions={
          <button
            type="button"
            onClick={() => setPlaying(!mix.playing)}
            className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink"
          >
            {mix.playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            {mix.playing ? 'Pause' : 'Play'}
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => applyPreset(p.levels)} className="rounded-full border border-line px-3.5 py-1.5 text-sm text-dim hover:border-accent hover:text-ink">
            {p.label}
          </button>
        ))}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SOUNDS.map((s) => {
          const Icon = ICONS[s.id]
          const level = mix.levels[s.id]
          const on = mix.playing && level > 0
          return (
            <li key={s.id}>
              <Card className={clsx('flex flex-col gap-4 transition-colors', on && 'border-accent/50')}>
                <div className="flex items-center gap-3">
                  <span className={clsx('grid size-10 place-items-center rounded-xl', on ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-dim')}>
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className="font-medium">{s.label}</p>
                    <p className="text-xs text-faint">{s.hint}</p>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={level}
                  onChange={(e) => {
                    setLevel(s.id, Number(e.target.value))
                    if (!mix.playing && Number(e.target.value) > 0) setPlaying(true)
                  }}
                  aria-label={`${s.label} volume`}
                  className="w-full accent-accent"
                />
              </Card>
            </li>
          )
        })}
      </ul>

      <Card className="mt-6 flex items-center gap-4">
        <Volume2 size={18} className="text-dim" />
        <span className="text-sm">Master</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={mix.master}
          onChange={(e) => setMaster(Number(e.target.value))}
          aria-label="Master volume"
          className="flex-1 accent-accent"
        />
      </Card>
      <p className="mt-3 text-xs text-faint">All sounds are generated on your device, so they work offline and never run out.</p>
    </div>
  )
}
