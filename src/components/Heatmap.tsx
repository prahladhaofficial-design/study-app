import { useLayoutEffect, useMemo, useRef } from 'react'
import { buildHeatmap, type HeatCell } from '../lib/heatmap'
import { formatDuration } from '../lib/time'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

function cellTitle(c: HeatCell): string {
  const date = c.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  return c.minutes ? `${date}: ${formatDuration(c.minutes * 60_000)}` : `${date}: no study`
}

export function Heatmap({ minutesByDay }: { minutesByDay: Record<string, number> }) {
  const columns = useMemo(() => buildHeatmap(new Date(), minutesByDay), [minutesByDay])
  const scroller = useRef<HTMLDivElement>(null)

  // On narrow screens, start scrolled to the most recent weeks.
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  // Label a column with its month when that month starts inside the column.
  const monthLabels = columns.map((col, i) => {
    const first = col.find((c) => c.date.getDate() === 1)
    if (first) return MONTHS[first.date.getMonth()]
    return i === 0 ? MONTHS[col[0].date.getMonth()] : ''
  })

  return (
    <div ref={scroller} className="flex overflow-x-auto pb-1">
      <div className="mx-auto inline-grid gap-[3px]" style={{ gridTemplateColumns: `28px repeat(${columns.length}, 12px)` }}>
        <div />
        {monthLabels.map((m, i) => (
          <div key={i} className="h-4 overflow-visible whitespace-nowrap text-[10px] text-faint">
            {m}
          </div>
        ))}
        {DAY_LABELS.map((label, row) => (
          <Row key={row} label={label} cells={columns.map((col) => col[row])} />
        ))}
      </div>
    </div>
  )
}

function Row({ label, cells }: { label: string; cells: HeatCell[] }) {
  return (
    <>
      <div className="pr-1 text-right text-[10px] leading-3 text-faint">{label}</div>
      {cells.map((c) => (
        <div
          key={c.key}
          title={c.outside ? undefined : cellTitle(c)}
          className="size-3 rounded-[3px]"
          style={{ background: c.outside ? 'transparent' : `var(--heat-${c.level})` }}
        />
      ))}
    </>
  )
}

export function HeatLegend() {
  return (
    <div className="flex items-center gap-1 text-[11px] text-faint">
      Less
      {[0, 1, 2, 3, 4, 5].map((l) => (
        <span key={l} className="size-3 rounded-[3px]" style={{ background: `var(--heat-${l})` }} />
      ))}
      More
    </div>
  )
}
