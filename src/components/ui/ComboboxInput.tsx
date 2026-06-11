import { useState, useRef, useEffect } from 'react'

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
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = value.trim()
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()))
    : options

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.map(opt => (
            <li
              key={opt}
              onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false) }}
              className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 ${opt === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'}`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
