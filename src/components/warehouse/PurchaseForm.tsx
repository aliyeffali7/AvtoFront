import { useEffect, useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, Plus, Trash2 } from 'lucide-react'
import { Product, Store } from '@/types'
import { createPurchase, getProducts, previewExcel } from '@/services/warehouse.service'
import { getStores } from '@/services/stores.service'
import { formatCurrency, mapApiError } from '@/lib/utils'
import ComboboxInput from '@/components/ui/ComboboxInput'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface Line {
  key: number
  name: string
  code: string
  unit: string
  quantity: string
  unitCost: string
  sellPrice: string
}

/** Same rule as the backend's normalize_name: case/space/punctuation-insensitive. */
export function normalizeName(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/\u0130/g, 'i').replace(/I/g, 'i').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

let nextKey = 1
const emptyLine = (): Line => ({ key: nextKey++, name: '', code: '', unit: 'ədəd', quantity: '1', unitCost: '', sellPrice: '' })
const today = () => new Date().toLocaleDateString('sv-SE')

export default function PurchaseForm({
  startWithExcel, onSaved, onCancel,
}: { startWithExcel?: boolean; onSaved: (purchaseId: number) => void; onCancel: () => void }) {
  const [stores, setStores] = useState<Store[]>([])
  const [catalog, setCatalog] = useState<Product[]>([])
  const [storeName, setStoreName] = useState('')
  const [onCredit, setOnCredit] = useState(true)
  const [date, setDate] = useState(today())
  const [invoiceNo, setInvoiceNo] = useState('')
  const [lines, setLines] = useState<Line[]>([emptyLine()])
  const [source, setSource] = useState<'manual' | 'excel'>('manual')
  const [excelErrors, setExcelErrors] = useState<string[]>([])
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getStores().then(r => setStores(r.data)).catch(() => {})
    getProducts(undefined, 'all').then(r => setCatalog(r.data)).catch(() => {})
  }, [])

  const byName = useMemo(() => {
    const map = new Map<string, Product>()
    for (const p of catalog) {
      const key = normalizeName(p.name)
      const current = map.get(key)
      if (!current || (current.is_archived && !p.is_archived)) map.set(key, p)
    }
    return map
  }, [catalog])
  const byCode = useMemo(() => {
    const map = new Map<string, Product>()
    for (const p of catalog) if (p.code?.trim()) map.set(p.code.trim().toLowerCase(), p)
    return map
  }, [catalog])
  const productNames = useMemo(() => [...new Set(catalog.filter(p => !p.is_archived).map(p => p.name))], [catalog])

  const matchFor = (line: Line) =>
    (line.code.trim() && byCode.get(line.code.trim().toLowerCase())) || byName.get(normalizeName(line.name)) || null

  function update(key: number, patch: Partial<Line>) {
    setLines(prev => prev.map(l => {
      if (l.key !== key) return l
      const next = { ...l, ...patch }
      // Picking an existing product fills in what we already know about it.
      if (patch.name !== undefined) {
        const match = byName.get(normalizeName(patch.name))
        if (match) {
          next.code = next.code || match.code || ''
          next.unit = match.unit
          if (!l.sellPrice) next.sellPrice = String(match.sell_price)
          if (!l.unitCost && match.purchase_price) next.unitCost = String(match.purchase_price)
        }
      }
      return next
    }))
  }

  async function handleExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLoadingExcel(true)
    setError('')
    try {
      const res = await previewExcel(file)
      const rows = res.data.rows.filter(r => r.quantity > 0)
      setLines(rows.map(r => ({
        key: nextKey++,
        name: r.match?.name ?? r.name,
        code: r.code,
        unit: r.match?.unit ?? r.unit,
        quantity: String(r.quantity),
        unitCost: String(r.unit_cost),
        sellPrice: String(r.sell_price),
      })))
      setExcelErrors(res.data.errors)
      setSource('excel')
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoadingExcel(false)
    }
  }

  const filled = lines.filter(l => l.name.trim())
  const total = filled.reduce((s, l) => s + (parseFloat(l.unitCost) || 0) * (parseInt(l.quantity) || 0), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!storeName.trim()) { setError('Mağazanı seçin və ya adını yazın.'); return }
    if (filled.length === 0) { setError('Ən azı bir məhsul əlavə edin.'); return }
    const bad = filled.find(l => !(parseInt(l.quantity) > 0))
    if (bad) { setError(`"${bad.name}" üçün miqdar 0-dan böyük olmalıdır.`); return }
    setSaving(true)
    try {
      const res = await createPurchase({
        store_name: storeName.trim(),
        on_credit: onCredit,
        date,
        invoice_no: invoiceNo.trim(),
        source,
        lines: filled.map(l => {
          const match = matchFor(l)
          return {
            ...(match ? { product_id: match.id } : { name: l.name.trim(), code: l.code.trim(), unit: l.unit }),
            quantity: parseInt(l.quantity),
            unit_cost: parseFloat(l.unitCost) || 0,
            sell_price: l.sellPrice === '' ? undefined : parseFloat(l.sellPrice) || 0,
          }
        }),
      })
      onSaved(res.data.id)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 pb-6 -mt-8 flex flex-col gap-4">
      <div className="pr-10">
        <h2 className="font-serif font-semibold text-xl text-ink">Yeni alış</h2>
        <p className="text-sm text-ink-muted mt-0.5">Mağazadan gələn mallar anbara əlavə olunur.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label">Mağaza <span className="text-danger">*</span></label>
        <ComboboxInput value={storeName} onChange={setStoreName} options={stores.map(s => s.name)} placeholder="Məs. Avtoehtiyat MMC" />
      </div>

      <label className="flex items-center gap-3 bg-surface border border-rule rounded px-3 py-3 cursor-pointer">
        <input type="checkbox" checked={onCredit} onChange={e => setOnCredit(e.target.checked)} className="w-5 h-5 rounded border-rule text-accent" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">Nisyə alınıb</span>
          <span className="block text-xs text-ink-muted">
            {onCredit ? 'Məbləğ bu mağazaya kreditor borcu kimi yazılacaq. Kassa dəyişmir.' : 'Pulu ödənilib — kassadan "Mal alışı" kimi çıxacaq.'}
          </span>
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label">Tarix</label>
          <input type="date" className="input-mono" value={date} max={today()} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label">Qaimə №</label>
          <input className="input-mono" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="İstəyə bağlı" />
        </div>
      </div>

      {startWithExcel && source !== 'excel' && (
        <button type="button" onClick={() => fileRef.current?.click()} disabled={loadingExcel}
          className="flex items-center gap-3 px-4 py-3 rounded border border-dashed border-accent bg-surface-alt hover:bg-rule/30 text-left">
          <FileSpreadsheet className="w-6 h-6 text-accent shrink-0" />
          <span>
            <span className="block text-sm font-semibold text-accent">{loadingExcel ? 'Oxunur...' : 'Excel faylını seçin'}</span>
            <span className="block text-xs text-ink-muted">Tədarükçünün qaiməsi: Adı, Kodu, Sayı, Gross qiyməti, Endirimli qiymət…</span>
          </span>
        </button>
      )}

      <div className="flex items-center justify-between">
        <p className="section-label">Məhsullar ({filled.length})</p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcel} />
        <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-semibold text-accent hover:underline flex items-center gap-1.5" disabled={loadingExcel}>
          <FileSpreadsheet className="w-3.5 h-3.5" />
          {loadingExcel ? 'Oxunur...' : 'Excel-dən doldur'}
        </button>
      </div>
      {source === 'excel' && (
        <p className="text-xs text-ink-muted -mt-2">
          Exceldən oxundu. "Endirimli qiymət" alış, "Gross qiyməti" satış qiyməti kimi götürülüb — lazım olsa dəyişin.
          <a href="/numune-ambar.xlsx" download="Nümunə Ambar.xlsx" className="text-accent hover:underline ml-1">Nümunə fayl</a>
        </p>
      )}
      {excelErrors.map((e, i) => <p key={i} className="text-xs text-warning -mt-2">{e}</p>)}

      <div className="flex flex-col gap-3">
        {lines.map((l, i) => {
          const match = l.name.trim() ? matchFor(l) : null
          return (
            <div key={l.key} className="bg-surface border border-rule rounded p-3 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs text-ink-muted pt-3 w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <ComboboxInput value={l.name} onChange={v => update(l.key, { name: v })} options={productNames} placeholder="Məhsulun adı" />
                  <div className="mt-1 min-h-[18px]">
                    {match ? (
                      <span className="text-xs text-success">
                        ✓ Mövcud məhsul — stoku artırılacaq (indi: {match.stock_quantity} {match.unit}){match.is_archived ? ', arxivdən çıxarılacaq' : ''}
                      </span>
                    ) : l.name.trim() ? (
                      <Badge variant="accent">Yeni məhsul</Badge>
                    ) : null}
                  </div>
                </div>
                <button type="button" onClick={() => setLines(prev => prev.length > 1 ? prev.filter(x => x.key !== l.key) : [emptyLine()])} className="p-2 text-ink-muted hover:text-danger" aria-label="Sətri sil">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-7">
                <LabeledInput label="Kodu" value={l.code} onChange={v => update(l.key, { code: v })} mono />
                <LabeledInput label={`Say (${l.unit})`} value={l.quantity} onChange={v => update(l.key, { quantity: v })} type="number" min="1" mono />
                <LabeledInput label="Alış (₼)" value={l.unitCost} onChange={v => update(l.key, { unitCost: v })} type="number" step="0.01" min="0" mono />
                <LabeledInput label="Satış (₼)" value={l.sellPrice} onChange={v => update(l.key, { sellPrice: v })} type="number" step="0.01" min="0" mono />
              </div>
            </div>
          )
        })}
        <button type="button" onClick={() => setLines(prev => [...prev, emptyLine()])} className="flex items-center justify-center gap-2 py-3 border border-dashed border-rule rounded text-sm font-semibold text-accent hover:bg-surface-alt">
          <Plus className="w-4 h-4" /> Məhsul əlavə et
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-rule pt-3">
        <span className="section-label">Cəmi</span>
        <span className="font-mono font-bold text-lg text-ink">{formatCurrency(total)}</span>
      </div>

      {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={saving} className="flex-1">Alışı saxla</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Ləğv et</Button>
      </div>
    </form>
  )
}

function LabeledInput({ label, value, onChange, mono, ...rest }: {
  label: string; value: string; onChange: (v: string) => void; mono?: boolean
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-ink-muted">{label}</span>
      <input className={mono ? 'input-mono py-2' : 'input py-2'} value={value} onChange={e => onChange(e.target.value)} {...rest} />
    </label>
  )
}
