import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Order, Mechanic, Product } from '@/types'
import { getOrder, assignMechanic, changeOrderStatus, addProductToOrder, recordPayment } from '@/services/orders.service'
import { getMechanics } from '@/services/mechanics.service'
import { getProducts } from '@/services/warehouse.service'
import { formatDate, formatCurrency, mapApiError } from '@/lib/utils'
import StatusBadge from './StatusBadge'

export default function OrderDetailClient({ id }: { id: string }) {
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [mechanicsLoaded, setMechanicsLoaded] = useState(false)
  const [selectedMechanic, setSelectedMechanic] = useState('')
  const [assigningMechanic, setAssigningMechanic] = useState(false)

  const [changingStatus, setChangingStatus] = useState(false)

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentTotal, setPaymentTotal] = useState(0)
  const [paidInput, setPaidInput] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')

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
      setSelectedMechanic(String(res.data.mechanic ?? ''))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function ensureMechanics() {
    if (mechanicsLoaded) return
    setMechanicsLoaded(true)
    try {
      const res = await getMechanics()
      setMechanics(res.data)
    } catch {}
  }

  useEffect(() => {
    if (addFormOpen && !warehouseLoadedRef.current) {
      warehouseLoadedRef.current = true
      getProducts().then(r => setWarehouseProducts(r.data)).catch(() => {})
    }
  }, [addFormOpen])

  async function handleAssign() {
    if (!selectedMechanic) return
    setAssigningMechanic(true)
    try {
      await assignMechanic(parseInt(id), parseInt(selectedMechanic))
      load()
    } finally {
      setAssigningMechanic(false)
    }
  }

  async function handleStatus(newStatus: 'pending' | 'in_progress' | 'done') {
    if (newStatus === 'done' && order) {
      const svcTotal = order.services?.reduce((s, t) => s + parseFloat(String(t.price)), 0) ?? 0
      const prdTotal = (order.products ?? []).reduce((s, p) => s + p.sell_price * p.quantity, 0)
      const total = svcTotal + prdTotal
      setChangingStatus(true)
      try {
        await changeOrderStatus(parseInt(id), 'done')
        await load()
        setPaymentTotal(total)
        setPaidInput(total.toFixed(2))
        setPaymentError('')
        setPaymentDialogOpen(true)
      } finally {
        setChangingStatus(false)
      }
      return
    }
    setChangingStatus(true)
    try {
      await changeOrderStatus(parseInt(id), newStatus)
      load()
    } finally {
      setChangingStatus(false)
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    setPaymentError('')
    setRecordingPayment(true)
    try {
      await recordPayment(parseInt(id), parseFloat(paidInput) || 0)
      setPaymentDialogOpen(false)
      load()
    } catch {
      setPaymentError('Xəta baş verdi. Yenidən cəhd edin.')
    } finally {
      setRecordingPayment(false)
    }
  }

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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) {
    return <div className="p-8"><p className="text-red-600">Sifariş tapılmadı.</p></div>
  }

  const statusOptions: Array<{ value: 'pending' | 'in_progress' | 'done'; label: string }> = [
    { value: 'pending', label: 'Gözləyir' },
    { value: 'in_progress', label: 'İcrada' },
    { value: 'done', label: 'Tamamlandı' },
  ]

  const servicesTotal = order.services?.reduce((s, t) => s + parseFloat(String(t.price)), 0) ?? 0
  const orderProducts = order.products ?? []
  const productsTotal = orderProducts.reduce((s, p) => s + p.sell_price * p.quantity, 0)
  const grandTotal = servicesTotal + productsTotal
  const debt = grandTotal - Number(order.paid_amount ?? 0)

  const paymentBadge = {
    unpaid:  { label: 'Ödənilməyib', cls: 'bg-red-100 text-red-700' },
    partial: { label: `Borc: ${formatCurrency(debt)}`, cls: 'bg-amber-100 text-amber-700' },
    paid:    { label: 'Ödənilib', cls: 'bg-green-100 text-green-700' },
  }[order.payment_status ?? 'unpaid']

  return (
    <>
    <div className="p-6 lg:p-8">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Geri
      </button>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">

        {/* LEFT — main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Header card */}
          <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900 font-mono tracking-wider">{order.plate_number}</h1>
                  <StatusBadge status={order.status} />
                  {order.status === 'done' && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${paymentBadge.cls}`}>
                      {paymentBadge.label}
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{order.car_brand} {order.car_model}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(order.created_at)} · {order.estimated_days} gün</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Tapşırıq</p>
              <p className="text-sm text-gray-700 leading-relaxed">{order.description}</p>
            </div>
          </div>

          {/* Services & Customer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">İşlər və qiymətlər</p>
              {!order.services || order.services.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">İş qeyd edilməyib.</p>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100">
                  {order.services.map((svc, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 gap-3">
                      <span className="text-sm text-gray-700">{svc.name}</span>
                      <span className="text-sm font-semibold text-gray-900 shrink-0">{formatCurrency(parseFloat(String(svc.price)))}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-3 pb-1">
                    <span className="text-sm font-semibold text-gray-500">Cəmi</span>
                    <span className="text-base font-bold text-blue-600">{formatCurrency(servicesTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Müştəri</p>
              {!order.customer_name && !order.customer_surname && !order.customer_phone ? (
                <p className="text-sm text-gray-400 py-2">Müştəri məlumatı yoxdur.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {(order.customer_name || order.customer_surname) && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {[order.customer_name, order.customer_surname].filter(Boolean).join(' ')}
                      </span>
                    </div>
                  )}
                  {order.customer_phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <a href={`tel:${order.customer_phone}`} className="text-sm font-medium text-blue-600 hover:underline">
                        {order.customer_phone}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex gap-3">
              <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Əlavə qeydlər</p>
                <p className="text-sm text-amber-800 leading-relaxed">{order.notes}</p>
              </div>
            </div>
          )}

          {/* Payment action — shown when done but not fully paid */}
          {order.status === 'done' && order.payment_status !== 'paid' && (
            <div className={`rounded-2xl border px-5 py-5 flex items-center justify-between gap-4 ${
              order.payment_status === 'partial' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
            }`}>
              <div>
                <p className={`text-sm font-semibold ${order.payment_status === 'partial' ? 'text-amber-800' : 'text-red-800'}`}>
                  {order.payment_status === 'partial'
                    ? `Borc: ${formatCurrency(debt)}`
                    : 'Ödəniş qeyd edilməyib'}
                </p>
                <p className={`text-xs mt-0.5 ${order.payment_status === 'partial' ? 'text-amber-600' : 'text-red-600'}`}>
                  Ümumi: {formatCurrency(grandTotal)}
                  {order.payment_status === 'partial' && ` · Ödənilən: ${formatCurrency(Number(order.paid_amount))}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setPaymentTotal(grandTotal)
                  setPaidInput(grandTotal.toFixed(2))
                  setPaymentError('')
                  setPaymentDialogOpen(true)
                }}
                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl min-h-[44px] transition-colors"
              >
                Ödəniş qeyd et
              </button>
            </div>
          )}

          {order.status === 'done' && order.payment_status === 'paid' && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-green-800">Tam ödənilib</p>
                <p className="text-xs text-green-600 mt-0.5">{formatCurrency(Number(order.paid_amount))}</p>
              </div>
            </div>
          )}

          {/* Assign mechanic & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Usta təyin et</p>
              <select
                value={selectedMechanic}
                onChange={e => setSelectedMechanic(e.target.value)}
                onFocus={ensureMechanics}
                className="input mb-3"
              >
                <option value="">Seçilməyib</option>
                {mechanics.filter(m => m.is_active).map(m => (
                  <option key={m.id} value={m.id}>{m.full_name ?? m.phone}</option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={assigningMechanic || !selectedMechanic}
                className="btn-primary w-full text-sm"
              >
                {assigningMechanic ? 'Saxlanılır...' : 'Təyin et'}
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Status dəyiş</p>
              <div className="flex flex-col gap-2">
                {statusOptions.map(s => (
                  <button
                    key={s.value}
                    onClick={() => handleStatus(s.value)}
                    disabled={changingStatus || order.status === s.value}
                    className={`py-2.5 px-4 rounded-xl text-sm font-medium border transition-colors text-left min-h-[44px] ${
                      order.status === s.value
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {s.label}
                    {order.status === s.value && <span className="ml-2 text-blue-400">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT — products panel */}
        <div className="w-80 shrink-0 sticky top-6">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Panel header */}
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

            {/* Inline add form */}
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

            {/* Products list */}
            {orderProducts.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">Hələ məhsul əlavə edilməyib.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {orderProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.product_name}</p>
                      <p className="text-xs text-gray-400">{p.quantity} ədəd</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 shrink-0">
                      {formatCurrency(p.sell_price * p.quantity)}
                    </span>
                  </div>
                ))}
                {/* Total */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cəmi</span>
                  <span className="text-sm font-bold text-blue-600">
                    {formatCurrency(orderProducts.reduce((s, p) => s + p.sell_price * p.quantity, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>

    {/* Payment dialog */}
    {paymentDialogOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Ödəniş qeydi</h2>
            <p className="text-sm text-gray-500 mt-0.5">Sifariş tamamlandı. Ödəniş vəziyyətini qeyd edin.</p>
          </div>

          <form onSubmit={handleRecordPayment} className="px-6 py-5 flex flex-col gap-4">
            {/* Total */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">Ümumi məbləğ</span>
              <span className="text-base font-bold text-gray-900">{formatCurrency(paymentTotal)}</span>
            </div>

            {/* Paid input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Ödənilən məbləğ</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={paymentTotal}
                  step="0.01"
                  value={paidInput}
                  onChange={e => setPaidInput(e.target.value)}
                  className="input pr-8 text-lg font-semibold"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">₼</span>
              </div>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setPaidInput('0')} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Borc</button>
                <button type="button" onClick={() => setPaidInput((paymentTotal / 2).toFixed(2))} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Yarısı</button>
                <button type="button" onClick={() => setPaidInput(paymentTotal.toFixed(2))} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Tam</button>
              </div>
            </div>

            {/* Debt preview */}
            {parseFloat(paidInput) < paymentTotal && parseFloat(paidInput) >= 0 && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <span className="text-sm text-amber-700 font-medium">Borc qalır</span>
                <span className="text-base font-bold text-amber-700">
                  {formatCurrency(paymentTotal - (parseFloat(paidInput) || 0))}
                </span>
              </div>
            )}

            {parseFloat(paidInput) >= paymentTotal && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-green-700 font-medium">Tam ödənilib</span>
              </div>
            )}

            {paymentError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{paymentError}</p>}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={recordingPayment} className="btn-primary flex-1">
                {recordingPayment ? 'Saxlanılır...' : 'Qeyd et'}
              </button>
              <button type="button" onClick={() => setPaymentDialogOpen(false)} className="btn-ghost px-4">
                Sonra
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}
