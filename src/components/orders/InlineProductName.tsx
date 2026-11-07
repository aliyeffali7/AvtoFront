import { useState } from 'react'
import { t } from '@/i18n'

/**
 * Name of a "sifarişlik" part on the order page, editable in place: click,
 * type, Enter (or click away) saves, Esc cancels. Shelf products are renamed
 * in Stok, so they never get this.
 */
export default function InlineProductName({ name, onSave }: { name: string; onSave: (name: string) => Promise<string | null> }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function start() {
    setValue(name); setError(''); setEditing(true)
  }

  async function save() {
    const next = value.trim()
    if (saving) return
    if (!next || next === name) { setEditing(false); setError(''); return }
    setSaving(true)
    const failed = await onSave(next)
    setSaving(false)
    if (failed) { setError(failed); return }
    setEditing(false); setError('')
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={start}
        title={t('Adı dəyişmək üçün klikləyin')}
        className="text-body text-text-1 text-left underline decoration-dotted decoration-text-3 underline-offset-4 hover:decoration-ink"
      >
        {name}
      </button>
    )
  }

  return (
    <div>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); save() }
          if (e.key === 'Escape') { setEditing(false); setError('') }
        }}
        readOnly={saving}
        maxLength={255}
        aria-label={t('Məhsulun adı')}
        className="input w-full"
        autoFocus
      />
      {error && <p className="text-small text-danger mt-1">{error}</p>}
    </div>
  )
}
