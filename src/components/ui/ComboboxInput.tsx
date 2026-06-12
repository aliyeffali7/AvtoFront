import { useState } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
  autoFocus?: boolean
  id?: string
}

export default function ComboboxInput({ value, onChange, options, placeholder, className = '', autoFocus, id }: Props) {
  const [focused, setFocused] = useState(false)

  const filtered = value.trim()
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()))
    : options

  const showSuggestions = focused && filtered.length > 0

  return (
    <div className="flex flex-col gap-1">
      <input
        id={id}
        type="text"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={`input ${className}`}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        autoComplete="off"
      />
      {showSuggestions && (
        <div className="flex flex-wrap gap-1">
          {filtered.slice(0, 8).map(opt => (
            <button
              key={opt}
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(opt); setFocused(false) }}
              className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
