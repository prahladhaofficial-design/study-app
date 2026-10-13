import { describe, expect, it } from 'vitest'
import { parseImport } from './decks'

describe('parseImport', () => {
  it('reads tab or semicolon separated lines and skips junk', () => {
    expect(parseImport('Capital of France\tParis\nH2O; water\n\nno separator\n;missing front')).toEqual([
      { front: 'Capital of France', back: 'Paris' },
      { front: 'H2O', back: 'water' },
    ])
  })
})
