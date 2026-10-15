import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { ServiceTemplate } from '@/types'
import { formatCurrency } from '@/lib/utils'

/** Searchable "Hazır iş" select shown at the top of a service row. Picking
 * one fills the job's name, price and fixed usta payı. Hidden when the
 * business has no templates. */
export default function ServiceTemplatePicker({ templates, onPick }: {
  templates: ServiceTemplate[]
  onPick: (t: ServiceTemplate) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  if (templates.length === 0) return null
  const q = query.trim().toLowerCase()
  const shown = q ? templates.filter(t => t.name.toLowerCase().includes(q)) : templates

  return (
    <div ref={boxRef} className="relative">
      <Search size={16} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" aria-hidden="true" />
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        placeholder="Hazır iş seç..."
        aria-label="Hazır iş"
        autoComplete="off"
        className="input !pl-9"
      />
      {open && (
        <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-surface border border-border rounded shadow-md max-h-52 overflow-y-auto">
          {shown.length === 0 ? (
            <li className="px-3 py-2.5 text-body text-text-3">Hazır iş tapılmadı</li>
          ) : shown.map(t => (
            <li key={t.id}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onPick(t); setQuery(''); setOpen(false) }}
                className="w-full px-3 py-2.5 text-left hover:bg-surface-2 border-b border-border last:border-0 flex items-center justify-between gap-3"
              >
                <span className="text-body text-text-1 min-w-0 truncate">{t.name}</span>
                <span className="text-small font-mono text-text-2 shrink-0">{formatCurrency(Number(t.price))}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
