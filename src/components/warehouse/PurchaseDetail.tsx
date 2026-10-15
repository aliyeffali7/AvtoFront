import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Ban, Undo2 } from 'lucide-react'
import { Purchase, PurchaseLine } from '@/types'
import { cancelPurchase, getPurchase, returnPurchaseLine } from '@/services/warehouse.service'
import { formatCurrency, formatDate, mapApiError } from '@/lib/utils'
import { useGoBack } from '@/lib/useGoBack'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import InkBand from '@/components/ui/InkBand'
import Modal from '@/components/ui/Modal'
import Money from '@/components/ui/Money'
import Spinner from '@/components/ui/Spinner'
import { SOURCE_LABEL } from './PurchasesTab'

/** Full-page purchase (qaimə): header, ink band, lines with returns, cancel. */
export default function PurchaseDetail() {
  const goBack = useGoBack('/business/warehouse/purchases')
  const { purchaseId } = useParams<{ purchaseId: string }>()
  const id = purchaseId ? parseInt(purchaseId) : NaN

  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [returning, setReturning] = useState<PurchaseLine | null>(null)
  const [returnQty, setReturnQty] = useState('1')
  const [busy, setBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) { setLoadError(true); setLoading(false); return }
    setLoading(true)
    setLoadError(false)
    try {
      setPurchase((await getPurchase(id)).data)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { setPurchase(null); setNotice(''); setError(''); load() }, [load])

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      await fn()
      setNotice(done)
      setReturning(null)
      setConfirmCancel(false)
      await load()
    } catch (err) {
      setError(mapApiError(err))
      setConfirmCancel(false)
    } finally {
      setBusy(false)
    }
  }

  const backBtn = (
    <div>
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={goBack}>Geri — Alışlar</Button>
    </div>
  )

  if (loading && !purchase) return <div className="flex flex-col gap-4">{backBtn}<Spinner /></div>
  if (loadError || !purchase) {
    return (
      <div className="flex flex-col gap-4">
        {backBtn}
        <EmptyState title="Alış tapılmadı" subtitle="Bu alış silinib və ya əlçatan deyil." />
      </div>
    )
  }

  const lines = purchase.lines ?? []
  const untouched = lines.every(l => l.remaining_quantity === l.quantity && l.returned_quantity === 0)
  const total = Number(purchase.total)
  const debt = purchase.on_credit && purchase.debt_remaining !== null ? Number(purchase.debt_remaining) : 0
  const paid = purchase.on_credit ? total - debt : total

  return (
    <div className="flex flex-col gap-4">
      {backBtn}

      {/* Header card */}
      <div className="card p-5 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <p className="font-mono text-small text-text-3">
            {purchase.invoice_no ? `Qaimə №${purchase.invoice_no}` : `Alış #${purchase.id}`} · {formatDate(purchase.date)}
          </p>
          <h1 className="page-title">
            <Link to={`/business/stores/${purchase.store}`} className="hover:underline underline-offset-4">{purchase.store_name}</Link>
          </h1>
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            {purchase.is_cancelled
              ? <Badge variant="danger">Ləğv edilib</Badge>
              : <Badge variant={purchase.on_credit ? 'warning' : 'success'}>{purchase.on_credit ? 'Nisyə' : 'Nağd'}</Badge>}
            <Badge variant="neutral">{SOURCE_LABEL[purchase.source]}</Badge>
            {purchase.order && (
              <Link to={`/business/orders/${purchase.order}`} className="text-small font-semibold text-ink hover:underline underline-offset-2">
                Sifariş #{purchase.order_number} üçün alınıb →
              </Link>
            )}
          </div>
        </div>
        {!purchase.is_cancelled && untouched && (
          <Button variant="danger" icon={Ban} onClick={() => setConfirmCancel(true)}>Ləğv et</Button>
        )}
      </div>

      {notice && <p className="text-body text-success-strong bg-success-subtle rounded px-4 py-3">{notice}</p>}
      {error && !returning && <p className="text-body text-danger-strong bg-danger-subtle rounded px-4 py-3">{error}</p>}

      <InkBand
        label="Alış"
        items={[
          { label: 'Alışın məbləği', value: formatCurrency(total) },
          { label: 'Ödənilib', value: formatCurrency(paid) },
          ...(purchase.on_credit && purchase.debt_remaining !== null
            ? [{ label: 'Borc qalığı', value: formatCurrency(debt), note: debt > 0 ? 'Ödəniləcək' : undefined, highlight: debt > 0 }]
            : []),
        ]}
      />

      {/* Lines */}
      <section className="card overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="section-label">Məhsullar ({lines.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="ledger-table min-w-[760px]">
            <thead>
              <tr>
                <th className="ledger-th">Məhsul</th>
                <th className="ledger-th text-right">Say</th>
                <th className="ledger-th text-right">Alış</th>
                <th className="ledger-th text-right">Satış</th>
                <th className="ledger-th text-right">Rəfdə qalıb</th>
                <th className="ledger-th text-right">Məbləğ</th>
                <th className="ledger-th w-px"><span className="sr-only">Qaytar</span></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l: PurchaseLine) => (
                <tr key={l.id} className="ledger-row cursor-default">
                  <td className="ledger-td whitespace-normal">
                    <Link to={`/business/warehouse/products/${l.product}`} className="font-semibold hover:underline underline-offset-2">{l.product_name}</Link>
                    {l.product_code && <span className="block font-mono text-small text-text-3">{l.product_code}</span>}
                  </td>
                  <td className="ledger-td text-right font-mono tabular-nums">{l.quantity} <span className="text-text-3">{l.unit}</span></td>
                  <td className="ledger-td text-right"><Money value={l.unit_cost} /></td>
                  <td className="ledger-td text-right"><Money value={l.sell_price} /></td>
                  <td className="ledger-td text-right font-mono tabular-nums">
                    {l.remaining_quantity}
                    {l.returned_quantity > 0 && <span className="block text-small text-text-3">qaytarılıb: {l.returned_quantity}</span>}
                  </td>
                  <td className="ledger-td text-right"><Money value={l.line_total} /></td>
                  <td className="ledger-td text-right">
                    {!purchase.is_cancelled && l.remaining_quantity > 0 && (
                      <Button variant="secondary" size="sm" icon={Undo2} onClick={() => { setReturning(l); setReturnQty('1'); setError('') }}>
                        Qaytar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-2">
                <td className="ledger-td font-semibold" colSpan={5}>Cəmi · {lines.length} məhsul</td>
                <td className="ledger-td text-right"><Money value={total} className="font-bold" /></td>
                <td className="ledger-td" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {!purchase.is_cancelled && !untouched && (
        <p className="text-small text-text-3">Bu alışın mallarından istifadə olunub — ləğv etmək olmaz, lazım olanı mağazaya qaytarın.</p>
      )}

      {/* Return a line */}
      <Modal
        open={!!returning}
        onClose={() => setReturning(null)}
        title="Mağazaya qaytar"
        subtitle={returning?.product_name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReturning(null)}>Ləğv et</Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => returning && run(
                () => returnPurchaseLine(returning.id, parseInt(returnQty) || 0),
                purchase.on_credit ? 'Qaytarıldı — borc azaldıldı.' : 'Qaytarıldı — pul kassaya qayıtdı.',
              )}
            >
              Mağazaya qaytar
            </Button>
          </>
        }
      >
        {returning && (
          <div className="flex flex-col gap-4 pb-2">
            <p className="text-body text-text-2">
              {purchase.on_credit ? 'Qaytarılan malın məbləği tədarükçüyə borcdan çıxılacaq.' : 'Qaytarılan malın pulu kassaya qayıdacaq.'}
            </p>
            <div>
              <label className="label">Miqdar (maks. {returning.remaining_quantity})</label>
              <input type="number" min={1} max={returning.remaining_quantity} value={returnQty} onChange={e => setReturnQty(e.target.value)} className="input-mono" autoFocus />
            </div>
            {error && <p className="text-body text-danger-strong bg-danger-subtle rounded px-3 py-2">{error}</p>}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmCancel}
        title="Alışı ləğv et"
        message={`Alış tamamilə ləğv edilsin? Mallar stokdan çıxarılacaq${purchase.on_credit ? ', borc silinəcək' : ', kassadakı xərc silinəcək'}.`}
        confirmLabel="Bəli, ləğv et"
        cancelLabel="Xeyr"
        danger
        onConfirm={() => run(() => cancelPurchase(purchase.id), 'Alış ləğv edildi.')}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  )
}
