function formatPlate(clean: string): string {
  if (clean.length <= 2) return clean
  if (clean.length <= 4) return `${clean.slice(0, 2)}-${clean.slice(2)}`
  return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4)}`
}

export default function PlateInput({
  value,
  onChange,
  required,
  autoFocus,
  className,
}: {
  value: string
  onChange: (val: string) => void
  required?: boolean
  autoFocus?: boolean
  className?: string
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7)
    onChange(formatPlate(clean))
  }

  // Callers size the field with className (e.g. flex-1); the AZ strip sits inside the left padding.
  const wrapperClass = className?.includes('flex-1') ? 'relative flex-1 min-w-0' : 'relative'
  return (
    <div className={wrapperClass}>
      <span
        aria-hidden="true"
        className="absolute left-px top-px bottom-px w-9 rounded-l-[5px] bg-info text-paper font-sans font-bold text-small flex items-center justify-center pointer-events-none"
      >
        AZ
      </span>
      <input
      value={value}
      onChange={handleChange}
      required={required}
      autoFocus={autoFocus}
      placeholder="90-RK-641"
      className={`${className ?? ''} w-full !pl-12`}
      inputMode="text"
      autoCapitalize="characters"
      autoComplete="off"
      spellCheck={false}
      />
    </div>
  )
}
