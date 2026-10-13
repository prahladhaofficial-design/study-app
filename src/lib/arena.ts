import { supabase } from './supabase'

export type ArenaPeriod = 'day' | 'week' | 'month' | 'all'

export const PERIOD_LABEL: Record<ArenaPeriod, string> = { day: 'Today', week: 'This week', month: 'This month', all: 'All time' }

/** Start of the period in the viewer's local time (weeks start on Monday). */
export function periodSince(period: ArenaPeriod, now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  if (period === 'month') d.setDate(1)
  if (period === 'all') return new Date(0)
  return d
}

/** Emoji flag for an ISO 3166 alpha-2 code, e.g. "IN" → 🇮🇳. */
export function flag(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return '🏳️'
  return String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)))
}

const CODES =
  'AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI KH CM CA CV CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW'.split(' ')

export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(undefined, { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

export const COUNTRIES = CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name))

/** Guesses the viewer's country from their browser locale, e.g. "en-IN" → "IN". */
export function guessCountry(locales: readonly string[]): string | null {
  for (const l of locales) {
    const region = l.split('-')[1]?.toUpperCase()
    if (region && CODES.includes(region)) return region
  }
  return null
}

export interface LeaderRow {
  rank: number
  display_name: string
  country_code: string | null
  minutes: number
  is_me: boolean
}

export interface CountryRow {
  country_code: string
  minutes: number
  students: number
}

export async function fetchLeaderboard(since: Date): Promise<LeaderRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('arena_leaderboard', { since: since.toISOString(), max_rows: 100 })
  if (error) throw new Error(error.message)
  return (data ?? []) as LeaderRow[]
}

export async function fetchCountries(since: Date): Promise<CountryRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('arena_countries', { since: since.toISOString() })
  if (error) throw new Error(error.message)
  return (data ?? []) as CountryRow[]
}

export interface ArenaProfile {
  display_name: string | null
  country_code: string | null
}

export async function fetchProfile(uid: string): Promise<ArenaProfile | null> {
  if (!supabase) return null
  const { data } = await supabase.from('profiles').select('display_name,country_code').eq('id', uid).maybeSingle()
  return (data as ArenaProfile | null) ?? null
}

export async function saveProfile(uid: string, p: ArenaProfile): Promise<string | null> {
  if (!supabase) return null
  const { error } = await supabase.from('profiles').update(p).eq('id', uid)
  return error?.message ?? null
}
