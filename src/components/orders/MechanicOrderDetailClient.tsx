import { useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { Play, CheckCircle2, Plus, Minus, X, PartyPopper } from 'lucide-react'
import { Order, Product } from '@/types'
import { getOrder, changeOrderStatus, addProductToOrder } from '@/services/orders.service'
import { getProducts } from '@/services/warehouse.service'
import { formatDate, formatCurrency, mapApiError } from '@/lib/utils'
import StatusBadge from './StatusBadge'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import Plate from '@/components/ui/Plate'
import BrandLogo from '@/components/ui/BrandLogo'
import MechanicHeader from '@/components/layout/MechanicHeader'

function BottomSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(9,9,9,.4)]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        className="bg-surface w-full max-w-xl rounded-t-lg shadow-lg border border-border max-h-[90vh] overflow-y-auto p-4 pb-6 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-h3 text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Bağla" className="w-11 h-11 -mr-2 flex items-center justify-center rounded text-text-3 hover:bg-surface-2">
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function MechanicOrderDetailClient({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [changingStatus, setChangingStatus] = useState(false)
  const [confirmDone, setConfirmDone] = useState(false)

  const [addFormOpen, setAddFormOpen] = useState(false)
  const [warehouseProducts, setWarehouseProducts] = useState<Product[]>([])
  const warehouseLoadedRef = useRef(false)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [qty, setQty] = useState('1')
  const [addingProduct, setAddingProduct] = useState(false)
  const [productError, setProductError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getOrder(parseInt(id))
      setOrder(res.data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (addFormOpen && !warehouseLoadedRef.current) {
      warehouseLoadedRef.current = true
      getProducts().then(r => setWarehouseProducts(r.data)).catch(() => {})
    }
  }, [addFormOpen])

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    setProductError('')
    setAddingProduct(true)
    try {
      await addProductToOrder(parseInt(id), parseInt(selectedProduct), parseInt(qty))
      setSelectedProduct('')
      setQty('1')
      setAddFormOpen(false)
      load()
    } catch (err) {
      setProductError(mapApiError(err))
    } finally {
      setAddingProduct(false)
    }
  }

  async function handleStatus(status: 'in_progress' | 'done') {
    setChangingStatus(true)
    try {
      await changeOrderStatus(parseInt(id), status)
      setConfirmDone(false)
      load()
    } finally {
      setChangingStatus(false)
    }
  }

  if (loading && !order) {
    return (
      <div>
        <MechanicHeader title="Sifariş" back />
        <div className="py-16 flex justify-center"><Spinner /></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div>
        <MechanicHeader title="Sifariş" back />
        <p className="p-8 text-center text-text-3">Sifariş tapılmadı.</p>
      </div>
    )
  }

  const products = order.products ?? []
  const qtyNum = Math.max(1, parseInt(qty) || 1)
  const stockProduct = warehouseProducts.find(p => String(p.id) === selectedProduct)

  return (
    <div>
      <MechanicHeader
        title={`Sifariş №${order.number ?? order.id}`}
        subtitle={`${formatDate(order.created_at)} · ${order.estimated_days} gün`}
        back
      />

      <div className="p-4 flex flex-col gap-3">
        {/* Status + car */}
        <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Plate value={order.plate_number} size={17} />
            <StatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded bg-surface-2 border border-border flex items-center justify-center shrink-0">
              <BrandLogo brand={order.car_brand} className="w-7 h-7" />
            </span>
            <p className="font-display text-h3 text-ink">{order.car_brand} {order.car_model}</p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-4">
          <p className="font-sans text-label uppercase text-text-3 mb-2">Tapşırıq</p>
          <p className="text-body-l text-text-1 whitespace-pre-line">{order.description}</p>
        </div>

        {order.notes && (
          <div className="bg-warning-subtle border border-warning/30 rounded-lg p-4">
            <p className="font-sans text-label uppercase text-warning-strong mb-2">Qeydlər</p>
            <p className="text-body-l text-warning-strong whitespace-pre-line">{order.notes}</p>
          </div>
        )}

        {order.status === 'done' && (
          <div className="flex items-center gap-3 bg-success-subtle border border-success/30 rounded-lg p-4">
            <PartyPopper size={28} strokeWidth={1.75} className="text-success shrink-0" />
            <div>
              <p className="text-body-l font-semibold text-success-strong">Bu sifariş tamamlandı</p>
              <p className="text-body text-success-strong">Uğurlu iş!</p>
            </div>
          </div>
        )}

        {/* Products */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
            <p className="font-display text-h3 text-ink">İstifadə edilən məhsullar</p>
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => setAddFormOpen(true)}>Əlavə et</Button>
          </div>
          {products.length === 0 ? (
            <p className="px-4 py-8 text-center text-body text-text-3">Hələ məhsul əlavə edilməyib.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {products.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-body-l font-medium text-text-1">{p.product_name}</p>
                    <p className="font-mono text-small text-text-3">{p.quantity} ədəd</p>
                  </div>
                  <span className="font-mono font-semibold tabular-nums text-text-1 shrink-0">{formatCurrency(p.sell_price * p.quantity)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky main action */}
      {order.status !== 'done' && (
        <>
          <div className="h-20" />
          <div className="fixed bottom-[68px] left-0 right-0 z-30 bg-surface border-t border-border p-3">
            <div className="max-w-xl mx-auto">
              {order.status === 'pending' && (
                <Button size="lg" icon={Play} loading={changingStatus} onClick={() => handleStatus('in_progress')} className="w-full">
                  {changingStatus ? 'Yüklənir...' : 'İşə başla'}
                </Button>
              )}
              {order.status === 'in_progress' && (
                <Button size="lg" icon={CheckCircle2} onClick={() => setConfirmDone(true)} className="w-full">
                  Tamamlandı kimi işarələ
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Confirm completion */}
      <BottomSheet open={confirmDone} title="Sifariş tamamlansın?" onClose={() => setConfirmDone(false)}>
        <p className="text-body-l text-text-2">
          {order.car_brand} {order.car_model} · {order.plate_number} sifarişi tamamlandı kimi işarələnəcək.
        </p>
        <div className="flex flex-col gap-2">
          <Button size="lg" icon={CheckCircle2} loading={changingStatus} onClick={() => handleStatus('done')} className="w-full">
            Tamamlandı kimi işarələ
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setConfirmDone(false)} className="w-full">Ləğv et</Button>
        </div>
      </BottomSheet>

      {/* Add product from stock */}
      <BottomSheet open={addFormOpen} title="Məhsul əlavə et" onClose={() => { setAddFormOpen(false); setProductError('') }}>
        <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
          <div>
            <label className="label">Məhsul</label>
            <select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              required
              className="input !h-12 text-body-l"
            >
              <option value="">Seçin...</option>
              {warehouseProducts.map(p => (
                <option key={p.id} value={p.id} disabled={p.stock_quantity === 0}>{p.name} ({p.stock_quantity > 0 ? `${p.stock_quantity} ${p.unit}` : 'stokda yoxdur'})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Miqdar</label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="lg" aria-label="Azalt" onClick={() => setQty(String(Math.max(1, qtyNum - 1)))} className="!px-0 w-[52px] shrink-0">
                <Minus size={20} strokeWidth={2} />
              </Button>
              <input
                value={qty}
                onChange={e => setQty(e.target.value)}
                type="number"
                min="1"
                max={stockProduct?.stock_quantity}
                required
                inputMode="numeric"
                className="input-mono !h-[52px] text-center text-money"
              />
              <Button type="button" variant="secondary" size="lg" aria-label="Artır" onClick={() => setQty(String(qtyNum + 1))} className="!px-0 w-[52px] shrink-0">
                <Plus size={20} strokeWidth={2} />
              </Button>
            </div>
          </div>
          {productError && <p className="text-small text-danger-strong bg-danger-subtle rounded px-3 py-2">{productError}</p>}
          <div className="flex flex-col gap-2">
            <Button type="submit" size="lg" loading={addingProduct} className="w-full">
              {addingProduct ? 'Əlavə edilir...' : 'Əlavə et'}
            </Button>
            <Button type="button" size="lg" variant="secondary" onClick={() => { setAddFormOpen(false); setProductError('') }} className="w-full">Ləğv et</Button>
          </div>
        </form>
      </BottomSheet>
    </div>
  )
}
