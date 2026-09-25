import { useState, useRef, useEffect } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
  autoFocus?: boolean
  id?: string
  icons?: Record<string, string>
  wordStart?: boolean
}

export default function ComboboxInput({ value, onChange, options, placeholder, className = '', autoFocus, id, icons, wordStart }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const query = value.trim().toLowerCase()
  const matches = (o: string) => {
    const name = o.toLowerCase()
    return wordStart ? name.split(/[\s\-/]+/).some(w => w.startsWith(query)) || name.startsWith(query) : name.includes(query)
  }
  const filtered = query
    ? options
        .filter(matches)
        .sort((a, b) => Number(b.toLowerCase().startsWith(query)) - Number(a.toLowerCase().startsWith(query)))
    : options

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={`input ${className}`}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-[9999] left-0 right-0 top-full mt-1 bg-surface border border-rule rounded shadow-2xl max-h-52 overflow-y-auto">
          {filtered.map(opt => (
            <li
              key={opt}
              onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false) }}
              className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-surface-alt hover:text-accent flex items-center gap-2 ${opt === value ? 'bg-surface-alt text-accent font-medium' : 'text-ink'}`}
            >
              {icons && (
                <span className="w-6 h-6 inline-flex items-center justify-center shrink-0">
                  {icons[opt] && <img src={icons[opt]} alt="" loading="lazy" className="max-w-full max-h-full object-contain" />}
                </span>
              )}
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
