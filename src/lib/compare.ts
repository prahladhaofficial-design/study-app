// Lightweight term comparison used by Brain dump: which important words in
// the source material are missing from what the student recalled?

const STOPWORDS = new Set(
  ('a an and are as at be because been but by can could did do does each for from had has have how if in into is it its ' +
    'may more most no not of on or other our over same should so some such than that the their them then there these they ' +
    'this those through to too under up very was we were what when where which while who why will with would you your also ' +
    'about after again all any before being below between both down during few further here itself just once only own ' +
    'off out same she he him his her hers its i me my myself we us')
    .split(/\s+/),
)

export function terms(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^-+|-+$/g, ''))
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
}

/** Crude stem so "cells"/"cell" and "dividing"/"divides" match. */
export function stem(word: string): string {
  return word.replace(/(ings|ing|ies|ied|es|ed|s|ly)$/u, '').slice(0, 12)
}

export interface Comparison {
  /** Distinct source terms (display form), most frequent first. */
  keyTerms: string[]
  found: string[]
  missing: string[]
  coverage: number
}

export function compareRecall(source: string, recalled: string, limit = 40): Comparison {
  const counts = new Map<string, { word: string; n: number }>()
  for (const w of terms(source)) {
    const k = stem(w)
    const e = counts.get(k)
    if (e) e.n++
    else counts.set(k, { word: w, n: 1 })
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1].n - a[1].n || a[1].word.localeCompare(b[1].word)).slice(0, limit)
  const have = new Set(terms(recalled).map(stem))
  const found: string[] = []
  const missing: string[] = []
  for (const [k, { word }] of ranked) (have.has(k) ? found : missing).push(word)
  return {
    keyTerms: ranked.map(([, v]) => v.word),
    found,
    missing,
    coverage: ranked.length ? found.length / ranked.length : 0,
  }
}

/** Words of 4+ syllables-ish (long words) that may be jargon in a "simple" explanation. */
export function jargon(text: string, minLength = 12): string[] {
  return [...new Set(terms(text).filter((w) => w.length >= minLength))]
}
