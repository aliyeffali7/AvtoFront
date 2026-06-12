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

  function updatePosition() {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const maxH = 220

    if (spaceBelow >= maxH || spaceBelow >= r.top) {
      setStyle({ position: 'fixed', top: r.bottom + 4, left: r.left, width: r.width, zIndex: 99999 })
    } else {
      setStyle({ position: 'fixed', bottom: window.innerHeight - r.top + 4, left: r.left, width: r.width, zIndex: 99999 })
    }
  }

  useEffect(() => {
    if (!open) return
    updatePosition()
    const onScroll = () => updatePosition()
    const onMouseDown = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', updatePosition)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', updatePosition)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [open])

  const showDropdown = open && (filtered.length > 0 || options.length === 0)

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
        onFocus={() => { updatePosition(); setOpen(true) }}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        autoComplete="off"
      />
      {showDropdown && createPortal(
        <ul style={{ ...style, maxHeight: 220 }} className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map(opt => (
              <li
                key={opt}
                onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false) }}
                className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 ${opt === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'}`}
              >
                {opt}
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-gray-400 italic">Kreditor tapılmadı</li>
          )}
        </ul>,
        document.body
      )}
    </div>
  )
}
