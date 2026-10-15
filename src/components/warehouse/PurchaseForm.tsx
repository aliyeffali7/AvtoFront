import { useEffect, useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, Plus, Trash2 } from 'lucide-react'
import { Product, Store } from '@/types'
import { createPurchase, getProducts, previewExcel } from '@/services/warehouse.service'
import { getStores } from '@/services/stores.service'
import { mapApiError } from '@/lib/utils'
import ComboboxInput from '@/components/ui/ComboboxInput'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Money from '@/components/ui/Money'

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

  const newCount = filled.filter(l => !matchFor(l)).length

  return (
    <Modal
      open
      onClose={onCancel}
      width="max-w-[680px]"
      title="Yeni alış"
      subtitle="Mağazadan gələn mallar anbara əlavə olunur."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel}>Ləğv et</Button>
          <Button type="submit" form="purchase-form" loading={saving}>Alışı saxla</Button>
        </>
      }
    >
      <form id="purchase-form" onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        <div>
          <label className="label">Mağaza <span className="text-danger">*</span></label>
          <ComboboxInput value={storeName} onChange={setStoreName} options={stores.map(s => s.name)} placeholder="Məs. Avtoehtiyat MMC" />
        </div>

        <label className="flex items-center gap-3 border border-border rounded-md px-4 py-3 cursor-pointer hover:bg-[#F9F9F9]">
          <input type="checkbox" checked={onCredit} onChange={e => setOnCredit(e.target.checked)} className="w-5 h-5 accent-ink" />
          <span className="flex-1">
            <span className="block text-body font-semibold text-ink">Nisyə alınıb</span>
            <span className="block text-small text-text-3">
              {onCredit ? 'Məbləğ bu mağazaya kreditor borcu kimi yazılacaq. Kassa dəyişmir.' : 'Pulu ödənilib — kassadan "Mal alışı" kimi çıxacaq.'}
            </span>
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tarix</label>
            <input type="date" className="input-mono" value={date} max={today()} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Qaimə №</label>
            <input className="input-mono" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="İstəyə bağlı" />
          </div>
        </div>

        {startWithExcel && source !== 'excel' && (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={loadingExcel}
            className="flex items-center gap-3 px-4 py-3 rounded-md border border-dashed border-border-strong bg-surface-2 hover:bg-[#E3E3E3] text-left transition-colors">
            <FileSpreadsheet size={24} strokeWidth={1.75} className="text-ink shrink-0" />
            <span>
              <span className="block text-body font-semibold text-ink">{loadingExcel ? 'Oxunur...' : 'Excel faylını seçin'}</span>
              <span className="block text-small text-text-3">Tədarükçünün qaiməsi: Adı, Kodu, Sayı, Gross qiyməti, Endirimli qiymət…</span>
            </span>
          </button>
        )}

        <div className="flex items-center justify-between">
          <p className="section-label">Məhsullar ({filled.length})</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcel} />
          <button type="button" onClick={() => fileRef.current?.click()} className="text-small font-semibold text-ink hover:underline underline-offset-2 inline-flex items-center gap-1.5" disabled={loadingExcel}>
            <FileSpreadsheet size={16} strokeWidth={1.75} />
            {loadingExcel ? 'Oxunur...' : 'Excel-dən doldur'}
          </button>
        </div>
        {source === 'excel' && (
          <div className="bg-info-subtle text-info-strong rounded-md px-4 py-3 text-small -mt-1">
            Exceldən oxundu: {filled.length} sətir ({newCount} yeni məhsul). "Endirimli qiymət" alış, "Gross qiyməti" satış qiyməti kimi götürülüb — lazım olsa dəyişin.
            <a href="/numune-ambar.xlsx" download="Nümunə Ambar.xlsx" className="font-semibold underline underline-offset-2 ml-1">Nümunə fayl</a>
          </div>
        )}
        {excelErrors.map((e, i) => <p key={i} className="text-small text-warning-strong bg-warning-subtle rounded px-3 py-2 -mt-1">{e}</p>)}

        <div className="flex flex-col gap-3">
          {lines.map((l, i) => {
            const match = l.name.trim() ? matchFor(l) : null
            return (
              <div key={l.key} className="border border-border rounded-md p-3 flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <span className="font-mono text-small text-text-3 pt-3 w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <ComboboxInput value={l.name} onChange={v => update(l.key, { name: v })} options={productNames} placeholder="Məhsulun adı" />
                    <div className="mt-1.5 min-h-[20px]">
                      {match ? (
                        <span className="text-small text-success-strong">
                          ✓ Mövcud məhsul — stoku artırılacaq (indi: {match.stock_quantity} {match.unit}){match.is_archived ? ', arxivdən çıxarılacaq' : ''}
                        </span>
                      ) : l.name.trim() ? (
                        <Badge variant="info">Yeni məhsul</Badge>
                      ) : null}
                    </div>
                  </div>
                  <button type="button" onClick={() => setLines(prev => prev.length > 1 ? prev.filter(x => x.key !== l.key) : [emptyLine()])} className="w-11 h-11 rounded flex items-center justify-center text-text-3 hover:bg-surface-2 hover:text-danger shrink-0" aria-label="Sətri sil">
                    <Trash2 size={18} strokeWidth={1.75} />
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
          <button type="button" onClick={() => setLines(prev => [...prev, emptyLine()])} className="flex items-center justify-center gap-2 h-11 border border-dashed border-border-strong rounded-md text-body font-semibold text-ink hover:bg-surface-2 transition-colors">
            <Plus size={18} strokeWidth={1.75} /> Məhsul əlavə et
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="section-label">Cəmi</span>
          <Money value={total} className="text-[22px]" />
        </div>

        {error && <p className="text-body text-danger-strong bg-danger-subtle rounded px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}

function LabeledInput({ label, value, onChange, mono, ...rest }: {
  label: string; value: string; onChange: (v: string) => void; mono?: boolean
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-small text-text-3">{label}</span>
      <input className={mono ? 'input-mono' : 'input'} value={value} onChange={e => onChange(e.target.value)} {...rest} />
    </label>
  )
}
