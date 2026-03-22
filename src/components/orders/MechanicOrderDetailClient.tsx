import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Order, Product } from '@/types'
import { getOrder, changeOrderStatus, addProductToOrder } from '@/services/orders.service'
import { getProducts } from '@/services/warehouse.service'
import { formatDate, formatCurrency, mapApiError } from '@/lib/utils'
import StatusBadge from './StatusBadge'

export default function MechanicOrderDetailClient({ id }: { id: string }) {
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [changingStatus, setChangingStatus] = useState(false)

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
      load()
    } finally {
      setChangingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Sifariş tapılmadı.</p>
      </div>
    )
  }

  const products = order.products ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Sifariş</p>
          <h1 className="text-lg font-bold text-gray-900 font-mono tracking-wider leading-tight">{order.plate_number}</h1>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="px-4 py-4 pb-28 max-w-lg mx-auto flex flex-col gap-3">

        {/* Car & task info */}
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
          <p className="text-base font-semibold text-gray-800 mb-0.5">{order.car_brand} {order.car_model}</p>
          <p className="text-xs text-gray-400 mb-4">{formatDate(order.created_at)} · {order.estimated_days} gün</p>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tapşırıq</p>
            <p className="text-sm text-gray-700 leading-relaxed">{order.description}</p>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Qeydlər</p>
              <p className="text-sm text-amber-800 leading-relaxed">{order.notes}</p>
            </div>
          </div>
        )}

        {/* Status action */}
        {order.status !== 'done' && (
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Status</p>
            {order.status === 'pending' && (
              <button
                onClick={() => handleStatus('in_progress')}
                disabled={changingStatus}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 text-base min-h-[52px] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                {changingStatus ? 'Yüklənir...' : 'İşə başla'}
              </button>
            )}
            {order.status === 'in_progress' && (
              <button
                onClick={() => handleStatus('done')}
                disabled={changingStatus}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 text-base min-h-[52px] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {changingStatus ? 'Yüklənir...' : 'Tamamlandı kimi işarələ'}
              </button>
            )}
          </div>
        )}

        {order.status === 'done' && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">Bu sifariş tamamlandı</p>
              <p className="text-xs text-green-600 mt-0.5">Uğurlu iş!</p>
            </div>
          </div>
        )}

        {/* Products */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">İstifadə edilən məhsullar</p>
            <button
              onClick={() => setAddFormOpen(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Əlavə et
            </button>
          </div>

          {addFormOpen && (
            <form onSubmit={handleAddProduct} className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Məhsul</label>
                <select
                  value={selectedProduct}
                  onChange={e => setSelectedProduct(e.target.value)}
                  required
                  className="input text-sm"
                >
                  <option value="">Seçin...</option>
                  {warehouseProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.stock_quantity} ədəd)</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Miqdar</label>
                <input
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  type="number"
                  min="1"
                  required
                  className="input text-sm"
                />
              </div>
              {productError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{productError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={addingProduct} className="btn-primary flex-1 text-sm py-2">
                  {addingProduct ? 'Əlavə edilir...' : 'Əlavə et'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddFormOpen(false); setProductError('') }}
                  className="btn-ghost text-sm py-2 px-3"
                >
                  Ləğv et
                </button>
              </div>
            </form>
          )}

          {products.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-400">Hələ məhsul əlavə edilməyib.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {products.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.product_name}</p>
                    <p className="text-xs text-gray-400">{p.quantity} ədəd</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">{formatCurrency(p.sell_price * p.quantity)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
