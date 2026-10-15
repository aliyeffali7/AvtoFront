export function formatPlate(raw: string): string {
  const clean = (raw || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (clean.length <= 2) return clean
  if (clean.length <= 4) return `${clean.slice(0, 2)}-${clean.slice(2)}`
  return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 7)}`
}

/** Azerbaijani licence plate: white, ink border, blue "AZ" strip, mono number. */
export default function Plate({ value, size = 13, className = '' }: { value: string; size?: number; className?: string }) {
  if (!value) return null
  return (
    <span
      className={`inline-flex items-stretch bg-white border border-ink rounded-[3px] overflow-hidden align-middle whitespace-nowrap ${className}`}
      style={{ fontSize: size }}
    >
      <span className="bg-info text-paper font-sans font-bold px-1 flex items-center" style={{ fontSize: '0.7em' }}>
        AZ
      </span>
      <span className="font-mono font-semibold tabular-nums text-ink px-1.5 py-0.5 tracking-[0.02em]">{formatPlate(value)}</span>
    </span>
  )
}
