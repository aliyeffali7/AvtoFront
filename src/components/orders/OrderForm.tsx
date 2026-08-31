import { useState, useEffect, useMemo, useRef } from 'react'
import { Order, Mechanic, OrderService, Product, Customer, Store } from '@/types'
import { createOrder, updateOrder, uploadOrderImage, addProductToOrder } from '@/services/orders.service'
import { getStores } from '@/services/stores.service'
import { resolveStoreId, mergeStoreNames } from '@/lib/resolveStore'
import { getMechanics } from '@/services/mechanics.service'
import { getProducts, createProduct, getSupplierDebts } from '@/services/warehouse.service'
import { getCustomers } from '@/services/customers.service'
import { formatCurrency, mapApiError, autoFormatSearch } from '@/lib/utils'
import ComboboxInput from '@/components/ui/ComboboxInput'
import PlateInput from '@/components/ui/PlateInput'

type SvcRow = { name: string; price: string; mechanicId: string; mechanicAmount: string }
type ProdRow = { productId: string; qty: string }
type NewProdRow = { name: string; purchasePrice: string; sellPrice: string; qty: string; supplierName: string }

/**
 * Single-column order create/edit form, rendered inline in the master-detail
 * right panel (no drawer). Shared by the "create" and "edit" panel states in
 * OrdersClient — the two previously diverged as CreateOrderDrawer/EditOrderDrawer.
 */
export default function OrderForm({ order, onDone, onCancel }: {
  order?: Order | null
  onDone: (orderId: number) => void
  onCancel: () => void
}) {
  const isEdit = !!order

  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [warehouseItems, setWarehouseItems] = useState<Product[]>([])
  const [plate, setPlate] = useState(order?.plate_number ?? '')
  const [brand, setBrand] = useState(order?.car_brand ?? '')
  const [model, setModel] = useState(order?.car_model ?? '')
  const [carYear, setCarYear] = useState(order?.car_year ?? '')
  const [vinCode, setVinCode] = useState(order?.vin_code ?? '')
  const [mileage, setMileage] = useState(order?.mileage != null ? String(order.mileage) : '')
  const [mileageUnit, setMileageUnit] = useState<'km' | 'mil'>(order?.mileage_unit ?? 'km')
  const [fuelType, setFuelType] = useState(order?.fuel_type ?? '')
  const [description, setDescription] = useState(order?.description ?? '')
  const [mechanic, setMechanic] = useState(order?.mechanic ? String(order.mechanic) : '')
  const [services, setServices] = useState<SvcRow[]>(
    (order?.services ?? []).map((s: OrderService) => ({
      name: s.name,
      price: String(s.price),
      mechanicId: s.mechanic ? String(s.mechanic) : '',
      mechanicAmount: s.mechanic_amount != null ? String(s.mechanic_amount) : '',
    }))
  )
  const [orderProducts, setOrderProducts] = useState<ProdRow[]>(
    (order?.products ?? []).map(p => ({ productId: String(p.product), qty: String(p.quantity) }))
  )
  const [newProducts, setNewProducts] = useState<NewProdRow[]>([])
  const [customerName, setCustomerName] = useState(order?.customer_name ?? '')
  const [customerPhone, setCustomerPhone] = useState(order?.customer_phone ?? '')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(order?.customer ?? null)
  const [customerSearch, setCustomerSearch] = useState(order?.customer_name ?? '')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [notes, setNotes] = useState(order?.notes ?? '')
  const [hasGuarantee, setHasGuarantee] = useState(order?.has_guarantee ?? false)
  const [stores, setStores] = useState<Store[]>([])
  const [supplierDebtNames, setSupplierDebtNames] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const customerSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const customerAbortRef = useRef<AbortController | null>(null)
  const skipSearchRef = useRef(false)

  useEffect(() => {
    getMechanics().then(r => setMechanics(r.data)).catch(() => {})
    getProducts().then(r => setWarehouseItems(r.data)).catch(() => {})
    getStores().then(r => setStores(r.data)).catch(() => {})
    // Include paid-off debts too (true) — Kreditorlar's own combobox does the
    // same, since a supplier stays "known" even after being fully paid.
    getSupplierDebts(true).then(r => setSupplierDebtNames([...new Set(r.data.map(d => d.supplier_name))])).catch(() => {})
  }, [])

  // "Mağaza" options for the "Anbarda yoxdur" row: Store records alone miss
  // suppliers entered by hand on the Kreditorlar page (no Store gets created
  // there), so merge in Kreditorlar's own supplier names too. resolveStoreId
  // still only matches against real Store records — a name that exists only
  // in Kreditorlar falls through to createStore(), which is the intended
  // "add it there too" behavior.
  const storeOptions = useMemo(
    () => mergeStoreNames(stores, supplierDebtNames),
    [stores, supplierDebtNames]
  )

  useEffect(() => {
    if (skipSearchRef.current) { skipSearchRef.current = false; return }
    if (!customerSearch.trim()) { setCustomerResults([]); setShowCustomerDropdown(false); return }
    if (customerSearchRef.current) clearTimeout(customerSearchRef.current)
    customerAbortRef.current?.abort()
    const controller = new AbortController()
    customerAbortRef.current = controller
    customerSearchRef.current = setTimeout(() => {
      setCustomerSearchLoading(true)
      getCustomers({ search: customerSearch, page: 1 })
        .then(r => { if (!controller.signal.aborted) { setCustomerResults(r.data.results); setShowCustomerDropdown(true) } })
        .catch(() => {})
        .finally(() => { if (!controller.signal.aborted) setCustomerSearchLoading(false) })
    }, 300)
    return () => { clearTimeout(customerSearchRef.current ?? undefined); controller.abort() }
  }, [customerSearch])

  function selectCustomer(c: Customer) {
    setSelectedCustomerId(c.id)
    setCustomerName(c.full_name)
    setCustomerPhone(c.phone ?? '')
    if (c.car_plate) setPlate(c.car_plate)
    if (c.car_brand) setBrand(c.car_brand)
    if (c.car_model) setModel(c.car_model)
    if (c.car_year) setCarYear(c.car_year)
    if (c.vin_code) setVinCode(c.vin_code)
    skipSearchRef.current = true
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

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (!picked.length) return
    const MAX = 5 * 1024 * 1024
    const combined = [...imageFiles, ...picked].slice(0, 3)
    const valid = combined.filter(f => f.size <= MAX)
    const tooLarge = combined.filter(f => f.size > MAX)
    setError(tooLarge.length ? `${tooLarge.length} fayl 5 MB limitini aşır və əlavə edilmədi.` : '')
    setImageFiles(valid)
    setImagePreviews(valid.map(f => URL.createObjectURL(f)))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeImagePreview(i: number) {
    setImageFiles(prev => prev.filter((_, idx) => idx !== i))
    setImagePreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  function addServiceRow() { setServices(prev => [...prev, { name: '', price: '', mechanicId: '', mechanicAmount: '' }]) }
  function removeServiceRow(i: number) { setServices(prev => prev.filter((_, idx) => idx !== i)) }
  function updateServiceRow(i: number, field: keyof SvcRow, value: string) {
    setServices(prev => prev.map((t, idx) => {
      if (idx !== i) return t
      const updated = { ...t, [field]: value }
      if (field === 'mechanicId' || field === 'price') {
        const mech = mechanics.find(m => m.id === parseInt(field === 'mechanicId' ? value : t.mechanicId))
        const price = parseFloat(field === 'price' ? value : t.price) || 0
        if (mech && price > 0) updated.mechanicAmount = (price * mech.work_percent / 100).toFixed(2)
        else if (field === 'mechanicId' && !value) updated.mechanicAmount = ''
      }
      return updated
    }))
  }

  function addProductRow() { setOrderProducts(prev => [...prev, { productId: '', qty: '1' }]) }
  function removeProductRow(i: number) { setOrderProducts(prev => prev.filter((_, idx) => idx !== i)) }
  function updateProductRow(i: number, field: keyof ProdRow, value: string) {
    setOrderProducts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  function addNewProductRow() { setNewProducts(prev => [...prev, { name: '', purchasePrice: '', sellPrice: '', qty: '1', supplierName: '' }]) }
  function removeNewProductRow(i: number) { setNewProducts(prev => prev.filter((_, idx) => idx !== i)) }
  function updateNewProductRow(i: number, field: keyof NewProdRow, value: string) {
    setNewProducts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const filledServices: OrderService[] = services
      .filter(t => t.name.trim())
      .map(t => ({
        name: t.name.trim(),
        price: t.price || '0',
        mechanic: t.mechanicId ? parseInt(t.mechanicId) : null,
        mechanic_amount: t.mechanicAmount !== '' ? t.mechanicAmount : null,
      }))
    const filledProducts = orderProducts
      .filter(p => p.productId)
      .map(p => ({ product: parseInt(p.productId), quantity: parseInt(p.qty) || 1 }))
    try {
      const newNonWarehouseProducts: Array<{ productId: number; qty: number; supplierName: string }> = []
      for (const np of newProducts.filter(p => p.name.trim())) {
        const qty = parseInt(np.qty) || 1
        const res = await createProduct({
          name: np.name.trim(),
          purchase_price: parseFloat(np.purchasePrice) || 0,
          sell_price: parseFloat(np.sellPrice) || 0,
          stock_quantity: qty,
          is_warehouse: false,
        })
        newNonWarehouseProducts.push({ productId: res.data.id, qty, supplierName: np.supplierName.trim() })
      }

      const payload = {
        plate_number: plate,
        car_brand: brand,
        car_model: model,
        car_year: carYear || undefined,
        vin_code: vinCode || undefined,
        mileage: mileage ? parseInt(mileage) : undefined,
        mileage_unit: mileageUnit,
        fuel_type: fuelType || undefined,
        description: description || undefined,
        mechanic: mechanic ? parseInt(mechanic) : null,
        customer: selectedCustomerId ?? undefined,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        notes: notes || undefined,
        has_guarantee: hasGuarantee,
        services: filledServices,
        products: filledProducts,
      }

      const orderId = isEdit
        ? (await updateOrder(order!.id, payload)).data.id
        : (await createOrder(payload)).data.id

      for (const { productId, qty, supplierName } of newNonWarehouseProducts) {
        const storeId = supplierName ? await resolveStoreId(stores, supplierName) : undefined
        await addProductToOrder(orderId, productId, qty, storeId)
      }
      for (const file of imageFiles) {
        try { await uploadOrderImage(orderId, file) } catch { /* ignore per-image errors */ }
      }
      onDone(orderId)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-5">
      <p className="font-serif font-semibold text-lg text-ink">{isEdit ? 'Sifarişi düzəlt' : 'Yeni sifariş'}</p>

      {/* Customer */}
      <div>
        <p className="section-label mb-2">Müştəri</p>
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1 relative">
            <input
              value={customerSearch}
              onChange={e => { setCustomerSearch(autoFormatSearch(e.target.value)); setSelectedCustomerId(null) }}
              placeholder="Ad, telefon və ya nişan ilə axtar..."
              className="input"
              autoComplete="off"
            />
            {showCustomerDropdown && customerResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-surface border border-rule rounded shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                {customerResults.map(c => (
                  <button key={c.id} type="button" onClick={() => selectCustomer(c)} className="w-full px-3 py-2.5 text-left hover:bg-surface-alt border-b border-rule last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink">{c.full_name}</p>
                      {(c.car_plate || c.plates[0]) && <span className="text-xs font-mono bg-surface-alt text-ink px-1.5 py-0.5 rounded">{c.car_plate || c.plates[0]}</span>}
                    </div>
                    {c.phone && <p className="text-xs text-ink-muted">{c.phone}</p>}
                  </button>
                ))}
              </div>
            )}
            {customerSearchLoading && <p className="text-xs text-ink-muted">Axtarılır...</p>}
            {selectedCustomerId && (
              <p className="text-xs text-accent">✓ Müştəri seçildi — məlumatlar dolduruldu</p>
            )}
          </div>
          {selectedCustomerId && (
            <button type="button" onClick={clearCustomer} className="self-start text-xs text-ink-muted hover:text-ink underline">Seçimi ləğv et</button>
          )}
          <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Ad Soyad" className="input" />
          <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel" placeholder="+994 50 000 00 00" className="input" />
        </div>
      </div>

      <div className="border-t border-rule" />

      {/* Car */}
      <div>
        <p className="section-label mb-2">Avtomobil</p>
        <div className="flex flex-col gap-2.5">
          <PlateInput value={plate} onChange={setPlate} className="input-mono tracking-wider" />
          <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Marka" className="input" />
          <input value={model} onChange={e => setModel(e.target.value)} placeholder="Model" className="input" />
          <div className="flex gap-2.5">
            <input value={carYear} onChange={e => setCarYear(e.target.value)} placeholder="İl" maxLength={4} className="input flex-1" />
            <input value={vinCode} onChange={e => setVinCode(e.target.value)} placeholder="VIN kod" maxLength={17} className="input-mono flex-[2] text-sm" />
          </div>
          <div className="flex">
            <input value={mileage} onChange={e => setMileage(e.target.value)} type="number" min="0" placeholder="Yürüş" className="input rounded-r-none flex-1" />
            <div className="flex border border-l-0 border-rule rounded-r overflow-hidden shrink-0">
              <button type="button" onClick={() => setMileageUnit('km')} className={`px-2.5 text-xs font-semibold ${mileageUnit === 'km' ? 'bg-accent text-cream' : 'bg-surface text-ink-muted'}`}>km</button>
              <button type="button" onClick={() => setMileageUnit('mil')} className={`px-2.5 text-xs font-semibold border-l border-rule ${mileageUnit === 'mil' ? 'bg-accent text-cream' : 'bg-surface text-ink-muted'}`}>mil</button>
            </div>
          </div>
          <select value={fuelType} onChange={e => setFuelType(e.target.value)} className="input">
            <option value="">Yanacaq növü — seçilməyib</option>
            <option value="benzin">Benzin</option>
            <option value="dizel">Dizel</option>
            <option value="hybrid">Hibrid</option>
            <option value="plug_in_hybrid">Plug-in Hibrid</option>
            <option value="lpg">LPG</option>
            <option value="electric">Tam elektrik</option>
          </select>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Tapşırıq — görüləcək iş" className="input resize-none" />
        </div>
      </div>

      <div className="border-t border-rule" />

      {/* Services */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="section-label">Xidmətlər</p>
          <button type="button" onClick={addServiceRow} className="text-xs font-semibold text-accent hover:text-accent-hover">+ Xidmət əlavə et</button>
        </div>
        <div className="flex flex-col gap-2.5">
          {services.map((svc, i) => (
            <div key={i} className="flex flex-col gap-1.5 border border-rule rounded p-2.5">
              <div className="flex gap-1.5">
                <input value={svc.name} onChange={e => updateServiceRow(i, 'name', e.target.value)} placeholder="İş adı" className="input text-sm flex-1" />
                <button type="button" onClick={() => removeServiceRow(i)} className="p-1 text-ink-muted hover:text-danger shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex gap-1.5">
                <input value={svc.price} onChange={e => updateServiceRow(i, 'price', e.target.value)} type="number" min="0" step="0.01" placeholder="Qiymət ₼" className="input-mono text-sm flex-1" />
                <select value={svc.mechanicId} onChange={e => updateServiceRow(i, 'mechanicId', e.target.value)} className="input text-sm flex-1">
                  <option value="">— Usta yoxdur</option>
                  {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name || m.id} ({m.work_percent}%)</option>)}
                </select>
              </div>
              {svc.mechanicId && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-muted shrink-0">Usta payı:</span>
                  <input value={svc.mechanicAmount} onChange={e => updateServiceRow(i, 'mechanicAmount', e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" className="input-mono text-sm" />
                </div>
              )}
            </div>
          ))}
        </div>
        {services.some(t => t.name && t.price) && (
          <p className="text-right text-sm font-mono font-semibold text-ink mt-2">
            Cəmi: {formatCurrency(services.reduce((s, t) => s + (parseFloat(t.price) || 0), 0))}
          </p>
        )}
      </div>

      <div className="border-t border-rule" />

      {/* Products */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="section-label">Məhsullar</p>
          <div className="flex gap-3">
            <button type="button" onClick={addProductRow} className="text-xs font-semibold text-accent hover:text-accent-hover">+ Anbarda var</button>
            <button type="button" onClick={addNewProductRow} className="text-xs font-semibold text-warning hover:text-ink">+ Anbarda yoxdur</button>
          </div>
        </div>

        {newProducts.length > 0 && (
          <div className="flex flex-col gap-2 mb-2.5">
            {newProducts.map((p, i) => (
              <div key={i} className="flex flex-col gap-1.5 bg-warning-bg border border-warning/30 rounded p-2">
                <div className="flex gap-1.5">
                  <input value={p.name} onChange={e => updateNewProductRow(i, 'name', e.target.value)} placeholder="Məhsul adı" className="input text-sm flex-1" />
                  <button type="button" onClick={() => removeNewProductRow(i)} className="p-1 text-ink-muted hover:text-danger shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <input value={p.purchasePrice} onChange={e => updateNewProductRow(i, 'purchasePrice', e.target.value)} type="number" min="0" step="0.01" placeholder="Alış ₼" className="input-mono text-sm flex-1" />
                  <input value={p.sellPrice} onChange={e => updateNewProductRow(i, 'sellPrice', e.target.value)} type="number" min="0" step="0.01" placeholder="Satış ₼" className="input-mono text-sm flex-1" />
                  <input value={p.qty} onChange={e => updateNewProductRow(i, 'qty', e.target.value)} type="number" min="1" placeholder="Ədəd" className="input-mono text-sm w-16 shrink-0" />
                </div>
                <ComboboxInput value={p.supplierName} onChange={v => updateNewProductRow(i, 'supplierName', v)} options={storeOptions} placeholder="Mağaza adı (borc varsa)" className="text-sm" />
              </div>
            ))}
          </div>
        )}

        {orderProducts.length === 0 && newProducts.length === 0 ? (
          <p className="text-xs text-ink-muted italic">Məhsul seçilməyib</p>
        ) : (
          <div className="flex flex-col gap-2">
            {orderProducts.map((p, i) => (
              <div key={i} className="flex gap-1.5">
                <select value={p.productId} onChange={e => updateProductRow(i, 'productId', e.target.value)} className="input text-sm flex-1">
                  <option value="">Seçin...</option>
                  {warehouseItems.map(w => (
                    <option key={w.id} value={w.id} disabled={w.stock_quantity === 0}>{w.name} ({w.stock_quantity} ədəd){w.stock_quantity === 0 ? ' — stok yoxdur' : ''}</option>
                  ))}
                </select>
                <input value={p.qty} onChange={e => updateProductRow(i, 'qty', e.target.value)} type="number" min="1" placeholder="1" className="input-mono text-sm w-16 shrink-0" />
                <button type="button" onClick={() => removeProductRow(i)} className="p-1 text-ink-muted hover:text-danger shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-rule" />

      {/* Images */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="section-label">Şəkillər</p>
          <span className="text-xs text-ink-muted">{imageFiles.length}/3</span>
        </div>
        {imagePreviews.length > 0 && (
          <div className="flex gap-2 mb-2.5 flex-wrap">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative w-16 h-16 rounded overflow-hidden border border-rule shrink-0">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImagePreview(i)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-ink/70 text-cream flex items-center justify-center">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {imageFiles.length < 3 && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border border-dashed border-rule rounded py-2.5 text-sm text-ink-muted hover:border-accent hover:text-accent transition-colors">
              + Şəkil seç (maks. 3, hər biri 5 MB)
            </button>
          </>
        )}
      </div>

      <div className="border-t border-rule" />

      <div>
        <p className="section-label mb-2">Əlavə qeydlər</p>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Məs. maşına çirkli paltarla oturulmasın..." className="input resize-none" />
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input type="checkbox" checked={hasGuarantee} onChange={e => setHasGuarantee(e.target.checked)} className="w-4 h-4 accent-accent" />
        <span className="text-sm text-ink">Bu sifarişə zəmanət verilib</span>
      </label>

      {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{error}</p>}

      <div className="flex flex-col gap-2.5 pt-1">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saxlanılır...' : isEdit ? 'Saxla' : 'Sifarişi yarat'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Ləğv et</button>
      </div>
    </form>
  )
}
