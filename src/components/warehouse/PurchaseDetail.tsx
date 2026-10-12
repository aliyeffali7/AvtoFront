import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Purchase, PurchaseLine } from '@/types'
import { cancelPurchase, getPurchase, returnPurchaseLine } from '@/services/warehouse.service'
import { formatCurrency, formatDate, mapApiError } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

export default function PurchaseDetail({ purchaseId, onChanged }: { purchaseId: number; onChanged: () => void }) {
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [returningId, setReturningId] = useState<number | null>(null)
  const [returnQty, setReturnQty] = useState('1')
  const [busy, setBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setPurchase((await getPurchase(purchaseId)).data)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }, [purchaseId])

  useEffect(() => { load() }, [load])

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      await fn()
      setNotice(done)
      setReturningId(null)
      setConfirmCancel(false)
      await load()
      onChanged()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading && !purchase) return <Spinner />
  if (!purchase) return <p className="p-6 text-sm text-danger">{error || 'Alış tapılmadı.'}</p>
  const lines = purchase.lines ?? []
  const untouched = lines.every(l => l.remaining_quantity === l.quantity && l.returned_quantity === 0)

  return (
    <div className="px-5 pb-6 -mt-8">
      <div className="pr-10 mb-4">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {purchase.is_cancelled
            ? <Badge variant="danger">Ləğv edilib</Badge>
            : <Badge variant={purchase.on_credit ? 'warning' : 'success'}>{purchase.on_credit ? 'Nisyə' : 'Nağd'}</Badge>}
          <span className="font-mono text-xs text-ink-muted">{formatDate(purchase.date)}</span>
          {purchase.invoice_no && <span className="font-mono text-xs text-ink-muted">№{purchase.invoice_no}</span>}
        </div>
        <h2 className="font-serif font-semibold text-xl text-ink">{purchase.store_name}</h2>
        {purchase.order && (
          <Link to={`/business/orders/${purchase.order}`} className="text-sm text-accent hover:underline">
            Sifariş #{purchase.order_number} üçün alınıb →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-surface border border-rule rounded px-3 py-2.5">
          <p className="section-label mb-1">Məbləğ</p>
          <p className="font-mono font-semibold text-sm">{formatCurrency(purchase.total)}</p>
        </div>
        {purchase.on_credit && purchase.debt_remaining !== null && (
          <div className="bg-surface border border-rule rounded px-3 py-2.5">
            <p className="section-label mb-1">Borc qalığı</p>
            <p className={`font-mono font-semibold text-sm ${purchase.debt_remaining > 0 ? 'text-danger' : 'text-success'}`}>
              {formatCurrency(purchase.debt_remaining)}
            </p>
          </div>
        )}
      </div>

      {notice && <p className="text-sm text-success bg-success-bg rounded px-3 py-2 mb-3">{notice}</p>}
      {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2 mb-3">{error}</p>}

      <p className="section-label mb-1.5">Məhsullar</p>
      <div className="bg-surface border border-rule rounded divide-y divide-rule/60 mb-4">
        {lines.map((l: PurchaseLine) => (
          <div key={l.id} className="px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link to={`/business/warehouse/products/${l.product}`} className="text-sm font-medium text-ink hover:text-accent">{l.product_name}</Link>
                <p className="text-xs text-ink-muted font-mono">
                  {l.quantity} {l.unit} × {formatCurrency(l.unit_cost)} · satış {formatCurrency(l.sell_price)}
                </p>
                <p className="text-xs text-ink-muted">
                  Rəfdə qalıb: {l.remaining_quantity}{l.returned_quantity > 0 ? ` · qaytarılıb: ${l.returned_quantity}` : ''}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold shrink-0">{formatCurrency(l.line_total)}</span>
            </div>
            {!purchase.is_cancelled && l.remaining_quantity > 0 && (
              returningId === l.id ? (
                <div className="flex items-center gap-2 mt-2">
                  <input type="number" min={1} max={l.remaining_quantity} value={returnQty} onChange={e => setReturnQty(e.target.value)} className="input-mono w-20 py-1.5" />
                  <Button variant="danger" className="min-h-0 py-1.5 text-xs" loading={busy}
                    onClick={() => run(() => returnPurchaseLine(l.id, parseInt(returnQty) || 0),
                      purchase.on_credit ? 'Qaytarıldı — borc azaldıldı.' : 'Qaytarıldı — pul kassaya qayıtdı.')}>
                    Mağazaya qaytar
                  </Button>
                  <button className="text-xs text-ink-muted hover:text-ink" onClick={() => setReturningId(null)}>Ləğv et</button>
                </div>
              ) : (
                <button className="text-xs font-semibold text-accent hover:underline mt-1" onClick={() => { setReturningId(l.id); setReturnQty('1') }}>
                  Mağazaya qaytar
                </button>
              )
            )}
          </div>
        ))}
      </div>

      {!purchase.is_cancelled && (
        untouched ? (
          confirmCancel ? (
            <div className="card p-3 flex flex-col gap-2">
              <p className="text-sm text-ink">Alış tamamilə ləğv edilsin? Mallar stokdan çıxarılacaq{purchase.on_credit ? ', borc silinəcək' : ', kassadakı xərc silinəcək'}.</p>
              <div className="flex gap-2">
                <Button variant="danger" loading={busy} onClick={() => run(() => cancelPurchase(purchase.id), 'Alış ləğv edildi.')}>Bəli, ləğv et</Button>
                <Button variant="secondary" onClick={() => setConfirmCancel(false)}>Xeyr</Button>
              </div>
            </div>
          ) : (
            <button className="text-sm font-semibold text-danger hover:underline" onClick={() => setConfirmCancel(true)}>
              Səhv daxil edilib — alışı ləğv et
            </button>
          )
        ) : (
          <p className="text-xs text-ink-muted">Bu alışın mallarından istifadə olunub — ləğv etmək olmaz, lazım olanı mağazaya qaytarın.</p>
        )
      )}
    </div>
  )
}
