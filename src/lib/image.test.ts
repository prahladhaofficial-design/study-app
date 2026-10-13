import { describe, expect, it } from 'vitest'
import { fitWithin } from './image'

describe('fitWithin', () => {
  it('scales the longest edge down to the limit', () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 })
    expect(fitWithin(1080, 1920, 1280)).toEqual({ width: 720, height: 1280 })
  })

  it('leaves small images alone', () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 })
  })
})
