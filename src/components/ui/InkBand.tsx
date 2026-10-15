import { ReactNode } from 'react'

export interface InkBandItem {
  label: string
  value: ReactNode
  note?: ReactNode
  /** Show this number in signal red (at most one per band) */
  highlight?: boolean
}

/** Dark summary band: uppercase label + grid of big mono numbers. */
export default function InkBand({ label, items, footer, className = '' }: { label?: string; items: InkBandItem[]; footer?: ReactNode; className?: string }) {
  return (
    <div className={`bg-ink rounded-lg px-7 py-6 ${className}`}>
      {label && <p className="font-sans text-label uppercase text-text-4 mb-3">{label}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-8 gap-y-5">
        {items.map(item => (
          <div key={item.label} className="min-w-0">
            <p className="font-sans text-label uppercase text-text-4">{item.label}</p>
            <p
              className={`font-mono font-semibold tabular-nums text-[26px] sm:text-[30px] leading-10 truncate ${
                item.highlight ? 'text-signal' : 'text-paper'
              }`}
            >
              {item.value}
            </p>
            {item.note && <p className="text-small text-text-4">{item.note}</p>}
          </div>
        ))}
      </div>
      {footer && <div className="mt-5">{footer}</div>}
    </div>
  )
}
