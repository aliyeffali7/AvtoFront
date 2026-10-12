import { useId } from 'react'
import { Referrer } from '@/types'

export interface ReferrerValue {
  name: string
  percent: string
}

/** Who brought the shop + their percent. One name box: pick an existing
 * referrer from the suggestions or type a new name — the backend creates it. */
export default function ReferrerPicker({ value, onChange, referrers, autoFocus }: {
  value: ReferrerValue
  onChange: (value: ReferrerValue) => void
  referrers: Referrer[]
  autoFocus?: boolean
}) {
  const listId = useId()
  const name = value.name.trim()
  const isNew = name !== '' && !referrers.some(r => r.name.toLowerCase() === name.toLowerCase())

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[1fr_6.5rem] gap-2">
        <label className="flex flex-col gap-1 text-xs text-ink-muted">Kim gətirib?
          <input
            list={listId}
            value={value.name}
            onChange={e => onChange({ ...value, name: e.target.value })}
            placeholder="Adını yazın və ya seçin"
            className="input"
            autoFocus={autoFocus}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">Faizi (%)
          <input
            type="number" min="0.5" max="100" step="0.5"
            value={value.percent}
            onChange={e => onChange({ ...value, percent: e.target.value })}
            placeholder="20"
            className="input-mono"
            required
          />
        </label>
      </div>
      <datalist id={listId}>
        {referrers.map(r => <option key={r.id} value={r.name} />)}
      </datalist>
      <p className="text-xs text-ink-muted">
        {isNew ? `"${name}" yeni referal kimi əlavə olunacaq. ` : ''}
        Servis hər dəfə ödəyəndə, ödənişin bu faizi ona borcunuz kimi yazılır.
      </p>
    </div>
  )
}
