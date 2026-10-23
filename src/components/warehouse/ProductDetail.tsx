import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Archive, ArchiveRestore, ClipboardCheck, GitMerge, Pencil, Trash2, Undo2 } from 'lucide-react'
import { Product, ProductCard, SupplierPaymentStatus } from '@/types'
import {
  getProductCard, updateProduct, writeOffProduct, countProduct, deleteProduct, getProducts, mergeProduct,
  returnPurchaseLine,
} from '@/services/warehouse.service'
import { formatCurrency, formatDate, mapApiError } from '@/lib/utils'
import { useGoBack } from '@/lib/useGoBack'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ComboboxInput from '@/components/ui/ComboboxInput'
import EmptyState from '@/components/ui/EmptyState'
import InkBand from '@/components/ui/InkBand'
import Modal from '@/components/ui/Modal'
import Money from '@/components/ui/Money'
import Spinner from '@/components/ui/Spinner'
import StatusBadge from '@/components/ui/StatusBadge'
import OrderStatusBadge from '@/components/orders/StatusBadge'
import MovementKindBadge from './MovementKindBadge'
import { t } from '@/i18n'

type Action = 'none' | 'edit' | 'writeoff' | 'count' | 'merge' | 'return'

const PAYMENT_STATUS: Record<SupplierPaymentStatus, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  paid: { label: 'Ödənilib', variant: 'success' },
  partial: { label: 'Qismən', variant: 'warning' },
  unpaid: { label: 'Ödənilməyib', variant: 'danger' },
}

/** Nağd, or Nisyə with the kreditor state (Ödənilib / Qismən / Ödənilməyib). */
function PaymentCell({ onCredit, status }: { onCredit: boolean | null; status: SupplierPaymentStatus | null }) {
  if (onCredit === null) return <span className="text-text-3">—</span>
  if (!onCredit) return <Badge variant="success">{t('Nağd')}</Badge>
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge variant="warning">{t('Nisyə')}</Badge>
      {status && <Badge variant={PAYMENT_STATUS[status].variant}>{t(PAYMENT_STATUS[status].label)}</Badge>}
    </span>
  )
}

/** Full-page product card: header, ink band, batches, purchases, sales, movements. */
export default function ProductDetail() {
  const navigate = useNavigate()
  const goBack = useGoBack('/business/warehouse/products')
  const { productId } = useParams<{ productId: string }>()
  const id = productId ? parseInt(productId) : NaN

  const [card, setCard] = useState<ProductCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [action, setAction] = useState<Action>('none')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // edit
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [threshold, setThreshold] = useState('')
  // write-off / count
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  // merge
  const [catalog, setCatalog] = useState<Product[]>([])
  const [mergeName, setMergeName] = useState('')
  // return to supplier
  const [returnLineId, setReturnLineId] = useState('')

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) { setLoadError(true); setLoading(false); return }
    setLoading(true)
    setLoadError(false)
    try {
      const res = await getProductCard(id)
      setCard(res.data)
      const p = res.data.product
      setName(p.name); setCode(p.code || ''); setSellPrice(String(p.sell_price))
      setThreshold(String(p.low_stock_threshold ?? 3))
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { setCard(null); setNotice(''); load() }, [load])

  function openReturn(lineId?: number | null) {
    const first = card?.purchases.find(pl => pl.remaining_quantity > 0)
    openAction('return')
    setReturnLineId(String(lineId ?? first?.line_id ?? ''))
    setQty('1')
  }

  function openAction(a: Action) {
    if (a === 'merge' && catalog.length === 0) {
      getProducts(undefined, 'all').then(r => setCatalog(r.data.filter(x => x.id !== id))).catch(() => {})
    }
    setMergeName('')
    setAction(a)
    setQty(a === 'count' && card ? String(card.product.stock_quantity) : '')
    setNote('')
    setError('')
    setNotice('')
  }

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true)
    setError('')
    try {
      await fn()
      setNotice(done)
      setAction('none')
      await load()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setBusy(false)
    }
  }

  const backBtn = (
    <div>
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={goBack}>{t('Geri — Məhsullar')}</Button>
    </div>
  )

  if (loading && !card) return <div className="flex flex-col gap-4">{backBtn}<Spinner /></div>
  if (loadError || !card) {
    return (
      <div className="flex flex-col gap-4">
        {backBtn}
        <EmptyState title={t('Məhsul tapılmadı')} subtitle={t('Bu məhsul silinib və ya əlçatan deyil.')} />
      </div>
    )
  }
  const p = card.product
  const totals = card.totals
  const isWarehouse = p.is_warehouse !== false
  const low = isWarehouse && p.stock_quantity > 0 && p.stock_quantity < (p.low_stock_threshold ?? 3)
  const out = isWarehouse && p.stock_quantity <= 0
  const closeModal = () => setAction('none')
  const mergeTarget = catalog.find(x => x.name === mergeName)
  const returnable = card.purchases.filter(pl => pl.remaining_quantity > 0)
  const returnLine = returnable.find(pl => String(pl.line_id) === returnLineId)
  const returnQtyNum = parseInt(qty) || 0

  return (
    <div className="flex flex-col gap-4">
      {backBtn}

      {/* Header card */}
      <div className="card p-5 flex flex-wrap items-center gap-4">
        <span className="w-12 h-12 rounded border border-border bg-surface-2 flex items-center justify-center shrink-0 font-mono text-small font-semibold text-ink overflow-hidden px-1 text-center">
          {(p.code || p.name).slice(0, 4).toUpperCase()}
        </span>
        <div className="flex-1 min-w-[220px]">
          <h1 className="page-title">{p.name}</h1>
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            {p.code && <span className="font-mono text-small text-text-3">{p.code}</span>}
            {out && <StatusBadge status="Bitib" />}
            {low && <StatusBadge status="Az qalıb" />}
            {isWarehouse && !low && !out && <StatusBadge status="Stokda" />}
            <Badge variant="neutral">{t(p.unit)}</Badge>
            {isWarehouse ? <Badge variant="accent">{t('Anbar məhsulu')}</Badge> : <Badge variant="neutral">{t('Sifarişlik')}</Badge>}
            {p.is_archived && <Badge variant="danger">{t('Arxivdə')}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={Pencil} onClick={() => openAction('edit')}>{t('Düzəliş')}</Button>
          {p.stock_quantity > 0 && (
            <Button variant="secondary" icon={Trash2} onClick={() => openAction('writeoff')}>{t('Silinmə / itki')}</Button>
          )}
          {returnable.length > 0 && (
            <Button variant="secondary" icon={Undo2} onClick={() => openReturn()}>{t('Tədarükçüyə qaytar')}</Button>
          )}
          <Button variant="secondary" icon={ClipboardCheck} onClick={() => openAction('count')}>{t('Sayım')}</Button>
          <Button variant="secondary" icon={GitMerge} onClick={() => openAction('merge')}>{t('Birləşdir')}</Button>
          {p.is_archived ? (
            <Button variant="secondary" icon={ArchiveRestore} disabled={busy}
              onClick={() => run(() => updateProduct(p.id, { is_archived: false }), t('Məhsul arxivdən çıxarıldı.'))}>
              {t('Arxivdən çıxar')}
            </Button>
          ) : p.stock_quantity === 0 && (
            <Button variant="secondary" icon={Archive} disabled={busy}
              onClick={() => run(async () => {
                const res = await deleteProduct(p.id)
                if (res.data.result === 'deleted') navigate('/business/warehouse/products', { replace: true })
              }, t('Məhsul arxivə göndərildi. Tarixçəsi saxlanılır.'))}>
              {t('Arxivə göndər')}
            </Button>
          )}
        </div>
      </div>

      {notice && <p className="text-body text-success-strong bg-success-subtle rounded px-4 py-3">{notice}</p>}
      {error && action === 'none' && <p className="text-body text-danger-strong bg-danger-subtle rounded px-4 py-3">{error}</p>}

      <InkBand
        items={[
          { label: t('Stok'), value: `${p.stock_quantity} ${t(p.unit)}` },
          { label: t('Anbar dəyəri (FIFO)'), value: formatCurrency(totals.stock_value) },
          { label: t('Satış qiyməti'), value: formatCurrency(p.sell_price) },
          { label: t('Qazanc (satılanlardan)'), value: `${totals.profit > 0 ? '+' : totals.profit < 0 ? '−' : ''}${formatCurrency(Math.abs(totals.profit))}` },
        ]}
      />

      {/* Remaining batches */}
      {card.batches.length > 0 && (
        <section className="card overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="section-label">{t('Qalan partiyalar (FIFO — əvvəl köhnə satılır)')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th className="ledger-th">{t('Tarix')}</th>
                  <th className="ledger-th">{t('Tədarükçü')}</th>
                  <th className="ledger-th">{t('Alış (qaimə)')}</th>
                  <th className="ledger-th">{t('Ödəniş')}</th>
                  <th className="ledger-th text-right">{t('Qalıb')}</th>
                  <th className="ledger-th text-right">{t('Alış qiyməti')}</th>
                  <th className="ledger-th text-right">{t('Dəyəri')}</th>
                  <th className="ledger-th" />
                </tr>
              </thead>
              <tbody>
                {card.batches.map(b => (
                  <tr key={b.id} className="ledger-row cursor-default">
                    <td className="ledger-td font-mono text-text-2">{formatDate(b.date)}</td>
                    <td className="ledger-td">
                      {b.store && b.store_name ? (
                        <Link to={`/business/stores/${b.store}`} className="hover:underline">{b.store_name}</Link>
                      ) : (b.store_name ?? <span className="text-text-3">—</span>)}
                    </td>
                    <td className="ledger-td">
                      {b.purchase ? (
                        <Link to={`/business/warehouse/purchases/${b.purchase}`} className="font-mono text-small font-semibold hover:underline underline-offset-2">
                          {b.invoice_no ? `№${b.invoice_no}` : `${t('Alış')} #${b.purchase}`}
                        </Link>
                      ) : <span className="text-text-3">{t('İlkin qalıq')}</span>}
                    </td>
                    <td className="ledger-td"><PaymentCell onCredit={b.on_credit} status={b.payment_status} /></td>
                    <td className="ledger-td text-right font-mono tabular-nums">{b.remaining_quantity} / {b.quantity}</td>
                    <td className="ledger-td text-right"><Money value={b.purchase_price} /></td>
                    <td className="ledger-td text-right"><Money value={b.remaining_quantity * Number(b.purchase_price)} /></td>
                    <td className="ledger-td text-right">
                      {b.purchase_line && returnable.some(pl => pl.line_id === b.purchase_line) && (
                        <Button variant="secondary" size="sm" icon={Undo2} onClick={() => openReturn(b.purchase_line)}>{t('Qaytar')}</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2">
                  <td className="ledger-td font-semibold" colSpan={4}>{t('Cəmi')} · {t('{n} partiya', { n: card.batches.length })}</td>
                  <td className="ledger-td text-right font-mono font-bold tabular-nums">{card.batches.reduce((s, b) => s + b.remaining_quantity, 0)}</td>
                  <td className="ledger-td" />
                  <td className="ledger-td text-right"><Money value={card.batches.reduce((s, b) => s + b.remaining_quantity * Number(b.purchase_price), 0)} className="font-bold" /></td>
                  <td className="ledger-td" />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {/* Purchases */}
        <section className="card overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="section-label">{t('Kimdən alınıb')} ({card.purchases.length})</h2>
          </div>
          {card.purchases.length === 0 ? (
            <p className="px-5 pb-5 text-body text-text-3">{t('Alış qeydi yoxdur.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th className="ledger-th">{t('Tarix')}</th>
                    <th className="ledger-th">{t('Tədarükçü')}</th>
                    <th className="ledger-th">{t('Ödəniş')}</th>
                    <th className="ledger-th text-right">{t('Say')}</th>
                    <th className="ledger-th text-right">{t('Alış')}</th>
                  </tr>
                </thead>
                <tbody>
                  {card.purchases.map(pl => (
                    <tr key={pl.line_id} onClick={() => navigate(`/business/warehouse/purchases/${pl.purchase_id}`)} className="ledger-row">
                      <td className="ledger-td font-mono text-text-2">{formatDate(pl.date)}</td>
                      <td className="ledger-td font-semibold">{pl.store_name}</td>
                      <td className="ledger-td"><PaymentCell onCredit={pl.on_credit} status={pl.payment_status} /></td>
                      <td className="ledger-td text-right font-mono tabular-nums">{pl.quantity - pl.returned_quantity}</td>
                      <td className="ledger-td text-right"><Money value={pl.unit_cost} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Sales */}
        <section className="card overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="section-label">{t('Kimə satılıb')} ({card.sales.length})</h2>
          </div>
          {card.sales.length === 0 ? (
            <p className="px-5 pb-5 text-body text-text-3">{t('Heç bir sifarişdə istifadə olunmayıb.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th className="ledger-th">{t('Sifariş')}</th>
                    <th className="ledger-th">{t('Müştəri')}</th>
                    <th className="ledger-th">{t('Status')}</th>
                    <th className="ledger-th text-right">{t('Say × Qiymət')}</th>
                    <th className="ledger-th text-right">{t('Qazanc@@product')}</th>
                  </tr>
                </thead>
                <tbody>
                  {card.sales.map(s => (
                    <tr key={s.order_id} onClick={() => navigate(`/business/orders/${s.order_id}`)} className="ledger-row">
                      <td className="ledger-td font-mono font-semibold">#{s.order_number}</td>
                      <td className="ledger-td">{s.customer_name || s.plate || '—'}</td>
                      <td className="ledger-td"><OrderStatusBadge status={s.status} /></td>
                      <td className="ledger-td text-right font-mono tabular-nums">{s.quantity} × {formatCurrency(s.sell_price)}</td>
                      <td className="ledger-td text-right"><Money value={s.profit} meaning="profit" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Movements */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <h2 className="section-label">{t('Son hərəkətlər')}</h2>
          <Link to={`/business/warehouse/movements?product=${p.id}`} className="text-small font-semibold text-ink hover:underline underline-offset-2">{t('Bütün hərəkətlər →')}</Link>
        </div>
        {card.movements.length === 0 ? (
          <p className="px-5 pb-5 text-body text-text-3">{t('Hərəkət yoxdur.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th className="ledger-th">{t('Tarix')}</th>
                  <th className="ledger-th">{t('Növ')}</th>
                  <th className="ledger-th text-right">{t('Say')}</th>
                  <th className="ledger-th">{t('Qeyd')}</th>
                </tr>
              </thead>
              <tbody>
                {card.movements.slice(0, 15).map(m => (
                  <tr key={m.id} className="ledger-row cursor-default">
                    <td className="ledger-td font-mono text-text-2">{formatDate(m.date)}</td>
                    <td className="ledger-td"><MovementKindBadge kind={m.kind} label={m.kind_label} /></td>
                    <td className="ledger-td text-right font-mono font-semibold tabular-nums">{m.quantity > 0 ? '+' : '−'}{Math.abs(m.quantity)}</td>
                    <td className="ledger-td whitespace-normal text-text-2">{m.note || <span className="text-text-3">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Edit */}
      <Modal
        open={action === 'edit'}
        onClose={closeModal}
        title={t('Məhsulu düzəlt')}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t('Ləğv et')}</Button>
            <Button type="submit" form="product-edit-form" loading={busy}>{t('Saxla')}</Button>
          </>
        }
      >
        <form
          id="product-edit-form"
          className="flex flex-col gap-4 pb-2"
          onSubmit={e => {
            e.preventDefault()
            run(() => updateProduct(p.id, {
              name: name.trim(), code: code.trim(), sell_price: parseFloat(sellPrice) || 0,
              low_stock_threshold: parseInt(threshold) || 0,
            }), t('Dəyişikliklər saxlanıldı.'))
          }}
        >
          <Field label={t('Adı')}><input className="input" value={name} onChange={e => setName(e.target.value)} required /></Field>
          <Field label={t('Kodu')}><input className="input-mono" value={code} onChange={e => setCode(e.target.value)} /></Field>
          <Field label={t('Satış qiyməti (₼)')} hint={t('Yeni sifarişlərə tətbiq olunur. Açıq sifarişlərdəki qiymət dəyişmir.')}>
            <input className="input-mono" type="number" step="0.01" min="0" value={sellPrice} onChange={e => setSellPrice(e.target.value)} required />
          </Field>
          <Field label={t('"Az qalıb" həddi')} hint={t('Stok bu saydan az olanda xəbərdarlıq göstərilir.')}>
            <input className="input-mono" type="number" min="0" value={threshold} onChange={e => setThreshold(e.target.value)} />
          </Field>
          {error && <p className="text-body text-danger-strong bg-danger-subtle rounded px-3 py-2">{error}</p>}
        </form>
      </Modal>

      {/* Write-off */}
      <Modal
        open={action === 'writeoff'}
        onClose={closeModal}
        title={t('Silinmə / itki')}
        subtitle={p.name}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t('Ləğv et')}</Button>
            <Button type="submit" form="product-writeoff-form" variant="danger" loading={busy}>{t('Sil')}</Button>
          </>
        }
      >
        <form
          id="product-writeoff-form"
          className="flex flex-col gap-4 pb-2"
          onSubmit={e => { e.preventDefault(); run(() => writeOffProduct(p.id, parseInt(qty) || 0, note), t('Silinmə qeydə alındı.')) }}
        >
          <p className="text-body text-text-2">{t('Xarab olan, itən və ya servisin öz ehtiyacına işlədilən mal. Maya dəyəri hesabata "Anbar itkisi" kimi düşür.')}</p>
          <Field label={t('Miqdar')}><input className="input-mono" type="number" min="1" max={p.stock_quantity} value={qty} onChange={e => setQty(e.target.value)} required autoFocus /></Field>
          <Field label={t('Səbəb')}><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder={t('Məs. Qutusu sınıb')} /></Field>
          {error && <p className="text-body text-danger-strong bg-danger-subtle rounded px-3 py-2">{error}</p>}
        </form>
      </Modal>

      {/* Count */}
      <Modal
        open={action === 'count'}
        onClose={closeModal}
        title={t('Sayım')}
        subtitle={p.name}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t('Ləğv et')}</Button>
            <Button type="submit" form="product-count-form" loading={busy}>{t('Təsdiqlə')}</Button>
          </>
        }
      >
        <form
          id="product-count-form"
          className="flex flex-col gap-4 pb-2"
          onSubmit={e => { e.preventDefault(); run(() => countProduct(p.id, parseInt(qty), note), t('Sayım nəticəsi qeydə alındı.')) }}
        >
          <p className="text-body text-text-2">{t('Rəfdə real saydığınız miqdarı yazın. Fərq avtomatik "Sayım düzəlişi" kimi qeydə alınır.')}</p>
          <Field label={t('Rəfdəki real say (sistemdə: {qty})', { qty: p.stock_quantity })}>
            <input className="input-mono" type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} required autoFocus />
          </Field>
          <Field label={t('Qeyd')}><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder={t('Məs. Aylıq sayım')} /></Field>
          {error && <p className="text-body text-danger-strong bg-danger-subtle rounded px-3 py-2">{error}</p>}
        </form>
      </Modal>

      {/* Return to supplier */}
      <Modal
        open={action === 'return'}
        onClose={closeModal}
        title={t('Tədarükçüyə qaytar')}
        subtitle={p.name}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t('Ləğv et')}</Button>
            <Button
              variant="danger"
              loading={busy}
              disabled={!returnLine || returnQtyNum < 1 || returnQtyNum > (returnLine?.remaining_quantity ?? 0)}
              onClick={() => returnLine && run(
                () => returnPurchaseLine(returnLine.line_id, returnQtyNum),
                returnLine.on_credit ? t('Qaytarıldı — borc azaldıldı.') : t('Qaytarıldı — pul kassaya qayıtdı.'),
              )}
            >
              {t('Tədarükçüyə qaytar')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          <Field label={t('Hansı alışdan?')}>
            <select className="input" value={returnLineId} onChange={e => { setReturnLineId(e.target.value); setQty('1') }}>
              {returnable.map(pl => (
                <option key={pl.line_id} value={pl.line_id}>
                  {formatDate(pl.date)} · {pl.store_name}{pl.invoice_no ? ` · №${pl.invoice_no}` : ''} · {t('qalıb')} {pl.remaining_quantity} · {pl.on_credit ? t('Nisyə') : t('Nağd')}
                </option>
              ))}
            </select>
          </Field>
          {returnLine && (
            <>
              <Field label={t('Miqdar (maks. {max})', { max: returnLine.remaining_quantity })}>
                <input className="input-mono" type="number" min={1} max={returnLine.remaining_quantity} value={qty} onChange={e => setQty(e.target.value)} autoFocus />
              </Field>
              <div className="rounded bg-surface-2 px-4 py-3 text-body text-text-2 flex flex-col gap-1.5">
                <p className="font-semibold text-ink">{t('Nə olacaq?')}</p>
                <p>{t('Stokdan {qty} {unit} çıxır', { qty: returnQtyNum > 0 ? returnQtyNum : '—', unit: t(p.unit) })}{returnQtyNum > 0 ? ` (${t('təxminən')} ${formatCurrency(returnQtyNum * Number(returnLine.unit_cost))})` : ''}.</p>
                {returnLine.on_credit
                  ? <p>{t('Qaytarılan məbləğ əvvəlcə {store} qarşısındakı borcdan çıxılır (borc azalır). Borc qalmayıbsa, artıq ödənmiş hissə kassaya geri qayıdır.', { store: returnLine.store_name })}</p>
                  : <p>{t('Alış nağd olub — qaytarılan malın pulu kassaya geri qayıdır.')}</p>}
                <p className="text-small text-text-3">{t('Hesabata (mənfəətə) təsir etmir.')}</p>
              </div>
            </>
          )}
          {error && <p className="text-body text-danger-strong bg-danger-subtle rounded px-3 py-2">{error}</p>}
        </div>
      </Modal>

      {/* Merge */}
      <Modal
        open={action === 'merge'}
        onClose={closeModal}
        title={t('Məhsulu birləşdir')}
        subtitle={p.name}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t('Ləğv et')}</Button>
            <Button type="submit" form="product-merge-form" loading={busy} disabled={!mergeTarget}>{t('Birləşdir')}</Button>
          </>
        }
      >
        <form
          id="product-merge-form"
          className="flex flex-col gap-4 pb-2"
          onSubmit={e => {
            e.preventDefault()
            if (!mergeTarget) { setError(t('Siyahıdan məhsul seçin.')); return }
            run(async () => {
              await mergeProduct(p.id, mergeTarget.id)
              navigate(`/business/warehouse/products/${mergeTarget.id}`, { replace: true })
            }, t('Məhsullar birləşdirildi.'))
          }}
        >
          <p className="text-body text-text-2">
            {t('Bu məhsul eyni hissənin təkrarıdırsa, onu əsas məhsula birləşdirin: bütün sifarişlər, alışlar və stok ({qty}) ora köçürülür, bu qeyd silinir.', { qty: p.stock_quantity })}
          </p>
          <Field label={t('Hansı məhsula birləşdirilsin?')}>
            <ComboboxInput value={mergeName} onChange={setMergeName} options={catalog.map(x => x.name)} placeholder={t('Məhsulun adını yazın')} />
            {mergeTarget && <p className="text-small text-text-3 mt-1.5">{t('Stok')}: {mergeTarget.stock_quantity} {t(mergeTarget.unit)} · {t('satış')} {formatCurrency(mergeTarget.sell_price)}{mergeTarget.code ? ` · ${mergeTarget.code}` : ''}</p>}
          </Field>
          {error && <p className="text-body text-danger-strong bg-danger-subtle rounded px-3 py-2">{error}</p>}
        </form>
      </Modal>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-small text-text-3 mt-1.5">{hint}</p>}
    </div>
  )
}
