import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Order, Mechanic, OrderService, Product } from '@/types'
import { getOrders, createOrder } from '@/services/orders.service'
import { getMechanics } from '@/services/mechanics.service'
import { getProducts } from '@/services/warehouse.service'
import { formatDate, formatCurrency, mapApiError } from '@/lib/utils'
import StatusBadge from './StatusBadge'

function CreateOrderDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [warehouseItems, setWarehouseItems] = useState<Product[]>([])
  const [plate, setPlate] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [description, setDescription] = useState('')
  const [days, setDays] = useState('')
  const [mechanic, setMechanic] = useState('')
  const [services, setServices] = useState<{ name: string; price: string }[]>([{ name: '', price: '' }])
  const [orderProducts, setOrderProducts] = useState<{ productId: string; qty: string }[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const loadedRef = useRef(false)

  useEffect(() => {
    if (open && !loadedRef.current) {
      loadedRef.current = true
      getMechanics().then(r => setMechanics(r.data)).catch(() => {})
      getProducts().then(r => setWarehouseItems(r.data)).catch(() => {})
    }
  }, [open])

  function reset() {
    setPlate(''); setBrand(''); setModel(''); setDescription(''); setDays(''); setMechanic('')
    setServices([{ name: '', price: '' }])
    setOrderProducts([])
    setCustomerName(''); setCustomerSurname(''); setCustomerPhone(''); setNotes(''); setError('')
  }

  function addProduct() {
    setOrderProducts(prev => [...prev, { productId: '', qty: '1' }])
  }

  function removeProduct(i: number) {
    setOrderProducts(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateProduct(i: number, field: 'productId' | 'qty', value: string) {
    setOrderProducts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  function addService() {
    setServices(prev => [...prev, { name: '', price: '' }])
  }

  function removeService(i: number) {
    setServices(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateService(i: number, field: 'name' | 'price', value: string) {
    setServices(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const filledServices: OrderService[] = services
      .filter(t => t.name.trim())
      .map(t => ({ name: t.name.trim(), price: t.price || '0' }))
    const filledProducts = orderProducts
      .filter(p => p.productId)
      .map(p => ({ product: parseInt(p.productId), quantity: parseInt(p.qty) || 1 }))
    try {
      await createOrder({
        plate_number: plate,
        car_brand: brand,
        car_model: model,
        description,
        estimated_days: parseInt(days),
        mechanic: mechanic ? parseInt(mechanic) : null,
        services: filledServices,
        products: filledProducts,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        notes: notes || undefined,
      })
      reset()
      onCreated()
      onClose()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Yeni sifariş</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 px-6 py-6 overflow-y-auto">

          {/* Car info */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Avtomobil</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Dövlət nişanı</label>
                <input value={plate} onChange={e => setPlate(e.target.value)} required autoFocus placeholder="10-AA-001" className="input font-mono tracking-wider" />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">Marka</label>
                  <input value={brand} onChange={e => setBrand(e.target.value)} required placeholder="Toyota" className="input" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">Model</label>
                  <input value={model} onChange={e => setModel(e.target.value)} required placeholder="Camry" className="input" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Tapşırıq</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={2} placeholder="Görüləcək iş haqqında məlumat..." className="input resize-none" />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">Müddət (gün)</label>
                  <input value={days} onChange={e => setDays(e.target.value)} required type="number" min="1" placeholder="3" className="input" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">Usta</label>
                  <select value={mechanic} onChange={e => setMechanic(e.target.value)} className="input">
                    <option value="">Seçilməyib</option>
                    {mechanics.filter(m => m.is_active).map(m => (
                      <option key={m.id} value={m.id}>{m.full_name ?? m.phone}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Services */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">İşlər və qiymətlər</p>
              <button type="button" onClick={addService} className="text-xs text-blue-600 font-medium hover:text-blue-800">
                + İş əlavə et
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {services.map((svc, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={svc.name}
                    onChange={e => updateService(i, 'name', e.target.value)}
                    placeholder={`İş ${i + 1} (məs. Yağ dəyişimi)`}
                    className="input flex-1 text-sm"
                  />
                  <div className="relative shrink-0 w-28">
                    <input
                      value={svc.price}
                      onChange={e => updateService(i, 'price', e.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="input text-sm pr-6"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₼</span>
                  </div>
                  {services.length > 1 && (
                    <button type="button" onClick={() => removeService(i)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {services.some(t => t.name && t.price) && (
              <div className="mt-2 flex justify-end">
                <span className="text-sm font-semibold text-gray-700">
                  Cəmi: {formatCurrency(services.reduce((s, t) => s + (parseFloat(t.price) || 0), 0))}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Məhsullar</p>
              <button type="button" onClick={addProduct} className="text-xs text-blue-600 font-medium hover:text-blue-800">
                + Məhsul əlavə et
              </button>
            </div>
            {orderProducts.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Məhsul seçilməyib</p>
            ) : (
              <div className="flex flex-col gap-2">
                {orderProducts.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      value={p.productId}
                      onChange={e => updateProduct(i, 'productId', e.target.value)}
                      className="input flex-1 text-sm"
                    >
                      <option value="">Seçin...</option>
                      {warehouseItems.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.stock_quantity} ədəd)</option>
                      ))}
                    </select>
                    <input
                      value={p.qty}
                      onChange={e => updateProduct(i, 'qty', e.target.value)}
                      type="number"
                      min="1"
                      placeholder="1"
                      className="input text-sm w-16 shrink-0"
                    />
                    <button type="button" onClick={() => removeProduct(i)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* Customer info */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Müştəri məlumatları</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Ad Soyad</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Məs. Hüseyn Məmmədov" className="input" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Əlaqə nömrəsi</label>
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel" placeholder="+994 50 000 00 00" className="input" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Əlavə qeydlər</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Məs. Maşına çirkli paltarla oturulmasın..."
              className="input resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="mt-auto flex flex-col gap-3 pt-2 shrink-0">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Yaradılır...' : 'Sifarişi yarat'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Ləğv et</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function OrdersClient() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'done'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getOrders()
      setOrders(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    done: orders.filter(o => o.status === 'done').length,
  }

  return (
    <>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sifarişlər</h1>
            <p className="text-sm text-gray-500 mt-0.5">{orders.length} sifariş</p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Sifariş
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {([
            { key: 'all', label: 'Hamısı' },
            { key: 'pending', label: 'Gözləyir' },
            { key: 'in_progress', label: 'İcrada' },
            { key: 'done', label: 'Tamamlandı' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                filter === f.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 text-xs ${filter === f.key ? 'text-blue-200' : 'text-gray-400'}`}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium">Hələ sifariş yoxdur</p>
            <p className="text-gray-500 text-sm mt-1">Yeni sifariş yaratmaq üçün + düyməsini basın.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(order => (
              <Link
                key={order.id}
                to={`/business/orders/${order.id}`}
                className="bg-white rounded-2xl border border-gray-200 px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="font-bold text-gray-900 text-base font-mono tracking-wider">{order.plate_number}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-gray-600">{order.car_brand} {order.car_model}</p>
                  {(order.customer_name || order.customer_surname) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[order.customer_name, order.customer_surname].filter(Boolean).join(' ')}
                      {order.customer_phone && ` · ${order.customer_phone}`}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                  {order.services && order.services.length > 0 && (
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {formatCurrency(order.services.reduce((s, t) => s + parseFloat(String(t.price)), 0))}
                    </p>
                  )}
                  {order.mechanic_name ? (
                    <p className="text-xs text-gray-500 mt-0.5">{order.mechanic_name}</p>
                  ) : order.mechanic_email ? (
                    <p className="text-xs text-gray-500 mt-0.5">{order.mechanic_email}</p>
                  ) : (
                    <p className="text-xs text-amber-500 mt-0.5">Təyin edilməyib</p>
                  )}
                </div>
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateOrderDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
    </>
  )
}
