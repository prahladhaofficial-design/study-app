import { describe, expect, it } from 'vitest'
import { batchBySize, cursorWithOverlap, decide } from './sync'

describe('decide', () => {
  it('applies remote edits when nothing is pending locally', () => {
    expect(decide({ deleted: false, updated_at: 100 }, undefined)).toBe('put')
    expect(decide({ deleted: true, updated_at: 100 }, undefined)).toBe('delete')
  })

  it('keeps a newer unsent local edit', () => {
    expect(decide({ deleted: false, updated_at: 100 }, { at: 200 })).toBe('skip')
    expect(decide({ deleted: true, updated_at: 100 }, { at: 200 })).toBe('skip')
  })

  it('lets a newer remote edit replace an older pending one', () => {
    expect(decide({ deleted: false, updated_at: 300 }, { at: 200 })).toBe('put')
  })
})

describe('batchBySize', () => {
  it('splits by byte budget and count', () => {
    const sizes = [400, 400, 400, 50]
    expect(batchBySize(sizes, (n) => n, 900).map((b) => b.length)).toEqual([2, 2])
    expect(batchBySize([1, 1, 1, 1, 1], (n) => n, 900, 2).map((b) => b.length)).toEqual([2, 2, 1])
  })

  it('still sends a single row larger than the budget', () => {
    expect(batchBySize([5000], (n) => n, 900)).toEqual([[5000]])
  })
})

describe('cursorWithOverlap', () => {
  it('starts from the beginning without a cursor', () => {
    expect(cursorWithOverlap(null)).toBe('1970-01-01T00:00:00Z')
  })

  it('steps back by the overlap', () => {
    expect(cursorWithOverlap('2026-10-13T12:00:10.000Z')).toBe('2026-10-13T12:00:00.000Z')
  })
})
