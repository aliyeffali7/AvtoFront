import { ReactNode } from 'react'
import Money, { MoneyMeaning } from './Money'

/** KPI card. At most one card per screen may set `accent` (signal red number). */
export default function KpiCard({
  label,
  value,
  money = false,
  meaning = 'neutral',
  accent = false,
  note,
  className = '',
}: {
  label: string
  value: ReactNode
  /** Render `value` (a number) as money in mono */
  money?: boolean
  meaning?: MoneyMeaning
  accent?: boolean
  note?: ReactNode
  className?: string
}) {
  return (
    <div className={`card p-5 flex flex-col gap-2 min-w-0 ${className}`}>
      <span className="font-sans text-label uppercase text-text-3">{label}</span>
      {money ? (
        <Money
          value={value as number}
          meaning={meaning}
          showWord={false}
          className={`!justify-start text-[28px] leading-10 font-bold ${accent ? '[&_*]:!text-signal' : ''}`}
        />
      ) : (
        <span className={`font-display font-bold text-h1 ${accent ? 'text-signal' : 'text-text-1'}`}>{value}</span>
      )}
      {note && <span className="text-small text-text-3">{note}</span>}
    </div>
  )
}
