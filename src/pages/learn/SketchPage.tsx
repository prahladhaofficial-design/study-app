import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Eraser, Pen, Plus, Trash2, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PageHeader } from '../../components/ui'
import { db, newId, type Sketch } from '../../lib/db'

const COLORS = ['#e8efec', '#14b8a6', '#f59e0b', '#ef4444', '#60a5fa', '#a78bfa']
const SIZES = [2, 4, 8, 16]
const CANVAS_W = 1600
const CANVAS_H = 1000
const BG = '#121816'

export function SketchPage() {
  const sketches = useLiveQuery(() => db.sketches.orderBy('updatedAt').reverse().toArray(), [], [])
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const history = useRef<ImageData[]>([])
  const [color, setColor] = useState(COLORS[0])
  const [size, setSize] = useState(4)
  const [eraser, setEraser] = useState(false)
  const [title, setTitle] = useState('')
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [saved, setSaved] = useState(true)

  const ctx = useCallback(() => canvas.current?.getContext('2d') ?? null, [])

  const clear = useCallback(() => {
    const c = ctx()
    if (!c) return
    c.fillStyle = BG
    c.fillRect(0, 0, CANVAS_W, CANVAS_H)
    history.current = []
  }, [ctx])

  useEffect(() => clear(), [clear])

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * CANVAS_W, y: ((e.clientY - r.top) / r.height) * CANVAS_H }
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = ctx()
    if (!c) return
    e.currentTarget.setPointerCapture(e.pointerId)
    history.current = [...history.current.slice(-24), c.getImageData(0, 0, CANVAS_W, CANVAS_H)]
    drawing.current = true
    last.current = point(e)
    move(e)
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = ctx()
    if (!c || !drawing.current || !last.current) return
    const p = point(e)
    // Pen pressure (stylus) scales the line; mice report 0.5.
    const pressure = e.pressure > 0 && e.pointerType === 'pen' ? e.pressure * 2 : 1
    c.strokeStyle = eraser ? BG : color
    c.lineWidth = (eraser ? size * 4 : size) * pressure
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.beginPath()
    c.moveTo(last.current.x, last.current.y)
    c.lineTo(p.x, p.y)
    c.stroke()
    last.current = p
    setSaved(false)
  }

  function up() {
    drawing.current = false
    last.current = null
  }

  function undo() {
    const c = ctx()
    const prev = history.current.pop()
    if (c && prev) c.putImageData(prev, 0, 0)
  }

  async function save() {
    const image = canvas.current?.toDataURL('image/png')
    if (!image) return
    const now = Date.now()
    const id = currentId ?? newId()
    const existing = currentId ? await db.sketches.get(currentId) : undefined
    await db.sketches.put({ id, title: title.trim() || 'Untitled sketch', image, createdAt: existing?.createdAt ?? now, updatedAt: now })
    setCurrentId(id)
    setSaved(true)
  }

  function open(s: Sketch) {
    const img = new Image()
    img.onload = () => {
      clear()
      ctx()?.drawImage(img, 0, 0, CANVAS_W, CANVAS_H)
      setCurrentId(s.id)
      setTitle(s.title)
      setSaved(true)
    }
    img.src = s.image
  }

  function startNew() {
    if (!saved && !window.confirm('Discard unsaved changes?')) return
    clear()
    setCurrentId(null)
    setTitle('')
    setSaved(true)
  }

  function download() {
    const a = document.createElement('a')
    a.href = canvas.current?.toDataURL('image/png') ?? ''
    a.download = `${title.trim() || 'sketch'}.png`
    a.click()
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this sketch?')) return
    await db.sketches.delete(id)
    if (id === currentId) startNew()
  }

  const tool = 'grid size-9 place-items-center rounded-lg'

  return (
    <div className="mx-auto max-w-6xl py-6">
      <PageHeader title="Sketch" subtitle="Draw diagrams, mind maps and worked problems. Works with a mouse, touch or stylus." />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setSaved(false)
          }}
          placeholder="Untitled sketch"
          aria-label="Sketch title"
          className="w-48 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
          <button type="button" aria-label="Pen" onClick={() => setEraser(false)} className={clsx(tool, !eraser ? 'bg-surface-2 text-ink' : 'text-dim')}>
            <Pen size={16} />
          </button>
          <button type="button" aria-label="Eraser" onClick={() => setEraser(true)} className={clsx(tool, eraser ? 'bg-surface-2 text-ink' : 'text-dim')}>
            <Eraser size={16} />
          </button>
          <button type="button" aria-label="Undo" onClick={undo} className={clsx(tool, 'text-dim hover:text-ink')}>
            <Undo2 size={16} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface p-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Colour ${c}`}
              onClick={() => {
                setColor(c)
                setEraser(false)
              }}
              className={clsx('size-6 rounded-full ring-offset-2 ring-offset-surface', color === c && !eraser && 'ring-2 ring-ink')}
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
          {SIZES.map((s) => (
            <button key={s} type="button" aria-label={`Size ${s}`} onClick={() => setSize(s)} className={clsx(tool, size === s ? 'bg-surface-2' : '')}>
              <span className="rounded-full bg-ink" style={{ width: Math.min(18, s + 2), height: Math.min(18, s + 2) }} />
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={startNew} className="flex items-center gap-1 rounded-xl border border-line px-3 py-2 text-sm text-dim hover:text-ink">
            <Plus size={14} /> New
          </button>
          <button type="button" onClick={download} aria-label="Download PNG" className="grid place-items-center rounded-xl border border-line px-3 text-dim hover:text-ink">
            <Download size={16} />
          </button>
          <button type="button" onClick={() => void save()} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
            {saved && currentId ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <canvas
        ref={canvas}
        width={CANVAS_W}
        height={CANVAS_H}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className={clsx('aspect-[8/5] w-full touch-none rounded-2xl border border-line', eraser ? 'cursor-cell' : 'cursor-crosshair')}
      />

      {sketches.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">Saved sketches</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {sketches.map((s) => (
              <li key={s.id} className="group relative">
                <button type="button" onClick={() => open(s)} className="block w-full overflow-hidden rounded-xl border border-line text-left hover:border-accent">
                  <img src={s.image} alt="" className="aspect-[8/5] w-full object-cover" />
                  <p className="truncate bg-surface px-3 py-2 text-xs">{s.title}</p>
                </button>
                <button type="button" aria-label="Delete sketch" onClick={() => void remove(s.id)} className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 focus:opacity-100">
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
