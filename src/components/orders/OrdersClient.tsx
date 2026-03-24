import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Order, Mechanic, OrderService, Product, Customer } from '@/types'
import { getOrders, createOrder, uploadOrderImage } from '@/services/orders.service'
import { getMechanics } from '@/services/mechanics.service'
import { getProducts } from '@/services/warehouse.service'
import { getCustomers } from '@/services/customers.service'
import { formatDate, formatCurrency, mapApiError } from '@/lib/utils'
import StatusBadge from './StatusBadge'
import PlateInput from '@/components/ui/PlateInput'

type Period = 'day' | 'week' | 'month' | 'all' | 'custom'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day',    label: 'Bugün' },
  { key: 'week',   label: 'Bu həftə' },
  { key: 'month',  label: 'Bu ay' },
  { key: 'all',    label: 'Hamısı' },
  { key: 'custom', label: 'Tarix seç' },
]

function getPeriodRange(period: Period): { start: string | null; end: string | null } {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  if (period === 'day') return { start: today, end: today }
  if (period === 'week') {
    const d = new Date(now)
    const day = d.getDay()
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
    return { start: d.toISOString().slice(0, 10), end: today }
  }
  if (period === 'month') {
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    return { start, end: today }
  }
  return { start: null, end: null }
}

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
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [notes, setNotes] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const loadedRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const customerSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open && !loadedRef.current) {
      loadedRef.current = true
      getMechanics().then(r => setMechanics(r.data)).catch(() => {})
      getProducts().then(r => setWarehouseItems(r.data)).catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (!customerSearch.trim()) {
      setCustomerResults([])
      setShowCustomerDropdown(false)
      return
    }
    if (customerSearchRef.current) clearTimeout(customerSearchRef.current)
    customerSearchRef.current = setTimeout(() => {
      setCustomerSearchLoading(true)
      getCustomers({ search: customerSearch, page: 1 })
        .then(r => { setCustomerResults(r.data.results); setShowCustomerDropdown(true) })
        .catch(() => {})
        .finally(() => setCustomerSearchLoading(false))
    }, 300)
    return () => { if (customerSearchRef.current) clearTimeout(customerSearchRef.current) }
  }, [customerSearch])

  function selectCustomer(c: Customer) {
    setSelectedCustomerId(c.id)
    setCustomerName(c.full_name)
    setCustomerPhone(c.phone ?? '')
    if (c.car_plate) setPlate(c.car_plate)
    if (c.car_brand) setBrand(c.car_brand)
    if (c.car_model) setModel(c.car_model)
    setCustomerSearch(c.full_name)
    setShowCustomerDropdown(false)
    setCustomerResults([])
  }

  function clearCustomer() {
    setSelectedCustomerId(null)
    setCustomerSearch('')
    setCustomerName('')
    setCustomerPhone('')
    setCustomerResults([])
    setShowCustomerDropdown(false)
  }

  function reset() {
    setPlate(''); setBrand(''); setModel(''); setDescription(''); setDays(''); setMechanic('')
    setServices([{ name: '', price: '' }])
    setOrderProducts([])
    setCustomerName(''); setCustomerPhone(''); setSelectedCustomerId(null)
    setCustomerSearch(''); setCustomerResults([]); setShowCustomerDropdown(false)
    setNotes('')
    setImageFiles([]); setImagePreviews([]); setError('')
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (!picked.length) return
    const MAX = 5 * 1024 * 1024
    const combined = [...imageFiles, ...picked].slice(0, 3)
    const valid = combined.filter(f => f.size <= MAX)
    const tooLarge = combined.filter(f => f.size > MAX)
    if (tooLarge.length) setError(`${tooLarge.length} fayl 5 MB limitini aşır və əlavə edilmədi.`)
    else setError('')
    setImageFiles(valid)
    setImagePreviews(valid.map(f => URL.createObjectURL(f)))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeImagePreview(i: number) {
    setImageFiles(prev => prev.filter((_, idx) => idx !== i))
    setImagePreviews(prev => prev.filter((_, idx) => idx !== i))
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
      const orderRes = await createOrder({
        plate_number: plate,
        car_brand: brand,
        car_model: model,
        description,
        estimated_days: parseInt(days),
        mechanic: mechanic ? parseInt(mechanic) : null,
        services: filledServices,
        products: filledProducts,
        customer: selectedCustomerId ?? undefined,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        notes: notes || undefined,
      })
      // Upload images sequentially
      for (const file of imageFiles) {
        try { await uploadOrderImage(orderRes.data.id, file) } catch { /* ignore per-image errors */ }
      }
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

          {/* Customer info — first so search auto-fills car fields below */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Müştəri məlumatları</p>
            <div className="flex flex-col gap-3">
              {/* Customer search */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-sm font-medium text-gray-700">Müştəri axtar</label>
                <div className="relative">
                  <input
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomerId(null) }}
                    placeholder="Ad, telefon və ya nişan..."
                    className="input pr-8"
                    autoComplete="off"
                    autoFocus
                  />
                  {customerSearchLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                  )}
                  {selectedCustomerId && !customerSearchLoading && (
                    <button type="button" onClick={clearCustomer} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {showCustomerDropdown && customerResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {customerResults.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{c.full_name}</p>
                            {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                          </div>
                          {(c.car_plate || c.plates[0]) && (
                            <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">
                              {c.car_plate || c.plates[0]}
                            </span>
                          )}
                        </div>
                        {(c.car_brand || c.car_model) && (
                          <p className="text-xs text-gray-400 mt-0.5">{[c.car_brand, c.car_model, c.car_year].filter(Boolean).join(' ')}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {showCustomerDropdown && customerResults.length === 0 && !customerSearchLoading && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3">
                    <p className="text-sm text-gray-400">Müştəri tapılmadı</p>
                  </div>
                )}
                {selectedCustomerId && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Müştəri seçildi — məlumatlar avtomatik dolduruldu
                  </p>
                )}
              </div>

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

          {/* Car info */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Avtomobil</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Dövlət nişanı</label>
                <PlateInput value={plate} onChange={setPlate} required className="input font-mono tracking-wider" />
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

          {/* Images */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Şəkillər</p>
              <span className="text-xs text-gray-400">{imageFiles.length}/3</span>
            </div>
            {imagePreviews.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImagePreview(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {imageFiles.length < 3 && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImagePick}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Şəkil seç (maks. 3, hər biri 5 MB)
                </button>
              </>
            )}
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'done'>('all')
  const [period, setPeriod] = useState<Period>('all')
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10))
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const load = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const { start, end } = period === 'custom'
        ? { start: customDate, end: customDate }
        : getPeriodRange(period)

      const res = await getOrders({
        page: p,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        date_from: start ?? undefined,
        date_to: end ?? undefined,
      })
      setOrders(res.data.results)
      setTotalPages(res.data.total_pages)
      setTotalCount(res.data.count)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, period, customDate])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, period, customDate])

  useEffect(() => {
    load(page)
  }, [page, statusFilter, period, customDate]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePeriodChange(p: Period) {
    setPeriod(p)
    setPage(1)
  }

  function handleStatusChange(s: typeof statusFilter) {
    setStatusFilter(s)
    setPage(1)
  }

  return (
    <>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sifarişlər</h1>
            <p className="text-sm text-gray-500 mt-0.5">{totalCount} sifariş</p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Sifariş
          </button>
        </div>

        {/* Status filters */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {([
            { key: 'all',         label: 'Hamısı' },
            { key: 'pending',     label: 'Gözləyir' },
            { key: 'in_progress', label: 'İcrada' },
            { key: 'done',        label: 'Tamamlandı' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => handleStatusChange(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                statusFilter === f.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Period tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex flex-wrap gap-1 bg-gray-100 rounded-2xl p-1">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => handlePeriodChange(p.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  period === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.key === 'custom' && (
                  <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom single date */}
        {period === 'custom' && (
          <div className="flex items-center gap-3 mb-5 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 w-fit">
            <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-blue-600 font-medium">Tarix seçin</label>
              <input
                type="date"
                value={customDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setCustomDate(e.target.value)}
                className="text-sm border border-blue-200 bg-white rounded-lg px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
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
            {orders.map(order => (
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
                  {order.total != null && order.total > 0 && (
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {formatCurrency(order.total)}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                  n === page
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <CreateOrderDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setPage(1); load(1) }}
      />
    </>
  )
}
