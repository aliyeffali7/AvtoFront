import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductCard } from '@/types'
import {
  getProductCard, updateProduct, writeOffProduct, countProduct, deleteProduct, getProducts, mergeProduct,
} from '@/services/warehouse.service'
import { Product } from '@/types'
import ComboboxInput from '@/components/ui/ComboboxInput'
import { formatCurrency, formatDate, mapApiError } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import StatusBadge from '@/components/orders/StatusBadge'
import MovementKindBadge from './MovementKindBadge'

type Action = 'none' | 'edit' | 'writeoff' | 'count' | 'merge'

export default function ProductCardPanel({
  productId, onChanged, onClosed, onOpenProduct,
}: { productId: number; onChanged: () => void; onClosed: () => void; onOpenProduct: (id: number) => void }) {
  const [card, setCard] = useState<ProductCard | null>(null)
  const [loading, setLoading] = useState(true)
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getProductCard(productId)
      setCard(res.data)
      const p = res.data.product
      setName(p.name); setCode(p.code || ''); setSellPrice(String(p.sell_price))
      setThreshold(String(p.low_stock_threshold ?? 3))
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => { load() }, [load])

  function openAction(a: Action) {
    if (a === 'merge' && catalog.length === 0) {
      getProducts(undefined, 'all').then(r => setCatalog(r.data.filter(x => x.id !== productId))).catch(() => {})
    }
    setMergeName('')
    setAction(a === action ? 'none' : a)
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
      onChanged()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading && !card) return <Spinner />
  if (!card) return <p className="p-6 text-sm text-danger">{error || 'Məhsul tapılmadı.'}</p>
  const p = card.product
  const t = card.totals

  return (
    <div className="px-5 pb-6 -mt-8">
      <div className="pr-10 mb-4">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {p.code && <span className="font-mono text-xs bg-surface-alt text-ink-muted px-1.5 py-0.5 rounded">{p.code}</span>}
          <Badge variant="neutral">{p.unit}</Badge>
          {p.is_warehouse === false ? <Badge variant="neutral">Sifarişlik</Badge> : <Badge variant="accent">Anbar məhsulu</Badge>}
          {p.is_archived && <Badge variant="danger">Arxivdə</Badge>}
        </div>
        <h2 className="font-serif font-semibold text-xl text-ink">{p.name}</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Stat label="Stok" value={`${p.stock_quantity} ${p.unit}`} />
        <Stat label="Anbar dəyəri (FIFO)" value={formatCurrency(t.stock_value)} />
        <Stat label="Satış qiyməti" value={formatCurrency(p.sell_price)} accent />
        <Stat label="Qazanc (satılanlardan)" value={formatCurrency(t.profit)} accent={t.profit >= 0} danger={t.profit < 0} />
      </div>

      {notice && <p className="text-sm text-success bg-success-bg rounded px-3 py-2 mb-3">{notice}</p>}
      {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2 mb-3">{error}</p>}

      <div className="flex flex-wrap gap-2 mb-3">
        <Button variant="secondary" className="min-h-0 py-2 text-sm" onClick={() => openAction('edit')}>Düzəliş</Button>
        {p.stock_quantity > 0 && (
          <Button variant="secondary" className="min-h-0 py-2 text-sm" onClick={() => openAction('writeoff')}>Silinmə / itki</Button>
        )}
        <Button variant="secondary" className="min-h-0 py-2 text-sm" onClick={() => openAction('count')}>Sayım</Button>
        <Button variant="secondary" className="min-h-0 py-2 text-sm" onClick={() => openAction('merge')}>Birləşdir</Button>
        {p.is_archived ? (
          <Button variant="secondary" className="min-h-0 py-2 text-sm" disabled={busy}
            onClick={() => run(() => updateProduct(p.id, { is_archived: false }), 'Məhsul arxivdən çıxarıldı.')}>
            Arxivdən çıxar
          </Button>
        ) : p.stock_quantity === 0 && (
          <Button variant="secondary" className="min-h-0 py-2 text-sm" disabled={busy}
            onClick={() => run(async () => {
              const res = await deleteProduct(p.id)
              if (res.data.result === 'deleted') onClosed()
            }, 'Məhsul arxivə göndərildi. Tarixçəsi saxlanılır.')}>
            Arxivə göndər
          </Button>
        )}
      </div>

      {action === 'edit' && (
        <form
          className="card p-4 mb-4 flex flex-col gap-3"
          onSubmit={e => {
            e.preventDefault()
            run(() => updateProduct(p.id, {
              name: name.trim(), code: code.trim(), sell_price: parseFloat(sellPrice) || 0,
              low_stock_threshold: parseInt(threshold) || 0,
            }), 'Dəyişikliklər saxlanıldı.')
          }}
        >
          <Field label="Adı"><input className="input" value={name} onChange={e => setName(e.target.value)} required /></Field>
          <Field label="Kodu"><input className="input-mono" value={code} onChange={e => setCode(e.target.value)} /></Field>
          <Field label="Satış qiyməti (₼)" hint="Yeni sifarişlərə tətbiq olunur. Açıq sifarişlərdəki qiymət dəyişmir.">
            <input className="input-mono" type="number" step="0.01" min="0" value={sellPrice} onChange={e => setSellPrice(e.target.value)} required />
          </Field>
          <Field label='"Az qalıb" həddi' hint="Stok bu saydan az olanda xəbərdarlıq göstərilir.">
            <input className="input-mono" type="number" min="0" value={threshold} onChange={e => setThreshold(e.target.value)} />
          </Field>
          <div className="flex gap-2"><Button type="submit" loading={busy}>Saxla</Button><Button type="button" variant="secondary" onClick={() => setAction('none')}>Ləğv et</Button></div>
        </form>
      )}

      {action === 'writeoff' && (
        <form
          className="card p-4 mb-4 flex flex-col gap-3"
          onSubmit={e => { e.preventDefault(); run(() => writeOffProduct(p.id, parseInt(qty) || 0, note), 'Silinmə qeydə alındı.') }}
        >
          <p className="text-sm text-ink-soft">Xarab olan, itən və ya servisin öz ehtiyacına işlədilən mal. Maya dəyəri hesabata "Anbar itkisi" kimi düşür.</p>
          <Field label="Miqdar"><input className="input-mono" type="number" min="1" max={p.stock_quantity} value={qty} onChange={e => setQty(e.target.value)} required autoFocus /></Field>
          <Field label="Səbəb"><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Məs. Qutusu sınıb" /></Field>
          <div className="flex gap-2"><Button type="submit" variant="danger" loading={busy}>Sil</Button><Button type="button" variant="secondary" onClick={() => setAction('none')}>Ləğv et</Button></div>
        </form>
      )}

      {action === 'count' && (
        <form
          className="card p-4 mb-4 flex flex-col gap-3"
          onSubmit={e => { e.preventDefault(); run(() => countProduct(p.id, parseInt(qty), note), 'Sayım nəticəsi qeydə alındı.') }}
        >
          <p className="text-sm text-ink-soft">Rəfdə real saydığınız miqdarı yazın. Fərq avtomatik "Sayım düzəlişi" kimi qeydə alınır.</p>
          <Field label={`Rəfdəki real say (sistemdə: ${p.stock_quantity})`}>
            <input className="input-mono" type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} required autoFocus />
          </Field>
          <Field label="Qeyd"><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Məs. Aylıq sayım" /></Field>
          <div className="flex gap-2"><Button type="submit" loading={busy}>Təsdiqlə</Button><Button type="button" variant="secondary" onClick={() => setAction('none')}>Ləğv et</Button></div>
        </form>
      )}

      {action === 'merge' && (() => {
        const target = catalog.find(x => x.name === mergeName)
        return (
          <form
            className="card p-4 mb-4 flex flex-col gap-3"
            onSubmit={e => {
              e.preventDefault()
              if (!target) { setError('Siyahıdan məhsul seçin.'); return }
              run(async () => {
                await mergeProduct(p.id, target.id)
                onOpenProduct(target.id)
              }, 'Məhsullar birləşdirildi.')
            }}
          >
            <p className="text-sm text-ink-soft">
              Bu məhsul eyni hissənin təkrarıdırsa, onu əsas məhsula birləşdirin: bütün sifarişlər, alışlar və stok ({p.stock_quantity}) ora köçürülür, bu qeyd silinir.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="label">Hansı məhsula birləşdirilsin?</label>
              <ComboboxInput value={mergeName} onChange={setMergeName} options={catalog.map(x => x.name)} placeholder="Məhsulun adını yazın" />
              {target && <p className="text-xs text-ink-muted">Stok: {target.stock_quantity} {target.unit} · satış {formatCurrency(target.sell_price)}{target.code ? ` · ${target.code}` : ''}</p>}
            </div>
            <div className="flex gap-2"><Button type="submit" loading={busy} disabled={!target}>Birləşdir</Button><Button type="button" variant="secondary" onClick={() => setAction('none')}>Ləğv et</Button></div>
          </form>
        )
      })()}

      {card.batches.length > 0 && (
        <Section title="Qalan partiyalar (FIFO — əvvəl köhnə satılır)">
          {card.batches.map(b => (
            <Row key={b.id} left={`${formatDate(b.date)}${b.store_name ? ' · ' + b.store_name : ''}`} right={`${b.remaining_quantity} × ${formatCurrency(b.purchase_price)}`} />
          ))}
        </Section>
      )}

      <Section title={`Kimdən alınıb (${card.purchases.length})`}>
        {card.purchases.length === 0 ? <Empty text="Alış qeydi yoxdur." /> : card.purchases.map(pl => (
          <Link key={pl.line_id} to={`/business/warehouse/purchases/${pl.purchase_id}`} className="flex items-center justify-between gap-3 py-1.5 text-sm hover:text-accent">
            <span className="min-w-0 truncate">{formatDate(pl.date)} · <span className="font-medium">{pl.store_name}</span> <Badge variant={pl.on_credit ? 'warning' : 'success'}>{pl.on_credit ? 'Nisyə' : 'Nağd'}</Badge></span>
            <span className="font-mono shrink-0">{pl.quantity - pl.returned_quantity} × {formatCurrency(pl.unit_cost)}</span>
          </Link>
        ))}
      </Section>

      <Section title={`Kimə satılıb (${card.sales.length})`}>
        {card.sales.length === 0 ? <Empty text="Heç bir sifarişdə istifadə olunmayıb." /> : card.sales.map(s => (
          <Link key={`${s.order_id}`} to={`/business/orders/${s.order_id}`} className="flex items-center justify-between gap-3 py-1.5 text-sm hover:text-accent">
            <span className="min-w-0 truncate">
              <span className="font-mono">#{s.order_number}</span> · {s.customer_name || s.plate || '—'} <StatusBadge status={s.status} />
            </span>
            <span className="font-mono shrink-0 text-right">
              {s.quantity} × {formatCurrency(s.sell_price)}
              <span className={`block text-xs ${s.profit >= 0 ? 'text-success' : 'text-danger'}`}>qazanc {formatCurrency(s.profit)}</span>
            </span>
          </Link>
        ))}
      </Section>

      <Section title="Son hərəkətlər">
        {card.movements.length === 0 ? <Empty text="Hərəkət yoxdur." /> : card.movements.slice(0, 15).map(m => (
          <div key={m.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span className="min-w-0 truncate">{formatDate(m.date)} · <MovementKindBadge kind={m.kind} label={m.kind_label} />{m.note ? <span className="text-ink-muted"> · {m.note}</span> : null}</span>
            <span className={`font-mono shrink-0 font-semibold ${m.quantity > 0 ? 'text-success' : 'text-danger'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</span>
          </div>
        ))}
        {card.movements.length > 15 && (
          <Link to={`/business/warehouse/movements?product=${p.id}`} className="text-xs font-semibold text-accent hover:underline">Bütün hərəkətlər →</Link>
        )}
      </Section>
    </div>
  )
}

function Stat({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  return (
    <div className="bg-surface border border-rule rounded px-3 py-2.5">
      <p className="section-label mb-1">{label}</p>
      <p className={`font-mono font-semibold text-sm ${danger ? 'text-danger' : accent ? 'text-accent' : 'text-ink'}`}>{value}</p>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="section-label mb-1.5">{title}</p>
      <div className="bg-surface border border-rule rounded px-3 py-1.5 divide-y divide-rule/60">{children}</div>
    </div>
  )
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-ink-muted font-mono text-xs truncate">{left}</span>
      <span className="font-mono text-ink shrink-0">{right}</span>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-ink-muted py-2">{text}</p>
}
