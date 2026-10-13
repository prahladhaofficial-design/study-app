import clsx from 'clsx'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-dim">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx('rounded-2xl border border-line bg-surface p-5', className)}>{children}</section>
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx('rounded-lg px-3 py-1.5 text-sm', value === o.value ? 'bg-surface-2 text-ink' : 'text-dim hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-surface-2 ring-1 ring-line')}
    >
      <span className={clsx('absolute top-0.5 size-5 rounded-full bg-white transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}

export function NotFound({ title, back, backLabel }: { title: string; back: string; backLabel: string }) {
  return (
    <div className="mx-auto max-w-md py-16">
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-dim">It may have been deleted, or the link is wrong.</p>
        <Link to={back} className="mt-2 rounded-xl border border-line px-4 py-2 text-sm text-dim hover:text-ink">
          {backLabel}
        </Link>
      </Card>
    </div>
  )
}
