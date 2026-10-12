import { toLocalISODate } from '@/lib/utils'

// The one date-range filter used on every page: Bu gün · Son 7/30/90 gün ·
// Tarix seç (a from–to range). List pages (orders, Kassa) also offer "Hamısı".
// "Son N gün" always means N calendar days including today.

export type PeriodKey = 'today' | '7' | '30' | '90' | 'custom' | 'all'

export interface Period {
  key: PeriodKey
  /** Only used when key === 'custom' (YYYY-MM-DD). */
  from: string
  to: string
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Bu gün' },
  { key: '7', label: 'Son 7 gün' },
  { key: '30', label: 'Son 30 gün' },
  { key: '90', label: 'Son 90 gün' },
  { key: 'custom', label: 'Tarix seç' },
  { key: 'all', label: 'Hamısı' },
]

export function makePeriod(key: PeriodKey): Period {
  const today = toLocalISODate()
  return { key, from: today, to: today }
}

/** False for values saved before this filter existed (e.g. 'week'), so callers can fall back. */
export function isPeriodKey(value: unknown): value is PeriodKey {
  return PERIOD_OPTIONS.some(o => o.key === value)
}

/** Inclusive YYYY-MM-DD range; nulls mean open-ended ("Hamısı"). */
export function periodRange(period: Period): { from: string | null; to: string | null } {
  const today = toLocalISODate()
  if (period.key === 'all') return { from: null, to: null }
  if (period.key === 'today') return { from: today, to: today }
  if (period.key === 'custom') {
    const [from, to] = period.from <= period.to ? [period.from, period.to] : [period.to, period.from]
    return { from, to }
  }
  const start = new Date()
  start.setDate(start.getDate() - (Number(period.key) - 1))
  return { from: toLocalISODate(start), to: today }
}

/** Human label, e.g. "Son 30 gün" or "01.10.2026 – 07.10.2026". */
export function periodLabel(period: Period): string {
  if (period.key !== 'custom') return PERIOD_OPTIONS.find(o => o.key === period.key)?.label ?? ''
  const { from, to } = periodRange(period)
  const fmt = (d: string | null) => (d ? d.split('-').reverse().join('.') : '')
  return from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`
}
