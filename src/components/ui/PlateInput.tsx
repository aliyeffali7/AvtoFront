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

  return (
    <input
      value={value}
      onChange={handleChange}
      required={required}
      autoFocus={autoFocus}
      placeholder="90-RK-641"
      className={className}
      inputMode="text"
      autoCapitalize="characters"
      autoComplete="off"
      spellCheck={false}
    />
  )
}
