import { describe, expect, it } from 'vitest'
import { compareRecall, jargon, terms } from './compare'

describe('compareRecall', () => {
  const source = 'Mitochondria produce energy for the cell. Mitochondria have their own DNA. Ribosomes build proteins.'

  it('ignores stopwords and short words', () => {
    expect(terms('The cell is the unit of life')).toEqual(['cell', 'unit', 'life'])
  })

  it('finds missing key terms and coverage', () => {
    const r = compareRecall(source, 'mitochondria make energy in cells')
    expect(r.keyTerms[0]).toBe('mitochondria')
    expect(r.found).toEqual(expect.arrayContaining(['mitochondria', 'energy', 'cell']))
    expect(r.missing).toEqual(expect.arrayContaining(['ribosomes', 'proteins', 'dna']))
    expect(r.coverage).toBeGreaterThan(0.3)
    expect(r.coverage).toBeLessThan(0.7)
  })

  it('handles empty input', () => {
    expect(compareRecall('', 'anything').coverage).toBe(0)
  })

  it('flags long words as possible jargon', () => {
    expect(jargon('Photosynthesis converts light. Simple words stay.')).toEqual(['photosynthesis'])
  })
})
