import { ALL_NAV } from '../components/nav'

export function ComingSoon({ path }: { path: string }) {
  const item = ALL_NAV.find((n) => n.to === path)
  const Icon = item?.icon
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      {Icon && (
        <div className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-accent">
          <Icon size={26} />
        </div>
      )}
      <h1 className="text-xl font-semibold">{item?.label ?? 'Coming soon'}</h1>
      <p className="text-dim">{item?.blurb}</p>
      {item && <p className="text-xs text-faint">Arriving on day {item.day} of the build.</p>}
    </div>
  )
}
