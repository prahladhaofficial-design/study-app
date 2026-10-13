import type { ReactNode } from 'react'
import { Card, PageHeader, Segmented, Toggle } from '../components/ui'
import { ThemeToggle } from '../components/ThemeToggle'
import { playAlert, requestNotifications } from '../lib/alerts'
import { updateSettings, useSettings, type SoundChoice } from '../lib/settings'

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
      <div>
        <p className="text-sm">{label}</p>
        {hint && <p className="text-xs text-faint">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Minutes({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))))
        }}
        className="w-20 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-right font-mono text-sm"
      />
      <span className="text-xs text-faint">min</span>
    </div>
  )
}

export function SettingsPage() {
  const s = useSettings()
  return (
    <div className="mx-auto max-w-2xl py-6">
      <PageHeader title="Settings" subtitle="Saved on this device." />
      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="mb-1 text-sm font-semibold">Pomodoro</h2>
          <Row label="Focus length">
            <Minutes label="Focus length" value={s.focusMin} min={5} max={120} onChange={(v) => updateSettings({ focusMin: v })} />
          </Row>
          <Row label="Short break">
            <Minutes label="Short break" value={s.shortBreakMin} min={1} max={30} onChange={(v) => updateSettings({ shortBreakMin: v })} />
          </Row>
          <Row label="Long break">
            <Minutes label="Long break" value={s.longBreakMin} min={5} max={60} onChange={(v) => updateSettings({ longBreakMin: v })} />
          </Row>
          <Row label="Long break after" hint="Number of focus blocks before a long break.">
            <input
              type="number"
              aria-label="Focus blocks before a long break"
              min={2}
              max={8}
              value={s.longBreakEvery}
              onChange={(e) => updateSettings({ longBreakEvery: Math.min(8, Math.max(2, Math.round(Number(e.target.value) || 4))) })}
              className="w-20 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-right font-mono text-sm"
            />
          </Row>
          <Row label="Start breaks automatically">
            <Toggle label="Start breaks automatically" checked={s.autoStartBreaks} onChange={(v) => updateSettings({ autoStartBreaks: v })} />
          </Row>
          <Row label="Start focus automatically after a break">
            <Toggle label="Start focus automatically" checked={s.autoStartFocus} onChange={(v) => updateSettings({ autoStartFocus: v })} />
          </Row>
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold">Alerts</h2>
          <Row label="Sound">
            <div className="flex items-center gap-2">
              <Segmented<SoundChoice>
                label="Alert sound"
                value={s.sound}
                onChange={(v) => {
                  updateSettings({ sound: v })
                  playAlert(v)
                }}
                options={[
                  { value: 'chime', label: 'Chime' },
                  { value: 'bell', label: 'Bell' },
                  { value: 'off', label: 'Off' },
                ]}
              />
            </div>
          </Row>
          <Row label="Volume">
            <input
              type="range"
              aria-label="Alert volume"
              min={0}
              max={1}
              step={0.05}
              value={s.volume}
              onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
              onPointerUp={() => playAlert()}
              className="w-40 accent-[var(--accent)]"
            />
          </Row>
          <Row label="Notifications" hint="A system notification when a block ends while the app is in the background.">
            <Toggle
              label="Notifications"
              checked={s.notifications}
              onChange={async (v) => updateSettings({ notifications: v ? await requestNotifications() : false })}
            />
          </Row>
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold">Appearance</h2>
          <Row label="Theme">
            <ThemeToggle />
          </Row>
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold">Keyboard</h2>
          <Row label="Start or pause">
            <kbd className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs">Space</kbd>
          </Row>
          <Row label="Finish and save">
            <kbd className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs">Esc</kbd>
          </Row>
        </Card>
      </div>
    </div>
  )
}
