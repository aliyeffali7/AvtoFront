import { PERIOD_OPTIONS, Period } from '@/lib/period'
import { toLocalISODate } from '@/lib/utils'

/** The shared date filter: Bu gün · Son 7/30/90 gün · Tarix seç (from–to),
 * plus "Hamısı" on list pages (`withAll`). */
export default function PeriodFilter({ value, onChange, withAll = false, className = '' }: {
  value: Period
  onChange: (period: Period) => void
  withAll?: boolean
  className?: string
}) {
  const today = toLocalISODate()
  const options = PERIOD_OPTIONS.filter(o => withAll || o.key !== 'all')

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex flex-wrap gap-1 border border-rule rounded p-1 bg-surface-alt" role="group" aria-label="Dövr">
        {options.map(o => (
          <button
            key={o.key}
            type="button"
            aria-pressed={value.key === o.key}
            onClick={() => onChange({ ...value, key: o.key })}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              value.key === o.key ? 'bg-surface text-ink border border-rule' : 'text-ink-muted hover:text-ink border border-transparent'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {value.key === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={value.from}
            max={today}
            onChange={e => e.target.value && onChange({ ...value, from: e.target.value })}
            className="input-mono text-sm py-1.5 px-2 w-auto"
            aria-label="Başlanğıc tarixi"
          />
          <span className="text-ink-muted text-sm">–</span>
          <input
            type="date"
            value={value.to}
            max={today}
            onChange={e => e.target.value && onChange({ ...value, to: e.target.value })}
            className="input-mono text-sm py-1.5 px-2 w-auto"
            aria-label="Son tarix"
          />
        </div>
      )}
    </div>
  )
}
