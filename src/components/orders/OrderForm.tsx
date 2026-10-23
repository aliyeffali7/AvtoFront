import { t } from '@/i18n'
import { useState, useEffect, useRef } from 'react'
import { Order, OrderImage, Mechanic, OrderService, Product, Customer, Store, ServiceTemplate } from '@/types'
import { createOrder, updateOrder, uploadOrderImage, deleteOrderImage, purchaseProductForOrder, getServiceTemplates } from '@/services/orders.service'
import { getStores } from '@/services/stores.service'
import { getMechanics } from '@/services/mechanics.service'
import ServiceTemplatePicker from '@/components/orders/ServiceTemplatePicker'
import { getProducts } from '@/services/warehouse.service'
import { getCustomers } from '@/services/customers.service'
import { formatCurrency, formatPhone, mapApiError, autoFormatSearch } from '@/lib/utils'
import { mediaUrl } from '@/lib/apiUrl'
import { loadDraft, saveDraft, clearDraft, ORDER_DRAFT_KEY } from '@/lib/formDraft'
import { X } from 'lucide-react'
import Plate from '@/components/ui/Plate'
import ComboboxInput from '@/components/ui/ComboboxInput'
import BoughtNowRemoveModal, { BoughtNowAction, BoughtNowPart } from '@/components/orders/BoughtNowRemoveModal'
import PlateInput from '@/components/ui/PlateInput'
import CarBrandModelInputs from '@/components/ui/CarBrandModelInputs'

type SvcRow = { name: string; price: string; mechanicId: string; mechanicAmount: string; templateId?: string }
// A line already on the order (edit mode) has `lineId`: it keeps its product,
// frozen sell price and cost; only the quantity can change or the line be removed.
type ProdRow = { productId: string; qty: string; lineId?: number; name?: string; sellPrice?: number }
type NewProdRow = { name: string; purchasePrice: string; sellPrice: string; qty: string; supplierName: string; onCredit?: boolean }
// A part the customer brought in: no price, no stock — listed on the act only.
type CustProdRow = { name: string; qty: string }

// Serializable snapshot of everything the user types into a *new* order form —
// image files are deliberately excluded (a File can't be persisted).
type OrderDraft = {
  plate: string; brand: string; model: string; carYear: string; vinCode: string
  mileage: string; mileageUnit: 'km' | 'mil'; fuelType: string; description: string
  mechanic: string; services: SvcRow[]; orderProducts: ProdRow[]; newProducts: NewProdRow[]
  customerProducts?: CustProdRow[]
  customerName: string; customerPhone: string; selectedCustomerId: number | null
  customerSearch: string; notes: string; hasGuarantee: boolean
  diagnosis?: string; recommendations?: string
}

/**
 * Order create/edit form, rendered as a full page (/business/orders/new, or in
 * place of the detail page when editing). White section cards, sticky footer.
 */
export default function OrderForm({ order, onDone, onCancel }: {
  order?: Order | null
  onDone: (orderId: number) => void
  onCancel: () => void
}) {
  const isEdit = !!order

  // Only new-order forms restore a draft; editing an existing order always
  // starts from that order's real data.
  const [draft] = useState<OrderDraft | null>(() => (order ? null : loadDraft<OrderDraft>(ORDER_DRAFT_KEY)))
  const [draftRestored, setDraftRestored] = useState(!!draft)

  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [warehouseItems, setWarehouseItems] = useState<Product[]>([])
  const [plate, setPlate] = useState(order?.plate_number ?? draft?.plate ?? '')
  const [brand, setBrand] = useState(order?.car_brand ?? draft?.brand ?? '')
  const [model, setModel] = useState(order?.car_model ?? draft?.model ?? '')
  const [carYear, setCarYear] = useState(order?.car_year ?? draft?.carYear ?? '')
  const [vinCode, setVinCode] = useState(order?.vin_code ?? draft?.vinCode ?? '')
  const [mileage, setMileage] = useState(order?.mileage != null ? String(order.mileage) : draft?.mileage ?? '')
  const [mileageUnit, setMileageUnit] = useState<'km' | 'mil'>(order?.mileage_unit ?? draft?.mileageUnit ?? 'km')
  const [fuelType, setFuelType] = useState(order?.fuel_type ?? draft?.fuelType ?? '')
  const [description, setDescription] = useState(order?.description ?? draft?.description ?? '')
  const [mechanic, setMechanic] = useState(order?.mechanic ? String(order.mechanic) : draft?.mechanic ?? '')
  const [templates, setTemplates] = useState<ServiceTemplate[]>([])
  const [services, setServices] = useState<SvcRow[]>(
    order
      ? (order.services ?? []).map((s: OrderService) => ({
          name: s.name,
          price: String(s.price),
          mechanicId: s.mechanic ? String(s.mechanic) : '',
          mechanicAmount: s.mechanic_amount != null ? String(s.mechanic_amount) : '',
          templateId: s.template ? String(s.template) : '',
        }))
      : draft?.services ?? []
  )
  const [orderProducts, setOrderProducts] = useState<ProdRow[]>(
    order
      ? (order.products ?? [])
          .filter(p => p.source !== 'customer')
          .map(p => ({
            productId: p.product != null ? String(p.product) : '',
            qty: String(p.quantity),
            lineId: p.id,
            name: p.product_name,
            sellPrice: Number(p.sell_price) || 0,
          }))
      : draft?.orderProducts ?? []
  )
  const [boughtRemoveIndex, setBoughtRemoveIndex] = useState<number | null>(null)
  // Save blocked on the question about lowered bought-now quantities; the answer applies to all of them.
  const [reduceAsk, setReduceAsk] = useState<{ lines: { lineId: number; part: BoughtNowPart }[] } | null>(null)
  // order line id -> what to do with its purchase, for bought-now lines removed before save
  const [boughtActions, setBoughtActions] = useState<Record<string, BoughtNowAction>>({})
  const [newProducts, setNewProducts] = useState<NewProdRow[]>(order ? [] : draft?.newProducts ?? [])
  const [customerProducts, setCustomerProducts] = useState<CustProdRow[]>(
    order
      ? (order.products ?? [])
          .filter(p => p.source === 'customer')
          .map(p => ({ name: p.product_name, qty: String(p.quantity) }))
      : draft?.customerProducts ?? []
  )
  const [diagnosis, setDiagnosis] = useState(order?.diagnosis ?? draft?.diagnosis ?? '')
  const [recommendations, setRecommendations] = useState(order?.recommendations ?? draft?.recommendations ?? '')
  const [customerName, setCustomerName] = useState(order?.customer_name ?? draft?.customerName ?? '')
  const [customerPhone, setCustomerPhone] = useState(order?.customer_phone ?? draft?.customerPhone ?? '')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(order?.customer ?? draft?.selectedCustomerId ?? null)
  const [customerSearch, setCustomerSearch] = useState(order?.customer_name ?? draft?.customerSearch ?? '')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [notes, setNotes] = useState(order?.notes ?? draft?.notes ?? '')
  const [hasGuarantee, setHasGuarantee] = useState(order?.has_guarantee ?? draft?.hasGuarantee ?? false)
  const [stores, setStores] = useState<Store[]>([])
  // Photos already saved on the order; removing one is applied on "Saxla".
  const [existingImages, setExistingImages] = useState<OrderImage[]>(order?.images ?? [])
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const customerSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const customerAbortRef = useRef<AbortController | null>(null)
  // A restored draft that already had a customer chosen shouldn't trigger a
  // fresh search-and-dropdown on mount.
  const skipSearchRef = useRef(!!draft?.selectedCustomerId)

  useEffect(() => {
    getMechanics().then(r => setMechanics(r.data)).catch(() => {})
    getServiceTemplates().then(r => setTemplates(r.data)).catch(() => {})
    getProducts().then(r => setWarehouseItems(r.data)).catch(() => {})
    getStores().then(r => setStores(r.data)).catch(() => {})
    // Include paid-off debts too (true) — Kreditorlar's own combobox does the
    // same, since a supplier stays "known" even after being fully paid.
  }, [])

  // Persist the in-progress *new* order as a local draft on every change, so
  // leaving the page (e.g. a quick trip to Maliyyə) and coming back doesn't
  // lose what was typed. Cleared on a successful save or an explicit "Ləğv et",
  // and never stored while the form is still completely blank.
  useEffect(() => {
    if (isEdit) return
    const blank =
      !plate && !brand && !model && !carYear && !vinCode && !mileage && !fuelType &&
      !description && !mechanic && !customerName && !customerPhone && !selectedCustomerId &&
      !customerSearch && !notes && !hasGuarantee && !diagnosis && !recommendations &&
      services.length === 0 && orderProducts.length === 0 && newProducts.length === 0 &&
      customerProducts.length === 0
    if (blank) { clearDraft(ORDER_DRAFT_KEY); return }
    saveDraft<OrderDraft>(ORDER_DRAFT_KEY, {
      plate, brand, model, carYear, vinCode, mileage, mileageUnit, fuelType, description,
      mechanic, services, orderProducts, newProducts, customerProducts,
      customerName, customerPhone, selectedCustomerId, customerSearch, notes, hasGuarantee,
      diagnosis, recommendations,
    })
  }, [
    isEdit, plate, brand, model, carYear, vinCode, mileage, mileageUnit, fuelType, description,
    mechanic, services, orderProducts, newProducts, customerProducts,
    customerName, customerPhone, selectedCustomerId, customerSearch, notes, hasGuarantee,
    diagnosis, recommendations,
  ])

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
    const combined = [...imageFiles, ...picked].slice(0, Math.max(0, 3 - existingImages.length))
    const valid = combined.filter(f => f.size <= MAX)
    const tooLarge = combined.filter(f => f.size > MAX)
    setError(tooLarge.length ? t('{n} fayl 5 MB limitini aşır və əlavə edilmədi.', { n: tooLarge.length }) : '')
    setImageFiles(valid)
    setImagePreviews(valid.map(f => URL.createObjectURL(f)))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeImagePreview(i: number) {
    setImageFiles(prev => prev.filter((_, idx) => idx !== i))
    setImagePreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  function removeExistingImage(img: OrderImage) {
    setExistingImages(prev => prev.filter(x => x.id !== img.id))
    setRemovedImageIds(prev => [...prev, img.id])
  }

  function addServiceRow() { setServices(prev => [...prev, { name: '', price: '', mechanicId: '', mechanicAmount: '' }]) }
  function pickTemplate(i: number, tpl: ServiceTemplate) {
    setServices(prev => prev.map((t, idx) => idx === i
      ? { ...t, name: tpl.name, price: String(tpl.price), mechanicAmount: String(tpl.mechanic_amount), templateId: String(tpl.id) }
      : t))
  }
  function removeServiceRow(i: number) { setServices(prev => prev.filter((_, idx) => idx !== i)) }
  function updateServiceRow(i: number, field: keyof SvcRow, value: string) {
    setServices(prev => prev.map((t, idx) => {
      if (idx !== i) return t
      const updated = { ...t, [field]: value }
      // A "Hazır iş" keeps its fixed usta payı - no recalculation from the percent.
      if ((field === 'mechanicId' || field === 'price') && !t.templateId) {
        const mech = mechanics.find(m => m.id === parseInt(field === 'mechanicId' ? value : t.mechanicId))
        const price = parseFloat(field === 'price' ? value : t.price) || 0
        if (mech && price > 0) updated.mechanicAmount = (price * mech.work_percent / 100).toFixed(2)
        else if (field === 'mechanicId' && !value) updated.mechanicAmount = ''
      }
      return updated
    }))
  }

  function addProductRow() { setOrderProducts(prev => [...prev, { productId: '', qty: '1' }]) }
  function removeProductRow(i: number) {
    const row = orderProducts[i]
    const line = row?.lineId != null ? order?.products?.find(x => x.id === row.lineId) : undefined
    if (row && line && (line.bought_now_quantity ?? 0) > 0) {
      // Bought just for this order: ask now, apply the choice on save.
      setBoughtRemoveIndex(i)
      return
    }
    setOrderProducts(prev => prev.filter((_, idx) => idx !== i))
  }
  function chooseBoughtNow(action: BoughtNowAction) {
    const i = boughtRemoveIndex
    const lineId = i != null ? orderProducts[i]?.lineId : undefined
    if (i == null || lineId == null) return
    setBoughtActions(prev => ({ ...prev, [String(lineId)]: action }))
    setOrderProducts(prev => prev.filter((_, idx) => idx !== i))
    setBoughtRemoveIndex(null)
  }
  function updateProductRow(i: number, field: keyof ProdRow, value: string) {
    setOrderProducts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  function addNewProductRow() { setNewProducts(prev => [...prev, { name: '', purchasePrice: '', sellPrice: '', qty: '1', supplierName: '', onCredit: false }]) }
  function removeNewProductRow(i: number) { setNewProducts(prev => prev.filter((_, idx) => idx !== i)) }
  function updateNewProductRow<K extends keyof NewProdRow>(i: number, field: K, value: NewProdRow[K]) {
    setNewProducts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  function addCustomerProductRow() { setCustomerProducts(prev => [...prev, { name: '', qty: '1' }]) }
  function removeCustomerProductRow(i: number) { setCustomerProducts(prev => prev.filter((_, idx) => idx !== i)) }
  function updateCustomerProductRow(i: number, field: keyof CustProdRow, value: string) {
    setCustomerProducts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  // Existing bought-now lines whose quantity was lowered below what is
  // ordinary stock: the removed bought-now units need an answer.
  function reducedBoughtNowLines() {
    const found: { lineId: number; part: BoughtNowPart }[] = []
    for (const row of orderProducts) {
      if (row.lineId == null) continue
      const line = order?.products?.find(x => x.id === row.lineId)
      const bought = line?.bought_now_quantity ?? 0
      if (!line || bought <= 0) continue
      const removed = line.quantity - (parseInt(row.qty) || 1)
      const boughtRemoved = Math.min(bought, Math.max(removed - Math.max(line.quantity - bought, 0), 0))
      if (boughtRemoved > 0) found.push({ lineId: line.id, part: { name: line.product_name, quantity: boughtRemoved, supplier: line.bought_now_supplier } })
    }
    return found
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    const reduced = isEdit ? reducedBoughtNowLines() : []
    if (reduced.length > 0) { setReduceAsk({ lines: reduced }); return }
    void handleSubmit(e)
  }

  function chooseReduce(action: BoughtNowAction) {
    if (!reduceAsk) return
    const extra = Object.fromEntries(reduceAsk.lines.map(l => [String(l.lineId), action]))
    setReduceAsk(null)
    void handleSubmit(undefined, extra)
  }

  async function handleSubmit(e?: React.FormEvent, extraActions: Record<string, BoughtNowAction> = {}) {
    e?.preventDefault()
    setError('')
    setLoading(true)
    const filledServices: OrderService[] = services
      .filter(t => t.name.trim())
      .map(t => ({
        name: t.name.trim(),
        price: t.price || '0',
        mechanic: t.mechanicId ? parseInt(t.mechanicId) : null,
        mechanic_amount: t.mechanicAmount !== '' ? t.mechanicAmount : null,
        template: t.templateId ? parseInt(t.templateId) : null,
      }))
    const filledProducts = orderProducts
      .filter(p => p.lineId != null || p.productId)
      .map(p => (p.lineId != null
        ? { id: p.lineId, quantity: parseInt(p.qty) || 1 }
        : { product: parseInt(p.productId), quantity: parseInt(p.qty) || 1 }))
    const filledCustomerProducts = customerProducts
      .filter(p => p.name.trim())
      .map(p => ({ name: p.name.trim(), quantity: parseInt(p.qty) || 1 }))
    const toBuy = newProducts.filter(p => p.name.trim())
    const noStore = toBuy.find(p => !p.supplierName.trim())
    if (noStore) {
      setError(t('"{name}" hansı mağazadan alınıb? Mağazanı yazın.', { name: noStore.name.trim() }))
      setLoading(false)
      return
    }
    try {

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
        diagnosis: diagnosis.trim(),
        recommendations: recommendations.trim(),
        services: filledServices,
        products: filledProducts,
        customer_products: filledCustomerProducts,
        ...(isEdit && Object.keys({ ...boughtActions, ...extraActions }).length > 0 ? { bought_now_actions: { ...boughtActions, ...extraActions } } : {}),
      }

      const orderId = isEdit
        ? (await updateOrder(order!.id, payload)).data.id
        : (await createOrder(payload)).data.id

      // "Anbarda yoxdur": each part is bought from its store now and put on
      // the order (an existing product with the same name is reused).
      for (const np of toBuy) {
        await purchaseProductForOrder(orderId, {
          name: np.name.trim(),
          quantity: parseInt(np.qty) || 1,
          purchase_price: parseFloat(np.purchasePrice) || 0,
          sell_price: parseFloat(np.sellPrice) || 0,
          store_name: np.supplierName.trim(),
          on_credit: !!np.onCredit,
        })
      }
      for (const imageId of removedImageIds) {
        try { await deleteOrderImage(orderId, imageId) } catch { /* ignore per-image errors */ }
      }
      for (const file of imageFiles) {
        try { await uploadOrderImage(orderId, file) } catch { /* ignore per-image errors */ }
      }
      if (!isEdit) clearDraft(ORDER_DRAFT_KEY)
      onDone(orderId)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  function discardDraft() {
    clearDraft(ORDER_DRAFT_KEY)
    setDraftRestored(false)
    setPlate(''); setBrand(''); setModel(''); setCarYear(''); setVinCode('')
    setMileage(''); setMileageUnit('km'); setFuelType(''); setDescription(''); setMechanic('')
    setServices([]); setOrderProducts([]); setNewProducts([]); setCustomerProducts([])
    setDiagnosis(''); setRecommendations('')
    setCustomerName(''); setCustomerPhone(''); setSelectedCustomerId(null); setCustomerSearch('')
    setNotes(''); setHasGuarantee(false); setError('')
  }

  function handleCancel() {
    if (!isEdit) clearDraft(ORDER_DRAFT_KEY)
    onCancel()
  }

  const servicesSum = services.reduce((s, t) => s + (parseFloat(t.price) || 0), 0)
  const warehouseSum = orderProducts.reduce((s, p) => {
    if (p.lineId != null) return s + (p.sellPrice ?? 0) * (parseInt(p.qty) || 1)
    const w = warehouseItems.find(x => String(x.id) === p.productId)
    return s + (w ? Number(w.sell_price) * (parseInt(p.qty) || 1) : 0)
  }, 0)
  const newProductsSum = newProducts.reduce((s, p) => s + (p.name.trim() ? (parseFloat(p.sellPrice) || 0) * (parseInt(p.qty) || 1) : 0), 0)
  const formTotal = servicesSum + warehouseSum + newProductsSum

  const CLOSE_ICON = <X size={18} strokeWidth={1.75} />

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-4 max-w-3xl w-full mx-auto">
      <h1 className="page-title">{isEdit ? t('Sifarişi düzəlt') : t('Yeni sifariş')}</h1>

      {draftRestored && (
        <div className="flex items-center justify-between gap-2 bg-surface-2 border border-border rounded-lg px-4 py-3 text-small">
          <span className="text-text-3">{t('Yarımçıq qalmış qaralama bərpa edildi.')}</span>
          <button type="button" onClick={discardDraft} className="font-semibold text-danger hover:underline shrink-0">{t('Təmizlə')}</button>
        </div>
      )}

      {/* Customer */}
      <section className="card p-5">
        <h2 className="section-label mb-3">{t('Müştəri')}</h2>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 relative">
            <label className="label" htmlFor="order-customer-search">{t('Axtar')}</label>
            <input
              id="order-customer-search"
              value={customerSearch}
              onChange={e => { setCustomerSearch(autoFormatSearch(e.target.value)); setSelectedCustomerId(null) }}
              placeholder={t('Ad, telefon və ya nişan ilə axtar...')}
              className="input"
              autoComplete="off"
            />
            {showCustomerDropdown && customerResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-surface border border-border rounded shadow-md overflow-hidden max-h-48 overflow-y-auto">
                {customerResults.map(c => (
                  <button key={c.id} type="button" onClick={() => selectCustomer(c)} className="w-full px-3 py-2.5 text-left hover:bg-surface-2 border-b border-border last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-body font-medium text-text-1">{c.full_name}</p>
                      {(c.car_plate || c.plates[0]) && <Plate value={c.car_plate || c.plates[0]} size={12} />}
                    </div>
                    {c.phone && <p className="text-small text-text-3">{formatPhone(c.phone)}</p>}
                  </button>
                ))}
              </div>
            )}
            {customerSearchLoading && <p className="text-small text-text-3">{t('Axtarılır...')}</p>}
            {selectedCustomerId && (
              <p className="text-small text-success-strong">{t('✓ Müştəri seçildi — məlumatlar dolduruldu')}</p>
            )}
          </div>
          {selectedCustomerId && (
            <button type="button" onClick={clearCustomer} className="self-start text-small text-text-3 hover:text-ink underline">{t('Seçimi ləğv et')}</button>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="order-customer-name">{t('Ad Soyad')}</label>
              <input id="order-customer-name" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={t('Ad Soyad')} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="order-customer-phone">{t('Telefon')}</label>
              <input id="order-customer-phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel" placeholder="+994 50 000 00 00" className="input" />
            </div>
          </div>
        </div>
      </section>

      {/* Car */}
      <section className="card p-5">
        <h2 className="section-label mb-3">{t('Avtomobil')}</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="label">{t('Nişan')}</label>
            <PlateInput value={plate} onChange={setPlate} className="input-mono tracking-wider" />
          </div>
          <CarBrandModelInputs brand={brand} model={model} onBrandChange={setBrand} onModelChange={setModel} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="order-year">{t('İl')}</label>
              <input id="order-year" value={carYear} onChange={e => setCarYear(e.target.value)} placeholder={t('İl')} maxLength={4} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label" htmlFor="order-vin">{t('VIN kod')}</label>
              <input id="order-vin" value={vinCode} onChange={e => setVinCode(e.target.value)} placeholder={t('VIN kod')} maxLength={17} className="input-mono" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="order-mileage">{t('Yürüş')}</label>
              <div className="flex">
                <input id="order-mileage" value={mileage} onChange={e => setMileage(e.target.value)} type="number" min="0" placeholder={t('Yürüş')} className="input !rounded-r-none flex-1 min-w-0" />
                <div className="flex border border-l-0 border-border-strong rounded-r overflow-hidden shrink-0">
                  <button type="button" onClick={() => setMileageUnit('km')} className={`px-3 text-small font-semibold ${mileageUnit === 'km' ? 'bg-ink text-paper' : 'bg-surface text-text-3'}`}>{t('km')}</button>
                  <button type="button" onClick={() => setMileageUnit('mil')} className={`px-3 text-small font-semibold border-l border-border-strong ${mileageUnit === 'mil' ? 'bg-ink text-paper' : 'bg-surface text-text-3'}`}>{t('mil')}</button>
                </div>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="order-fuel">{t('Yanacaq növü')}</label>
              <select id="order-fuel" value={fuelType} onChange={e => setFuelType(e.target.value)} className="input">
                <option value="">{t('Yanacaq növü — seçilməyib')}</option>
                <option value="benzin">{t('Benzin')}</option>
                <option value="dizel">{t('Dizel')}</option>
                <option value="hybrid">{t('Hibrid')}</option>
                <option value="plug_in_hybrid">{t('Plug-in Hibrid')}</option>
                <option value="lpg">LPG</option>
                <option value="electric">{t('Tam elektrik')}</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Request + diagnosis */}
      <section className="card p-5">
        <div className="flex flex-col gap-3">
          <div>
            <label className="label" htmlFor="order-description">{t('Müştərinin müraciəti')}</label>
            <textarea id="order-description" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder={t('Müştərinin müraciəti — nədən şikayətlənir')} className="input resize-none" />
          </div>
          <div>
            <label className="label" htmlFor="order-diagnosis">{t('Diaqnostika nəticəsi')}</label>
            <textarea id="order-diagnosis" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} placeholder={t('Diaqnostika nəticəsi — nə aşkarlandı (könüllü)')} className="input resize-none" />
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-label">{t('Xidmətlər')}</h2>
          <button type="button" onClick={addServiceRow} className="text-small font-semibold text-ink hover:underline underline-offset-2">{t('+ Xidmət əlavə et')}</button>
        </div>
        <div className="flex flex-col gap-3">
          {services.map((svc, i) => (
            <div key={i} className="flex flex-col gap-2 border border-border rounded-lg p-3 bg-paper">
              <ServiceTemplatePicker templates={templates} onPick={tpl => pickTemplate(i, tpl)} />
              <div className="flex gap-2">
                <input value={svc.name} onChange={e => updateServiceRow(i, 'name', e.target.value)} placeholder={t('İş adı')} aria-label={t('İş adı')} className="input flex-1" />
                <button type="button" onClick={() => removeServiceRow(i)} aria-label={t('Sil')} className="w-11 h-11 flex items-center justify-center text-text-3 hover:text-danger shrink-0">{CLOSE_ICON}</button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <input value={svc.price} onChange={e => updateServiceRow(i, 'price', e.target.value)} type="number" min="0" step="0.01" placeholder={t('Qiymət ₼')} aria-label={t('Qiymət')} className="input-mono flex-1 min-w-[120px]" />
                <select value={svc.mechanicId} onChange={e => updateServiceRow(i, 'mechanicId', e.target.value)} aria-label={t('Usta')} className="input flex-1 min-w-[160px]">
                  <option value="">{t('— Usta yoxdur')}</option>
                  {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name || m.id} ({m.work_percent}%)</option>)}
                </select>
              </div>
              {(svc.mechanicId || svc.templateId) && (
                <div className="flex items-center gap-2">
                  <span className="label !mb-0 shrink-0">{t('Usta payı')}</span>
                  <input value={svc.mechanicAmount} onChange={e => updateServiceRow(i, 'mechanicAmount', e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" className="input-mono" />
                  {svc.templateId && <span className="text-small text-text-3">{t('Hazır iş — sabit pay')}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
        {services.some(t => t.name && t.price) && (
          <p className="text-right text-body font-mono font-semibold text-text-1 mt-3">
            {t('Cəmi:')} {formatCurrency(servicesSum)}
          </p>
        )}
      </section>

      {/* Products */}
      <section className="card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h2 className="section-label">{t('Məhsullar')}</h2>
          <div className="flex gap-4 flex-wrap">
            <button type="button" onClick={addProductRow} className="text-small font-semibold text-ink hover:underline underline-offset-2">{t('+ Anbarda var')}</button>
            <button type="button" onClick={addNewProductRow} className="text-small font-semibold text-warning-strong hover:underline underline-offset-2">{t('+ Anbarda yoxdur')}</button>
            <button type="button" onClick={addCustomerProductRow} className="text-small font-semibold text-text-3 hover:text-ink hover:underline underline-offset-2">{t('+ Müştəri gətirib')}</button>
          </div>
        </div>

        {newProducts.length > 0 && (
          <div className="flex flex-col gap-3 mb-3">
            {newProducts.map((p, i) => (
              <div key={i} className="flex flex-col gap-2 bg-warning-subtle border border-warning/30 rounded-lg p-3">
                <div className="flex gap-2">
                  <input value={p.name} onChange={e => updateNewProductRow(i, 'name', e.target.value)} placeholder={t('Məhsul adı')} aria-label={t('Məhsul adı')} className="input flex-1" />
                  <button type="button" onClick={() => removeNewProductRow(i)} aria-label={t('Sil')} className="w-11 h-11 flex items-center justify-center text-text-3 hover:text-danger shrink-0">{CLOSE_ICON}</button>
                </div>
                <div className="flex gap-2">
                  <input value={p.purchasePrice} onChange={e => updateNewProductRow(i, 'purchasePrice', e.target.value)} type="number" min="0" step="0.01" placeholder={t('Alış ₼')} aria-label={t('Alış')} className="input-mono flex-1 min-w-0" />
                  <input value={p.sellPrice} onChange={e => updateNewProductRow(i, 'sellPrice', e.target.value)} type="number" min="0" step="0.01" placeholder={t('Satış ₼')} aria-label={t('Satış')} className="input-mono flex-1 min-w-0" />
                  <input value={p.qty} onChange={e => updateNewProductRow(i, 'qty', e.target.value)} type="number" min="1" placeholder={t('Ədəd')} aria-label={t('Ədəd')} className="input-mono w-20 shrink-0" />
                </div>
                <ComboboxInput value={p.supplierName} onChange={v => updateNewProductRow(i, 'supplierName', v)} options={stores.map(st => st.name)} placeholder={t('Mağaza (məcburi)')} />
                <label className="flex items-center gap-2 text-body text-text-1 cursor-pointer">
                  <input type="checkbox" checked={!!p.onCredit} onChange={e => updateNewProductRow(i, 'onCredit', e.target.checked)} className="w-4 h-4 accent-ink" />
                  {t('Nisyə alınıb')}
                  <span className="text-small text-text-3">{p.onCredit ? t('— kreditor borcu yaranacaq') : t('— kassadan çıxacaq')}</span>
                </label>
              </div>
            ))}
          </div>
        )}

        {customerProducts.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            <p className="text-small text-text-3">{t('Müştərinin özü gətirdiyi hissələr: qiyməti yoxdur, anbardan çıxmır, aktda "Müştəri" kimi göstərilir.')}</p>
            {customerProducts.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input value={p.name} onChange={e => updateCustomerProductRow(i, 'name', e.target.value)} placeholder={t('Hissənin adı')} aria-label={t('Hissənin adı')} className="input flex-1" />
                <input value={p.qty} onChange={e => updateCustomerProductRow(i, 'qty', e.target.value)} type="number" min="1" placeholder="1" aria-label={t('Ədəd')} className="input-mono w-20 shrink-0" />
                <button type="button" onClick={() => removeCustomerProductRow(i)} aria-label={t('Sil')} className="w-11 h-11 flex items-center justify-center text-text-3 hover:text-danger shrink-0">{CLOSE_ICON}</button>
              </div>
            ))}
          </div>
        )}

        {orderProducts.length === 0 && newProducts.length === 0 && customerProducts.length === 0 ? (
          <p className="text-body text-text-3">{t('Məhsul seçilməyib')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {orderProducts.map((p, i) => (
              <div key={i} className="flex gap-2">
                {p.lineId != null ? (
                  <div className="input flex-1 min-w-0 flex flex-col justify-center !h-auto min-h-[44px] bg-surface-2">
                    <span className="truncate text-text-1">{p.name || t('(silinib)')}</span>
                    <span className="text-small text-text-3 font-mono">{formatCurrency(p.sellPrice ?? 0)} / {t('ədəd')}</span>
                  </div>
                ) : (
                <select value={p.productId} onChange={e => updateProductRow(i, 'productId', e.target.value)} aria-label={t('Məhsul')} className="input flex-1 min-w-0">
                  <option value="">{t('Seçin...')}</option>
                  {warehouseItems.map(w => (
                    <option key={w.id} value={w.id} disabled={w.stock_quantity === 0}>{w.name} ({t('{n} ədəd', { n: w.stock_quantity })}){w.stock_quantity === 0 ? t(' — stok yoxdur') : ''}</option>
                  ))}
                </select>
                )}
                <input value={p.qty} onChange={e => updateProductRow(i, 'qty', e.target.value)} type="number" min="1" placeholder="1" aria-label={t('Ədəd')} className="input-mono w-20 shrink-0" />
                <button type="button" onClick={() => removeProductRow(i)} aria-label={t('Sil')} className="w-11 h-11 flex items-center justify-center text-text-3 hover:text-danger shrink-0">{CLOSE_ICON}</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Images */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-label">{t('Şəkillər')}</h2>
          <span className="text-small text-text-3 font-mono">{existingImages.length + imageFiles.length}/3</span>
        </div>
        {existingImages.length > 0 && (
          <div className="flex gap-3 mb-3 flex-wrap">
            {existingImages.map(img => (
              <div key={img.id} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border shrink-0">
                <img src={mediaUrl(img.image)} alt={t('Şəkil')} className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeExistingImage(img)} aria-label={t('Şəkli sil')} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-ink/80 text-paper flex items-center justify-center">
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}
        {imagePreviews.length > 0 && (
          <div className="flex gap-3 mb-3 flex-wrap">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border shrink-0">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImagePreview(i)} aria-label={t('Sil')} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-ink/80 text-paper flex items-center justify-center">
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}
        {existingImages.length + imageFiles.length < 3 && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border border-dashed border-border-strong rounded-lg py-3 text-body text-text-3 hover:border-ink hover:text-ink transition-colors">
              {t('+ Şəkil seç (maks. 3, hər biri 5 MB)')}
            </button>
          </>
        )}
      </section>

      {/* Notes */}
      <section className="card p-5 flex flex-col gap-3">
        <div>
          <label className="label" htmlFor="order-notes">{t('Əlavə qeydlər')}</label>
          <textarea id="order-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder={t('Məs. maşına çirkli paltarla oturulmasın...')} className="input resize-none" />
        </div>
        <div>
          <label className="label" htmlFor="order-recommendations">{t('Tövsiyə olunan işlər')}</label>
          <textarea id="order-recommendations" value={recommendations} onChange={e => setRecommendations(e.target.value)} rows={2} placeholder={t('Hər sətir ayrıca bənd. Məs:\nNövbəti 5 000 km-də yağ səviyyəsini yoxlamaq')} className="input resize-none" />
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={hasGuarantee} onChange={e => setHasGuarantee(e.target.checked)} className="w-4 h-4 accent-ink" />
          <span className="text-body text-text-1">{t('Bu sifarişə zəmanət verilib')}</span>
        </label>
      </section>

      {error && <p className="text-body text-danger bg-danger-subtle rounded-lg px-4 py-3">{error}</p>}

      {/* Sticky footer */}
      <div className="sticky bottom-0 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3 bg-paper/95 backdrop-blur border-t border-border flex items-center justify-between gap-3 flex-wrap z-10">
        <div className="flex items-baseline gap-3">
          <span className="section-label">{t('Cəmi')}</span>
          <span className="font-mono font-semibold tabular-nums text-h3 text-text-1">{formatCurrency(formTotal)}</span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleCancel} className="btn-secondary">{t('Ləğv et')}</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? t('Saxlanılır...') : isEdit ? t('Saxla') : t('Sifarişi yarat')}</button>
        </div>
      </div>
      <BoughtNowRemoveModal
        open={boughtRemoveIndex !== null}
        parts={(() => {
          const row = boughtRemoveIndex != null ? orderProducts[boughtRemoveIndex] : undefined
          const line = row?.lineId != null ? order?.products?.find(x => x.id === row.lineId) : undefined
          return [{ name: row?.name ?? '', quantity: line?.bought_now_quantity ?? 0, supplier: line?.bought_now_supplier }]
        })()}
        onChoose={chooseBoughtNow}
        onClose={() => setBoughtRemoveIndex(null)}
      />
      <BoughtNowRemoveModal
        open={reduceAsk !== null}
        mode="reduce"
        parts={reduceAsk?.lines.map(l => l.part) ?? []}
        onChoose={chooseReduce}
        onClose={() => setReduceAsk(null)}
      />
    </form>
  )
}
