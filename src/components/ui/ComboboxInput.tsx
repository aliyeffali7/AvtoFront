import { useState, useRef, useEffect, CSSProperties } from 'react'
import { createPortal } from 'react-dom'

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
  const [style, setStyle] = useState<CSSProperties>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = value.trim()
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()))
    : options

  function position() {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setStyle({ position: 'fixed', top: r.bottom + 4, left: r.left, width: r.width, zIndex: 9999 })
  }

  useEffect(() => {
    if (!open) return
    position()
    const onScroll = () => position()
    const onMouseDown = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [open])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={`input ${className}`}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => { position(); setOpen(true) }}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        autoComplete="off"
      />
      {open && filtered.length > 0 && createPortal(
        <ul style={style} className="bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {filtered.map(opt => (
            <li
              key={opt}
              onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false) }}
              className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 ${opt === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'}`}
            >
              {opt}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}
