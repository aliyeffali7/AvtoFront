export interface SegmentedOption<T extends string> {
  key: T
  label: string
  title?: string
}

/** Filter pills in a sunken group (same look as the Sifarişlər status filter). */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (key: T) => void
  label: string
}) {
  return (
    <div className="flex flex-wrap gap-1 border border-border rounded p-1 bg-surface-2 w-fit" role="group" aria-label={label}>
      {options.map(o => (
        <button
          key={o.key}
          type="button"
          title={o.title}
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 rounded text-small font-semibold transition-colors ${
            value === o.key ? 'bg-surface text-ink border border-border' : 'text-text-3 hover:text-ink border border-transparent'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
