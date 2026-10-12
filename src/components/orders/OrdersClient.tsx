import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGoBack } from '@/lib/useGoBack'
import { Order, Mechanic, Product, Business, Store } from '@/types'
import {
  getOrders, getOrder, createOrder, assignMechanic, changeOrderStatus,
  addProductToOrder, removeProductFromOrder, updateOrderProduct, purchaseProductForOrder, returnOrderProduct,
  addServiceToOrder, removeServiceFromOrder,
  recordPayment, updateOrder, deleteOrder,
  uploadOrderImage, deleteOrderImage,
} from '@/services/orders.service'
import { getMechanics } from '@/services/mechanics.service'
import { getProducts } from '@/services/warehouse.service'
import { getStores } from '@/services/stores.service'
import { getBusinessProfile } from '@/services/auth.service'
import { formatDate, formatCurrency, mapApiError } from '@/lib/utils'
import { printOrderPDF } from '@/lib/serviceActPdf'
import { carReadyMessage, debtReminderMessage, hasWhatsAppNumber, orderLinkMessage, whatsappLink } from '@/lib/whatsapp'
import { resetOrderShare, shareOrder } from '@/services/orders.service'
import BrandLogo from '@/components/ui/BrandLogo'
import StatusBadge from './StatusBadge'
import OrderForm from './OrderForm'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Pagination from '@/components/ui/Pagination'
import ComboboxInput from '@/components/ui/ComboboxInput'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { Plus, Zap } from 'lucide-react'
import { mediaUrl } from '@/lib/apiUrl'
import PeriodFilter from '@/components/ui/PeriodFilter'
import { Period, makePeriod, periodRange } from '@/lib/period'

function nextQuickLabel(): string {
  const n = parseInt(localStorage.getItem('_qo_seq') ?? '0') + 1
  localStorage.setItem('_qo_seq', String(n))
  return `Sürətli sifariş ${n}`
}

function QuickOrderModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warehouseItems, setWarehouseItems] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [selectedMechanicId, setSelectedMechanicId] = useState('')
  const [mechanicAmount, setMechanicAmount] = useState('')
  const loadedRef = useRef(false)

  useEffect(() => {
    if (open && !loadedRef.current) {
      loadedRef.current = true
      getProducts().then(r => setWarehouseItems(r.data)).catch(() => {})
      getMechanics().then(r => setMechanics(r.data)).catch(() => {})
    }
    if (!open) loadedRef.current = false
  }, [open])

  useEffect(() => {
    if (!selectedMechanicId) { setMechanicAmount(''); return }
    const mech = mechanics.find(m => m.id === parseInt(selectedMechanicId))
    if (mech && mech.work_percent > 0 && price) {
      setMechanicAmount(((parseFloat(price) || 0) * mech.work_percent / 100).toFixed(2))
    }
  }, [selectedMechanicId, price, mechanics])

  const filteredProducts = warehouseItems.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))

  function selectProduct(p: Product) {
    setName(p.name)
    setPrice(String(p.sell_price))
    setProductSearch(p.name)
    setShowProductDropdown(false)
  }

  function reset() {
    setName(''); setPrice(''); setError('')
    setProductSearch(''); setShowProductDropdown(false)
    setSelectedMechanicId(''); setMechanicAmount('')
  }
  function handleClose() { reset(); onClose() }

  const parsedPrice = parseFloat(price) || 0
  const parsedMechanicAmt = parseFloat(mechanicAmount) || 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const mechId = selectedMechanicId ? parseInt(selectedMechanicId) : null
      await createOrder({
        plate_number: nextQuickLabel(),
        description: name.trim(),
        status: 'pending' as const,
        services: [{
          name: name.trim(),
          price: parsedPrice,
          mechanic: mechId,
          mechanic_amount: (mechId && parsedMechanicAmt > 0) ? parsedMechanicAmt : null,
        }],
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/45">
      <div className="bg-surface rounded shadow-2xl w-full max-w-sm border border-rule">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
          <h2 className="font-serif font-semibold text-lg text-ink">Sürətli sifariş</h2>
          <button onClick={handleClose} className="text-ink-muted hover:text-ink">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-3">
          <div className="relative">
            <input
              value={productSearch}
              onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true) }}
              onFocus={() => setShowProductDropdown(true)}
              placeholder="Anbarda axtar..."
              className="input"
              autoComplete="off"
              autoFocus
            />
            {showProductDropdown && productSearch.trim() && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-surface border border-rule rounded shadow-2xl max-h-48 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <p className="px-3 py-2.5 text-sm text-ink-muted">Məhsul tapılmadı</p>
                ) : filteredProducts.map(p => (
                  <button key={p.id} type="button" onClick={() => selectProduct(p)} className="w-full px-3 py-2.5 text-left hover:bg-surface-alt border-b border-rule last:border-0 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink">{p.name}</p>
                      <p className="text-xs text-ink-muted">Stok: {p.stock_quantity}</p>
                    </div>
                    <span className="text-sm font-mono font-semibold text-accent shrink-0">{formatCurrency(p.sell_price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Məhsul / Xidmət adı" className="input" />
          <input value={price} onChange={e => setPrice(e.target.value)} required type="number" min="0.01" step="0.01" placeholder="Qiymət ₼" className="input-mono" />
          <select value={selectedMechanicId} onChange={e => setSelectedMechanicId(e.target.value)} className="input">
            <option value="">— Usta yoxdur —</option>
            {mechanics.filter(m => m.is_active).map(m => (
              <option key={m.id} value={m.id}>{m.full_name || '—'}{m.work_percent > 0 ? ` (${m.work_percent}%)` : ''}</option>
            ))}
          </select>
          {selectedMechanicId && (
            <input value={mechanicAmount} onChange={e => setMechanicAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="Usta payı ₼" className="input-mono" />
          )}
          {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saxlanılır...' : 'Saxla'}</button>
            <button type="button" onClick={handleClose} className="btn-secondary">Ləğv et</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function OrdersClient() {
  const navigate = useNavigate()
  const goBack = useGoBack('/business/orders')
  const { id } = useParams<{ id?: string }>()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [quickOpen, setQuickOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'done'>('all')
  const [period, setPeriod] = useState<Period>(() => makePeriod('all'))
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Right panel
  const [panelMode, setPanelMode] = useState<'empty' | 'view' | 'create' | 'edit'>('empty')
  const [order, setOrder] = useState<Order | null>(null)
  const [orderLoading, setOrderLoading] = useState(false)
  const [business, setBusiness] = useState<Business | null>(null)
  const [waMenuOpen, setWaMenuOpen] = useState(false)
  // Customer link (/s/<token>) for the open order; fetched on first use.
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [shareError, setShareError] = useState('')
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [mechanicsLoaded, setMechanicsLoaded] = useState(false)
  const [selectedMechanic, setSelectedMechanic] = useState('')
  const [assigningMechanic, setAssigningMechanic] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentTotal, setPaymentTotal] = useState(0)
  const [paidInput, setPaidInput] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [discountPrice, setDiscountPrice] = useState('')

  const [addProductOpen, setAddProductOpen] = useState(false)
  const [productTab, setProductTab] = useState<'warehouse' | 'new'>('warehouse')
  const [warehouseProducts, setWarehouseProducts] = useState<Product[]>([])
  const warehouseLoadedRef = useRef(false)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [qty, setQty] = useState('1')
  const [addingProduct, setAddingProduct] = useState(false)
  const [productError, setProductError] = useState('')
  const [removingProductId, setRemovingProductId] = useState<number | null>(null)
  const [returningProductId, setReturningProductId] = useState<number | null>(null)
  const [returnQty, setReturnQty] = useState('1')
  const [returnBusy, setReturnBusy] = useState(false)
  const [returnMessage, setReturnMessage] = useState('')
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [editProductSell, setEditProductSell] = useState('')
  const [editProductQty, setEditProductQty] = useState('')
  const [savingProductEdit, setSavingProductEdit] = useState(false)
  const [editProductError, setEditProductError] = useState('')
  const [newProdName, setNewProdName] = useState('')
  const [newProdPurchase, setNewProdPurchase] = useState('')
  const [newProdSell, setNewProdSell] = useState('')
  const [newProdQty, setNewProdQty] = useState('1')
  const [newProdSupplier, setNewProdSupplier] = useState('')
  const [newProdOnCredit, setNewProdOnCredit] = useState(false)
  const [stores, setStores] = useState<Store[]>([])

  const [addServiceOpen, setAddServiceOpen] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  const [newServiceMechanicId, setNewServiceMechanicId] = useState('')
  const [newServiceMechanicAmount, setNewServiceMechanicAmount] = useState('')
  const [addingService, setAddingService] = useState(false)
  const [serviceError, setServiceError] = useState('')
  const [removingServiceId, setRemovingServiceId] = useState<number | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [removingImageId, setRemovingImageId] = useState<number | null>(null)
  const [imageError, setImageError] = useState('')

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; message: string; confirmLabel: string; danger: boolean; onConfirm: () => void
  }>({ open: false, title: '', message: '', confirmLabel: 'Bəli', danger: false, onConfirm: () => {} })

  function showConfirm(opts: { title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void }) {
    setConfirmDialog({ open: true, confirmLabel: 'Bəli', danger: false, ...opts })
  }
  function closeConfirm() { setConfirmDialog(prev => ({ ...prev, open: false })) }

  // List loading
  const loadList = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const { from: start, to: end } = periodRange(period)
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
  }, [page, statusFilter, period])

  useEffect(() => { setPage(1) }, [statusFilter, period])
  useEffect(() => { loadList(page) }, [page, statusFilter, period]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { getBusinessProfile().then(res => setBusiness(res.data)).catch(() => {}) }, [])
  // A WhatsApp menu opened for one order must not stay open on the next.
  useEffect(() => { setWaMenuOpen(false); setShareUrl(null); setShareCopied(false); setShareError('') }, [order?.id])

  const toShareUrl = (token: string) => `${window.location.origin}/s/${token}`

  async function loadShareUrl(): Promise<string | null> {
    if (!order) return null
    if (shareUrl) return shareUrl
    try {
      const url = toShareUrl((await shareOrder(order.id)).data.token)
      setShareUrl(url)
      return url
    } catch (err) {
      setShareError(mapApiError(err))
      return null
    }
  }

  async function handleCopyShareLink() {
    setShareError('')
    const url = await loadShareUrl()
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      setShareError(`Kopyalamaq alınmadı. Link: ${url}`)
    }
  }

  function handleResetShareLink() {
    if (!order) return
    showConfirm({
      title: 'Linki yenilə',
      message: 'Müştəriyə əvvəl göndərilmiş link işləməyəcək. Yeni link yaradılsın?',
      confirmLabel: 'Yenilə',
      danger: true,
      onConfirm: async () => {
        closeConfirm()
        try {
          setShareUrl(toShareUrl((await resetOrderShare(order.id)).data.token))
        } catch (err) {
          setShareError(mapApiError(err))
        }
      },
    })
  }

  // Selected-order loading, driven by URL
  const loadOrder = useCallback(async () => {
    if (!id) return
    setOrderLoading(true)
    try {
      const [orderRes, mechanicsRes] = await Promise.all([
        getOrder(parseInt(id)),
        mechanicsLoaded ? Promise.resolve(null) : getMechanics().catch(() => null),
      ])
      setOrder(orderRes.data)
      setSelectedMechanic(String(orderRes.data.mechanic ?? ''))
      if (mechanicsRes) { setMechanics(mechanicsRes.data); setMechanicsLoaded(true) }
    } finally {
      setOrderLoading(false)
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (id) { setPanelMode('view'); loadOrder() }
    else if (panelMode === 'view') { setPanelMode('empty'); setOrder(null) }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getStores().then(r => setStores(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (addProductOpen && !warehouseLoadedRef.current) {
      warehouseLoadedRef.current = true
      getProducts().then(r => setWarehouseProducts(r.data)).catch(() => {})
    }
  }, [addProductOpen])

  async function ensureMechanics() {
    if (mechanicsLoaded) return
    setMechanicsLoaded(true)
    try { setMechanics((await getMechanics()).data) } catch { /* ignore */ }
  }

  // Moving between orders inside the list replaces the current history entry
  // instead of stacking one per order, so X (goBack) always leaves the detail
  // view: back to the list when opened from it, or to the page that linked
  // here (Kassa, Müştərilər, ...) otherwise.
  function selectRow(o: Order) {
    if (String(o.id) === id) return
    navigate(`/business/orders/${o.id}`, { replace: !!id })
  }
  function startCreate() {
    if (id) navigate('/business/orders', { replace: true })
    setOrder(null); setPanelMode('create')
  }
  function closePanel() {
    if (id) goBack()
    setOrder(null); setPanelMode('empty')
  }

  useEffect(() => {
    if (panelMode === 'empty') return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [panelMode]) // eslint-disable-line react-hooks/exhaustive-deps

  function onFormDone(orderId: number) {
    loadList(1); setPage(1)
    navigate(`/business/orders/${orderId}`, { replace: !!id })
  }

  async function handleAssign() {
    if (!selectedMechanic || !order) return
    setAssigningMechanic(true)
    try { await assignMechanic(order.id, parseInt(selectedMechanic)); loadOrder() } finally { setAssigningMechanic(false) }
  }

  async function handleStatus(newStatus: 'pending' | 'in_progress' | 'done') {
    if (!order) return
    if (newStatus === 'done') {
      const svcTotal = order.services?.reduce((s, t) => s + parseFloat(String(t.price)), 0) ?? 0
      const prdTotal = (order.products ?? []).reduce((s, p) => s + p.sell_price * p.quantity, 0)
      const total = svcTotal + prdTotal
      setChangingStatus(true)
      try {
        await changeOrderStatus(order.id, 'done')
        await loadOrder()
        setPaymentTotal(total); setPaidInput(total.toFixed(2)); setPaymentError('')
        setDiscountEnabled(false); setDiscountPrice(total.toFixed(2))
        setPaymentOpen(true)
      } finally { setChangingStatus(false) }
      return
    }
    setChangingStatus(true)
    try { await changeOrderStatus(order.id, newStatus); loadOrder() } finally { setChangingStatus(false) }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    setPaymentError('')
    const effectiveTotal = discountEnabled ? (parseFloat(discountPrice) || 0) : paymentTotal
    const discountAmt = paymentTotal - effectiveTotal
    setRecordingPayment(true)
    try {
      await recordPayment(order.id, parseFloat(paidInput) || 0, discountAmt > 0 ? discountAmt : undefined)
      setPaymentOpen(false)
      loadOrder()
      loadList(page)
    } catch (err) {
      setPaymentError(mapApiError(err))
    } finally {
      setRecordingPayment(false)
    }
  }

  function openPaymentPanel() {
    if (!order) return
    const grand = (order.services?.reduce((s, t) => s + parseFloat(String(t.price)), 0) ?? 0)
      + (order.products ?? []).reduce((s, p) => s + p.sell_price * p.quantity, 0)
    const effective = grand - Number(order.discount_amount ?? 0)
    const debt = effective - Number(order.paid_amount ?? 0)
    setPaymentTotal(debt); setPaidInput(debt.toFixed(2)); setPaymentError('')
    setDiscountEnabled(false); setDiscountPrice(debt.toFixed(2))
    setPaymentOpen(true)
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    setProductError('')
    setAddingProduct(true)
    try {
      await addProductToOrder(order.id, parseInt(selectedProduct), parseInt(qty))
      setSelectedProduct(''); setQty('1'); setAddProductOpen(false); loadOrder()
    } catch (err) {
      setProductError(mapApiError(err))
    } finally {
      setAddingProduct(false)
    }
  }

  async function handleAddNewProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    setProductError('')
    if (!newProdSupplier.trim()) { setProductError('Hansı mağazadan alındığını yazın.'); return }
    setAddingProduct(true)
    try {
      await purchaseProductForOrder(order.id, {
        name: newProdName.trim(),
        quantity: parseInt(newProdQty) || 1,
        purchase_price: parseFloat(newProdPurchase) || 0,
        sell_price: parseFloat(newProdSell) || 0,
        store_name: newProdSupplier.trim(),
        on_credit: newProdOnCredit,
      })
      setNewProdName(''); setNewProdPurchase(''); setNewProdSell(''); setNewProdQty('1'); setNewProdSupplier(''); setNewProdOnCredit(false)
      warehouseLoadedRef.current = false
      setAddProductOpen(false); loadOrder()
    } catch (err) {
      setProductError(mapApiError(err))
    } finally {
      setAddingProduct(false)
    }
  }

  async function handleReturnProduct(orderProductId: number) {
    if (!order) return
    setReturnBusy(true); setReturnMessage('')
    try {
      const res = await returnOrderProduct(order.id, orderProductId, parseInt(returnQty) || 0)
      const refund = Number(res.data.refund) || 0
      setReturnMessage(refund > 0
        ? `Qaytarış qeyd olundu. Müştəriyə ${formatCurrency(refund)} qaytarın — kassadan çıxdı.`
        : 'Qaytarış qeyd olundu. Müştərinin borcu azaldı.')
      setReturningProductId(null)
      loadOrder(); loadList(page)
    } catch (err) {
      setReturnMessage(mapApiError(err))
    } finally {
      setReturnBusy(false)
    }
  }

  function handleRemoveProduct(orderProductId: number) {
    if (!order) return
    showConfirm({
      title: 'Məhsulu sil', message: 'Bu məhsulu sifarişdən çıxarmaq istəyirsiniz? Stoka qaytarılacaq.', confirmLabel: 'Sil', danger: true,
      onConfirm: async () => {
        closeConfirm(); setRemovingProductId(orderProductId)
        try { await removeProductFromOrder(order.id, orderProductId); loadOrder() } finally { setRemovingProductId(null) }
      },
    })
  }

  async function handleSaveProductEdit(orderProductId: number) {
    if (!order) return
    setEditProductError('')
    const newQty = parseInt(editProductQty)
    if (!newQty || newQty < 1) { setEditProductError('Miqdar müsbət tam ədəd olmalıdır.'); return }
    setSavingProductEdit(true)
    try {
      // Only this order's line changes (quantity + its frozen sell price) —
      // the product's catalogue price and cost stay as they are.
      await updateOrderProduct(order.id, orderProductId, {
        quantity: newQty,
        ...(editProductSell !== '' ? { sell_price: parseFloat(editProductSell) } : {}),
      })
      setEditingProductId(null); loadOrder()
    } catch (err) {
      setEditProductError(mapApiError(err))
    } finally {
      setSavingProductEdit(false)
    }
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    setServiceError('')
    const price = parseFloat(newServicePrice) || 0
    const mechanicId = newServiceMechanicId ? parseInt(newServiceMechanicId) : null
    const mechanicAmt = newServiceMechanicAmount !== '' ? parseFloat(newServiceMechanicAmount) || 0 : null
    if (mechanicAmt !== null && mechanicAmt > price) { setServiceError('Usta payı işin qiymətindən çox ola bilməz.'); return }
    setAddingService(true)
    try {
      await addServiceToOrder(order.id, newServiceName.trim(), price, mechanicId, mechanicAmt)
      setNewServiceName(''); setNewServicePrice(''); setNewServiceMechanicId(''); setNewServiceMechanicAmount('')
      setAddServiceOpen(false); loadOrder()
    } catch (err) {
      setServiceError(mapApiError(err))
    } finally {
      setAddingService(false)
    }
  }

  function handleRemoveService(serviceId: number) {
    if (!order) return
    showConfirm({
      title: 'İşi sil', message: 'Bu işi sifarişdən silmək istəyirsiniz?', confirmLabel: 'Sil', danger: true,
      onConfirm: async () => {
        closeConfirm(); setRemovingServiceId(serviceId)
        try { await removeServiceFromOrder(order.id, serviceId); loadOrder() } finally { setRemovingServiceId(null) }
      },
    })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!order) return
    const file = e.target.files?.[0]
    if (!file) return
    if (imageInputRef.current) imageInputRef.current.value = ''
    setImageError('')
    if (file.size > 5 * 1024 * 1024) { setImageError('Fayl ölçüsü 5 MB-dan çox ola bilməz.'); return }
    setUploadingImage(true)
    try { await uploadOrderImage(order.id, file); loadOrder() } catch (err) { setImageError(mapApiError(err)) } finally { setUploadingImage(false) }
  }

  function handleRemoveImage(imageId: number) {
    if (!order) return
    showConfirm({
      title: 'Şəkli sil', message: 'Bu şəkli silmək istəyirsiniz?', confirmLabel: 'Sil', danger: true,
      onConfirm: async () => {
        closeConfirm(); setRemovingImageId(imageId)
        try { await deleteOrderImage(order.id, imageId); loadOrder() } finally { setRemovingImageId(null) }
      },
    })
  }

  function handleDeleteOrder() {
    if (!order) return
    showConfirm({
      title: 'Sifarişi ləğv et',
      message: 'Bu sifarişi ləğv etmək istəyirsiniz? Bütün ödəniş qeydləri maliyyədən silinəcək, anbar stoku bərpa ediləcək. Bu əməliyyat geri alına bilməz.',
      confirmLabel: 'Ləğv et', danger: true,
      onConfirm: async () => {
        closeConfirm(); setDeleting(true)
        try { await deleteOrder(order.id); loadList(1); setPage(1); closePanel() } finally { setDeleting(false) }
      },
    })
  }

  function handlePeriodChange(p: Period) { setPeriod(p); setPage(1) }
  function handleStatusFilterChange(s: typeof statusFilter) { setStatusFilter(s); setPage(1) }

  // Derived
  const servicesTotal = order?.services?.reduce((s, t) => s + parseFloat(String(t.price)), 0) ?? 0
  const orderProductsList = order?.products ?? []
  // Lines of a completed order are already in the report — change them by re-opening it or via "Qaytar".
  const linesEditable = !!order && order.payment_status !== 'paid' && order.status !== 'done'
  const productsTotal = orderProductsList.reduce((s, p) => s + p.sell_price * p.quantity, 0)
  const grandTotal = servicesTotal + productsTotal
  const effectiveOrderTotal = order ? grandTotal - Number(order.discount_amount ?? 0) : 0
  const debt = effectiveOrderTotal - Number(order?.paid_amount ?? 0)
  // Internal-only figure for the business owner — cost of parts used plus what
  // was paid out to mechanics. Never shown on the customer-facing PDF and has
  // no link to the Kassa/finance records.
  const productsExpense = orderProductsList.reduce((s, p) => s + (p.purchase_price ?? 0) * p.quantity, 0)
  const mechanicPayExpense = order?.services?.reduce((s, t) => s + (parseFloat(String(t.mechanic_amount ?? 0)) || 0), 0) ?? 0
  const netProfit = effectiveOrderTotal - productsExpense - mechanicPayExpense

  const paymentBadgeVariant = { unpaid: 'danger', partial: 'warning', paid: 'paid' } as const
  const paymentBadgeLabel = order ? {
    unpaid: 'Ödənilməyib',
    partial: `Borc: ${formatCurrency(debt)}`,
    paid: 'Ödənilib',
  }[order.payment_status ?? 'unpaid'] : ''

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="page-title">Sifarişlər</h1>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setQuickOpen(true)} className="btn-secondary">
            <Zap className="w-4 h-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Sürətli</span>
          </button>
          <button onClick={startCreate} className="btn-primary">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Yeni Sifariş</span>
          </button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-2 flex-wrap">
        {([
          { key: 'all',         label: `Hamısı · ${totalCount}` },
          { key: 'pending',     label: 'Gözləyir' },
          { key: 'in_progress', label: 'İcrada' },
          { key: 'done',        label: 'Tamamlandı' },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => handleStatusFilterChange(f.key)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold uppercase tracking-wide border transition-colors ${
              statusFilter === f.key ? 'bg-accent text-cream border-accent' : 'bg-surface text-ink-muted border-rule hover:border-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Period tabs */}
      <PeriodFilter value={period} onChange={handlePeriodChange} withAll className="mb-4" />

      {loading && orders.length === 0 && panelMode === 'empty' ? <Spinner /> : orders.length === 0 && panelMode === 'empty' ? (
        <EmptyState title="Hələ sifariş yoxdur" subtitle="Yeni sifariş yaratmaq üçün + düyməsini basın." />
      ) : (
        <div className="w-full bg-surface border border-rule rounded overflow-hidden flex flex-col lg:flex-row" style={{ maxHeight: 'calc(100vh - 230px)' }}>
          <div className={`overflow-auto ${panelMode === 'empty' ? 'w-full' : 'lg:w-[62%] lg:border-r border-rule'}`}>
            {orders.length === 0 ? (
            <div className="p-6"><EmptyState title="Hələ sifariş yoxdur" subtitle="Sağdakı formada ilk sifarişinizi yaradın." /></div>
            ) : (
            <>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th className="ledger-th">Nişan</th>
                  <th className="ledger-th">Müştəri</th>
                  <th className="ledger-th">Status</th>
                  <th className="ledger-th text-right">Məbləğ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr
                    key={o.id}
                    onClick={() => selectRow(o)}
                    className={`ledger-row ${order?.id === o.id ? 'ledger-row-selected' : ''}`}
                  >
                    <td className="ledger-td font-mono font-semibold">
                      <span className="flex items-center gap-2"><BrandLogo brand={o.car_brand} />{o.plate_number}</span>
                    </td>
                    <td className="ledger-td">
                      {[o.customer_name, o.customer_surname].filter(Boolean).join(' ') || <span className="text-ink-muted">—</span>}
                    </td>
                    <td className="ledger-td"><StatusBadge status={o.status} /></td>
                    <td className="ledger-td text-right font-mono font-semibold">
                      {o.total != null && o.total > 0 ? formatCurrency(o.total) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </>
            )}
          </div>

          {/* RIGHT PANEL — only rendered once an order is selected or being created */}
          {panelMode !== 'empty' && (
          <div className="lg:w-[38%] overflow-auto bg-cream">
            <div className="sticky top-0 z-10 flex justify-end p-2 pointer-events-none">
              <button
                onClick={closePanel}
                title="Bağla (Esc)"
                className="pointer-events-auto w-8 h-8 rounded border border-rule bg-surface text-ink-muted hover:text-ink hover:border-ink flex items-center justify-center shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {panelMode === 'create' && (
              <OrderForm onDone={onFormDone} onCancel={closePanel} />
            )}

            {panelMode === 'edit' && order && (
              <OrderForm order={order} onDone={onFormDone} onCancel={() => setPanelMode('view')} />
            )}

            {panelMode === 'view' && orderLoading && <Spinner />}

            {panelMode === 'view' && !orderLoading && order && (
              <div className="p-5 flex flex-col gap-4">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-mono font-bold text-2xl text-ink tracking-wider">{order.plate_number}</h2>
                    <StatusBadge status={order.status} />
                    {order.status === 'done' && <Badge variant={paymentBadgeVariant[order.payment_status ?? 'unpaid']}>{paymentBadgeLabel}</Badge>}
                  </div>
                  <p className="text-sm text-ink-soft">{order.car_brand} {order.car_model}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {(order.number ?? order.id) != null && <>Sifariş №{order.number ?? order.id} · </>}
                    {formatDate(order.created_at)}
                    {order.mileage != null && <> · {order.mileage.toLocaleString()} {order.mileage_unit ?? 'km'}</>}
                    {(order.mechanic_name || order.mechanic_email) ? <> · Usta: {order.mechanic_name ?? order.mechanic_email}</> : <> · <span className="text-warning">usta təyin edilməyib</span></>}
                  </p>
                  <button
                    onClick={async () => { try { await updateOrder(order.id, { has_guarantee: !order.has_guarantee }); loadOrder() } catch { /* ignore */ } }}
                    className={`mt-2 text-xs font-mono font-semibold px-2 py-1 rounded border ${order.has_guarantee ? 'border-accent text-accent bg-success-bg' : 'border-rule text-ink-muted'}`}
                  >
                    {order.has_guarantee ? 'ZƏMANƏTLİ' : 'ZƏMANƏTSİZ'}
                  </button>
                </div>

                <div className="card px-3.5 py-3">
                  <p className="section-label mb-1">Müştərinin müraciəti</p>
                  <p className="text-sm text-ink leading-relaxed">{order.description || '—'}</p>
                  {order.diagnosis && (
                    <>
                      <p className="section-label mt-3 mb-1">Diaqnostika nəticəsi</p>
                      <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{order.diagnosis}</p>
                    </>
                  )}
                </div>

                {order.status === 'done' && order.payment_status !== 'paid' && (
                  <p className="text-xs text-ink-muted bg-surface-alt border border-rule rounded px-3 py-2">
                    Sifariş tamamlanıb və hesabata yazılıb. İş və ya məhsulu dəyişmək üçün statusu "İcrada" edin; müştəri hissəni geri gətiribsə "Qaytar" düyməsini basın.
                  </p>
                )}
                {returnMessage && <p className="text-sm text-ink bg-warning-bg rounded px-3 py-2">{returnMessage}</p>}

                {/* Services */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="section-label">Xidmətlər</p>
                    {linesEditable && (
                      <button onClick={() => { setAddServiceOpen(v => !v); setServiceError(''); ensureMechanics() }} className="text-xs font-semibold text-accent hover:text-accent-hover">+ Əlavə et</button>
                    )}
                  </div>
                  {addServiceOpen && linesEditable && (
                    <form onSubmit={handleAddService} className="mb-2 border border-rule rounded p-2.5 flex flex-col gap-2">
                      <input value={newServiceName} onChange={e => setNewServiceName(e.target.value)} required placeholder="İş adı" className="input text-sm" autoFocus />
                      <div className="flex gap-2">
                        <input
                          value={newServicePrice}
                          onChange={e => {
                            setNewServicePrice(e.target.value)
                            const mech = mechanics.find(m => m.id === parseInt(newServiceMechanicId))
                            if (mech) setNewServiceMechanicAmount(((parseFloat(e.target.value) || 0) * mech.work_percent / 100).toFixed(2))
                          }}
                          type="number" min="0" step="0.01" placeholder="Qiymət ₼" className="input-mono text-sm flex-1"
                        />
                        <select
                          value={newServiceMechanicId}
                          onChange={e => {
                            setNewServiceMechanicId(e.target.value)
                            const mech = mechanics.find(m => m.id === parseInt(e.target.value))
                            if (mech && newServicePrice) setNewServiceMechanicAmount(((parseFloat(newServicePrice) || 0) * mech.work_percent / 100).toFixed(2))
                            else if (!e.target.value) setNewServiceMechanicAmount('')
                          }}
                          className="input text-sm flex-1"
                        >
                          <option value="">— Usta yoxdur</option>
                          {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name || m.id} ({m.work_percent}%)</option>)}
                        </select>
                      </div>
                      {serviceError && <p className="text-xs text-danger">{serviceError}</p>}
                      <div className="flex gap-2">
                        <button type="submit" disabled={addingService} className="btn-primary flex-1 text-sm py-1.5">{addingService ? '...' : 'Əlavə et'}</button>
                        <button type="button" onClick={() => setAddServiceOpen(false)} className="btn-secondary text-sm py-1.5 px-3">Ləğv</button>
                      </div>
                    </form>
                  )}
                  {!order.services || order.services.length === 0 ? (
                    <p className="text-sm text-ink-muted">İş qeyd edilməyib.</p>
                  ) : (
                    <div className="border border-rule rounded overflow-hidden">
                      {order.services.map((svc, i) => (
                        <div key={svc.id ?? i} className="flex items-center justify-between px-3 py-2 gap-2 border-b border-rule last:border-0 group">
                          <span className="text-sm text-ink flex-1 min-w-0 truncate">{svc.name}</span>
                          <span className="text-sm font-mono font-semibold text-ink shrink-0">{formatCurrency(parseFloat(String(svc.price)))}</span>
                          {linesEditable && (
                            <button onClick={() => svc.id && handleRemoveService(svc.id)} disabled={removingServiceId === svc.id} className="text-ink-muted hover:text-danger shrink-0">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3 py-2 bg-surface-alt">
                        <span className="section-label">Cəmi</span>
                        <span className="text-sm font-mono font-bold text-accent">{formatCurrency(servicesTotal)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Products */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="section-label">Məhsullar</p>
                    {linesEditable && (
                      <div className="flex gap-2">
                        <button onClick={() => { setAddProductOpen(v => !v); setProductTab('warehouse'); setProductError('') }} className="text-xs font-semibold text-accent hover:text-accent-hover">Anbarda var</button>
                        <button onClick={() => { setAddProductOpen(true); setProductTab('new'); setProductError('') }} className="text-xs font-semibold text-warning">Yoxdur</button>
                      </div>
                    )}
                  </div>

                  {addProductOpen && linesEditable && (
                    <div className="mb-2 border border-rule rounded p-2.5">
                      {productTab === 'warehouse' ? (
                        <form onSubmit={handleAddProduct} className="flex flex-col gap-2">
                          <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} required className="input text-sm">
                            <option value="">Seçin...</option>
                            {warehouseProducts.map(p => (
                              <option key={p.id} value={p.id} disabled={p.stock_quantity === 0}>
                                {p.name} — {p.stock_quantity > 0 ? `${p.stock_quantity} ${p.unit}, ${formatCurrency(p.sell_price)}` : 'stokda yoxdur'}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-ink-muted">Stokda olmayan hissə üçün yuxarıdakı <span className="font-semibold text-warning">"Yoxdur"</span> düyməsini basın.</p>
                          <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="1" required placeholder="Miqdar" className="input-mono text-sm" />
                          {productError && <p className="text-xs text-danger">{productError}</p>}
                          <div className="flex gap-2">
                            <button type="submit" disabled={addingProduct} className="btn-primary flex-1 text-sm py-1.5">{addingProduct ? '...' : 'Əlavə et'}</button>
                            <button type="button" onClick={() => setAddProductOpen(false)} className="btn-secondary text-sm py-1.5 px-3">Ləğv</button>
                          </div>
                        </form>
                      ) : (
                        <form onSubmit={handleAddNewProduct} className="flex flex-col gap-2">
                          <p className="text-xs text-ink-muted">Hissə indi mağazadan alınıb bu sifarişə qoyulur. Eyni adlı məhsul varsa, yenisi yaradılmır.</p>
                          <input value={newProdName} onChange={e => setNewProdName(e.target.value)} required placeholder="Məhsul adı" className="input text-sm" autoFocus />
                          <div className="flex gap-2">
                            <input value={newProdPurchase} onChange={e => setNewProdPurchase(e.target.value)} type="number" min="0" step="0.01" placeholder="Alış ₼" className="input-mono text-sm flex-1" />
                            <input value={newProdSell} onChange={e => setNewProdSell(e.target.value)} type="number" min="0" step="0.01" placeholder="Satış ₼" className="input-mono text-sm flex-1" />
                            <input value={newProdQty} onChange={e => setNewProdQty(e.target.value)} type="number" min="1" placeholder="Ədəd" className="input-mono text-sm w-16" />
                          </div>
                          <ComboboxInput value={newProdSupplier} onChange={setNewProdSupplier} options={stores.map(s => s.name)} placeholder="Mağaza (məcburi)" className="text-sm" />
                          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                            <input type="checkbox" checked={newProdOnCredit} onChange={e => setNewProdOnCredit(e.target.checked)} className="w-4 h-4" />
                            Nisyə alınıb
                            <span className="text-xs text-ink-muted">{newProdOnCredit ? '— kreditor borcu yaranacaq' : '— kassadan çıxacaq'}</span>
                          </label>
                          {productError && <p className="text-xs text-danger">{productError}</p>}
                          <div className="flex gap-2">
                            <button type="submit" disabled={addingProduct} className="btn-primary flex-1 text-sm py-1.5">{addingProduct ? '...' : 'Əlavə et'}</button>
                            <button type="button" onClick={() => setAddProductOpen(false)} className="btn-secondary text-sm py-1.5 px-3">Ləğv</button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {orderProductsList.length === 0 ? (
                    <p className="text-sm text-ink-muted">Məhsul əlavə edilməyib.</p>
                  ) : (
                    <div className="border border-rule rounded overflow-hidden">
                      {orderProductsList.map(p => (
                        <div key={p.id} className="border-b border-rule last:border-0">
                          {editingProductId === p.id ? (
                            <div className="px-3 py-2.5 bg-surface-alt flex flex-col gap-2">
                              <p className="text-sm font-medium text-ink">{p.product_name}</p>
                              <div className="flex gap-2">
                                <label className="flex flex-col gap-1 flex-1 text-xs text-ink-muted">Bu sifarişdə satış qiyməti (₼)
                                  <input value={editProductSell} onChange={e => setEditProductSell(e.target.value)} type="number" min="0" step="0.01" className="input-mono text-sm" autoFocus />
                                </label>
                                <label className="flex flex-col gap-1 w-20 text-xs text-ink-muted">Ədəd
                                  <input value={editProductQty} onChange={e => setEditProductQty(e.target.value)} type="number" min="1" className="input-mono text-sm" />
                                </label>
                              </div>
                              <p className="text-xs text-ink-muted">Qiymət yalnız bu sifarişdə dəyişir. Miqdar artsa, fərq stokdan çıxılır; azalsa, stoka qayıdır.</p>
                              {editProductError && <p className="text-xs text-danger">{editProductError}</p>}
                              <div className="flex gap-2">
                                <button onClick={() => handleSaveProductEdit(p.id)} disabled={savingProductEdit} className="btn-primary text-xs py-1.5 flex-1">{savingProductEdit ? '...' : 'Saxla'}</button>
                                <button onClick={() => setEditingProductId(null)} className="btn-secondary text-xs py-1.5 px-3">Ləğv</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between px-3 py-2 gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-ink truncate">{p.product_name}</p>
                                {p.source === 'customer'
                                  ? <p className="text-xs text-ink-muted font-mono">{p.quantity} ədəd</p>
                                  : <p className="text-xs text-ink-muted font-mono">{p.quantity} × {formatCurrency(p.sell_price)}</p>}
                              </div>
                              {p.source === 'customer'
                                ? <span className="text-xs font-semibold text-ink-muted bg-surface-alt border border-rule rounded px-1.5 py-0.5 shrink-0">Müştəri gətirib</span>
                                : <span className="text-sm font-mono font-semibold text-ink shrink-0">{formatCurrency(p.sell_price * p.quantity)}</span>}
                              {order.status === 'done' && p.source !== 'customer' && (
                                <button
                                  onClick={() => { setReturningProductId(returningProductId === p.id ? null : p.id); setReturnQty('1'); setReturnMessage('') }}
                                  className="text-xs font-semibold text-warning hover:underline shrink-0"
                                >
                                  Qaytar
                                </button>
                              )}
                              {linesEditable && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {p.source !== 'customer' && <button
                                    onClick={() => {
                                      setEditingProductId(p.id)
                                      setEditProductSell(String(p.sell_price)); setEditProductQty(String(p.quantity)); setEditProductError('')
                                    }}
                                    className="text-ink-muted hover:text-accent"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  </button>}
                                  <button onClick={() => handleRemoveProduct(p.id)} disabled={removingProductId === p.id} className="text-ink-muted hover:text-danger">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          {returningProductId === p.id && (
                            <form onSubmit={e => { e.preventDefault(); handleReturnProduct(p.id) }} className="px-3 pb-2.5 flex flex-col gap-1.5 bg-warning-bg/40">
                              <p className="text-xs text-ink-soft pt-2">Müştəri neçə ədədi geri gətirib? Hissə stoka qayıdır, hesabatdan çıxılır; artıq ödənilmiş məbləğ kassadan qaytarılır.</p>
                              <div className="flex gap-2">
                                <input type="number" min={1} max={p.quantity} value={returnQty} onChange={e => setReturnQty(e.target.value)} className="input-mono text-sm w-20" />
                                <button type="submit" disabled={returnBusy} className="btn-primary text-xs py-1.5 flex-1">{returnBusy ? '...' : 'Qaytarışı qeyd et'}</button>
                                <button type="button" onClick={() => setReturningProductId(null)} className="btn-secondary text-xs py-1.5 px-3">Ləğv</button>
                              </div>
                            </form>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3 py-2 bg-surface-alt">
                        <span className="section-label">Cəmi</span>
                        <span className="text-sm font-mono font-bold text-accent">{formatCurrency(productsTotal)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Images */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="section-label">Şəkillər {order.images && order.images.length > 0 ? `(${order.images.length}/3)` : ''}</p>
                    {order.payment_status !== 'paid' && (order.images?.length ?? 0) < 3 && (
                      <>
                        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        <button onClick={() => { setImageError(''); imageInputRef.current?.click() }} disabled={uploadingImage} className="text-xs font-semibold text-accent hover:text-accent-hover disabled:opacity-50">
                          {uploadingImage ? 'Yüklənir...' : '+ Şəkil'}
                        </button>
                      </>
                    )}
                  </div>
                  {imageError && <p className="text-xs text-danger mb-2">{imageError}</p>}
                  {!order.images || order.images.length === 0 ? (
                    <p className="text-sm text-ink-muted">Şəkil əlavə edilməyib.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {order.images.map(img => (
                        <div key={img.id} className="relative w-16 h-16 rounded overflow-hidden border border-rule group shrink-0">
                          <a href={mediaUrl(img.image)} target="_blank" rel="noreferrer">
                            <img src={mediaUrl(img.image)} alt="Şəkil" className="w-full h-full object-cover" />
                          </a>
                          {order.payment_status !== 'paid' && (
                            <button onClick={() => handleRemoveImage(img.id)} disabled={removingImageId === img.id} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-ink/70 text-cream flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="bg-warning-bg border border-warning/30 rounded px-3.5 py-3">
                    <p className="section-label text-warning mb-1">Əlavə qeydlər</p>
                    <p className="text-sm text-ink leading-relaxed">{order.notes}</p>
                  </div>
                )}

                {order.recommendations && (
                  <div className="card px-3.5 py-3">
                    <p className="section-label mb-1">Tövsiyə olunan işlər</p>
                    <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{order.recommendations}</p>
                  </div>
                )}

                {/* Grand total */}
                <div className="bg-accent rounded px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wide text-cream/70">Ümumi məbləğ</p>
                    {Number(order.discount_amount ?? 0) > 0 && <p className="text-xs text-cream/70 line-through">{formatCurrency(grandTotal)}</p>}
                    {order.payment_status === 'partial' && <p className="text-xs text-cream/70">Ödənilən: {formatCurrency(Number(order.paid_amount))} · Borc: {formatCurrency(debt)}</p>}
                  </div>
                  <span className="text-xl font-mono font-bold text-cream">{formatCurrency(effectiveOrderTotal)}</span>
                </div>

                {/* Net profit — business owner only, never printed on the customer PDF */}
                <div className="bg-surface-alt rounded px-4 py-2.5 flex items-center justify-between">
                  <p className="text-xs font-mono uppercase tracking-wide text-ink-muted">Xalis mənfəət</p>
                  <span className="text-sm font-mono font-bold text-ink">{formatCurrency(netProfit)}</span>
                </div>

                {/* Payment action */}
                {order.status === 'done' && order.payment_status !== 'paid' && (
                  <button onClick={openPaymentPanel} className="btn-primary">Ödəniş qeyd et</button>
                )}

                {order.payment_status === 'paid' && (
                  <div className="bg-success-bg border border-accent/30 rounded px-3.5 py-3">
                    <p className="text-sm font-semibold text-accent">Bu sifariş tam ödənilib və bağlanıb.</p>
                  </div>
                )}

                {/* Mechanic assign & status */}
                {order.payment_status !== 'paid' && (
                  <>
                    <div className="card p-3.5">
                      <p className="section-label mb-2">Usta təyin et</p>
                      <select value={selectedMechanic} onChange={e => setSelectedMechanic(e.target.value)} onFocus={ensureMechanics} className="input text-sm mb-2">
                        <option value="">Seçilməyib</option>
                        {mechanics.filter(m => m.is_active).map(m => <option key={m.id} value={m.id}>{m.full_name ?? m.phone}</option>)}
                      </select>
                      <button onClick={handleAssign} disabled={assigningMechanic || !selectedMechanic} className="btn-primary w-full text-sm">{assigningMechanic ? 'Saxlanılır...' : 'Təyin et'}</button>
                    </div>
                    <div className="card p-3.5">
                      <p className="section-label mb-2">Status dəyiş</p>
                      <div className="flex flex-col gap-1.5">
                        {([{ value: 'pending', label: 'Gözləyir' }, { value: 'in_progress', label: 'İcrada' }, { value: 'done', label: 'Tamamlandı' }] as const).map(s => (
                          <button
                            key={s.value}
                            onClick={() => handleStatus(s.value)}
                            disabled={changingStatus || order.status === s.value}
                            className={`py-2 px-3 rounded text-sm text-left border ${order.status === s.value ? 'bg-surface-alt border-accent text-accent' : 'border-rule text-ink-muted hover:border-ink'}`}
                          >
                            {s.label}{order.status === s.value && ' ✓'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap pt-1">
                  <button
                    disabled={generatingPdf}
                    onClick={async () => { setGeneratingPdf(true); try { await printOrderPDF(order, business) } finally { setGeneratingPdf(false) } }}
                    className="btn-secondary text-sm flex-1"
                  >
                    {generatingPdf ? 'Hazırlanır...' : 'PDF'}
                  </button>
                  <button
                    onClick={() => { if (!waMenuOpen) loadShareUrl(); setWaMenuOpen(v => !v) }}
                    disabled={!hasWhatsAppNumber(order.customer_phone)}
                    title={hasWhatsAppNumber(order.customer_phone) ? undefined : 'Telefon nömrəsi yoxdur'}
                    className="btn-secondary text-sm flex-1"
                  >
                    WhatsApp
                  </button>
                  <button onClick={handleCopyShareLink} className="btn-secondary text-sm flex-1" title="Müştəri üçün sifariş linkini kopyala">
                    {shareCopied ? 'Kopyalandı ✓' : 'Link'}
                  </button>
                  {linesEditable && (
                    <button onClick={() => setPanelMode('edit')} className="btn-secondary text-sm flex-1">Düzəlt</button>
                  )}
                  <button onClick={handleDeleteOrder} disabled={deleting} className="btn-danger text-sm flex-1">{deleting ? '...' : 'Ləğv et'}</button>
                </div>
                {shareError && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{shareError}</p>}
                {waMenuOpen && order.customer_phone && business && (() => {
                  const phone = order.customer_phone
                  const due = Number(order.amount_due ?? 0)
                  const options = [
                    order.status === 'done' && { label: 'Maşın hazırdır', text: carReadyMessage(order, business) },
                    order.status === 'done' && due > 0 && {
                      label: `Borc xatırlatması (${formatCurrency(due)})`,
                      text: debtReminderMessage({ customer_name: order.customer_name, plate_number: order.plate_number, amount: due }, business),
                    },
                    shareUrl && { label: 'Qaimə linki', text: orderLinkMessage(order, shareUrl, business) },
                    { label: 'Mətnsiz yaz', text: undefined },
                  ].filter((o): o is { label: string; text: string | undefined } => !!o)
                  return (
                    <div className="card p-2 flex flex-col gap-1">
                      {options.map(o => (
                        <a
                          key={o.label}
                          href={whatsappLink(phone, o.text)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => setWaMenuOpen(false)}
                          className="px-3 py-2 rounded text-sm text-ink hover:bg-surface-alt"
                        >
                          {o.label}
                        </a>
                      ))}
                      <p className="px-3 pt-1 text-xs text-ink-muted">WhatsApp mətnlə açılır — göndərməzdən əvvəl düzəldə bilərsiniz.</p>
                      {shareUrl && (
                        <button onClick={handleResetShareLink} className="px-3 pt-1 text-left text-xs text-ink-muted hover:text-danger underline">
                          Linki yenilə (köhnə link işləməyəcək)
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
          )}
        </div>
      )}

      <QuickOrderModal open={quickOpen} onClose={() => setQuickOpen(false)} onCreated={() => { setPage(1); loadList(1) }} />

      {/* Payment popup — shown automatically when an order is marked Tamamlandı, or via "Ödəniş qeyd et" */}
      {paymentOpen && order && (() => {
        const effectiveTotal = discountEnabled ? Math.max(0, parseFloat(discountPrice) || 0) : paymentTotal
        const discountAmt = paymentTotal - effectiveTotal
        const paid = parseFloat(paidInput) || 0
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/45">
            <div className="bg-surface rounded shadow-2xl w-full max-w-sm border border-rule">
              <div className="px-5 py-4 border-b border-rule">
                <h2 className="font-serif font-semibold text-lg text-ink">Ödəniş qeydi</h2>
                <p className="text-sm text-ink-muted mt-0.5">Sifariş tamamlandı. Ödəniş vəziyyətini qeyd edin.</p>
              </div>
              <form onSubmit={handleRecordPayment} className="px-5 py-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm bg-surface-alt rounded px-3 py-2.5">
                  <span className="text-ink-muted">Ümumi məbləğ</span>
                  <span className={`font-mono font-semibold ${discountEnabled && discountAmt > 0 ? 'line-through text-ink-muted' : 'text-ink'}`}>{formatCurrency(paymentTotal)}</span>
                </div>
                <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
                  <input type="checkbox" checked={discountEnabled} onChange={e => { setDiscountEnabled(e.target.checked); setPaidInput(e.target.checked ? discountPrice : paymentTotal.toFixed(2)) }} className="w-4 h-4 accent-accent" />
                  Endirimli qiymət
                </label>
                {discountEnabled && (
                  <div>
                    <p className="label">Yeni qiymət (endirimli)</p>
                    <input type="number" min="0.01" max={paymentTotal - 0.01} step="0.01" value={discountPrice} onChange={e => { setDiscountPrice(e.target.value); setPaidInput(e.target.value) }} className="input-mono text-lg" autoFocus />
                    {discountAmt > 0 && (
                      <div className="flex items-center justify-between bg-surface-alt rounded px-3 py-2 mt-2">
                        <span className="text-sm text-ink-muted font-medium">Endirim məbləği</span>
                        <span className="text-sm font-mono font-bold text-accent">-{formatCurrency(discountAmt)}</span>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <p className="label">Ödənilən məbləğ</p>
                  <input type="number" min="0" max={effectiveTotal} step="0.01" value={paidInput} onChange={e => setPaidInput(e.target.value)} className="input-mono text-lg" autoFocus={!discountEnabled} />
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => setPaidInput('0')} className="text-xs px-2.5 py-1.5 rounded border border-rule text-ink-muted hover:bg-surface-alt">Borc</button>
                    <button type="button" onClick={() => setPaidInput((effectiveTotal / 2).toFixed(2))} className="text-xs px-2.5 py-1.5 rounded border border-rule text-ink-muted hover:bg-surface-alt">Yarısı</button>
                    <button type="button" onClick={() => setPaidInput(effectiveTotal.toFixed(2))} className="text-xs px-2.5 py-1.5 rounded border border-rule text-ink-muted hover:bg-surface-alt">Tam</button>
                  </div>
                </div>
                {paid < effectiveTotal && paid >= 0 && (
                  <div className="flex items-center justify-between bg-warning-bg rounded px-3 py-2">
                    <span className="text-sm text-warning font-medium">Borc qalır</span>
                    <span className="text-sm font-mono font-bold text-warning">{formatCurrency(effectiveTotal - paid)}</span>
                  </div>
                )}
                {paid >= effectiveTotal && (
                  <div className="flex items-center gap-2 bg-success-bg rounded px-3 py-2">
                    <span className="text-sm text-accent font-medium">Tam ödənilib</span>
                  </div>
                )}
                {paymentError && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{paymentError}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={recordingPayment} className="btn-primary flex-1">{recordingPayment ? 'Saxlanılır...' : 'Qeyd et'}</button>
                  <button type="button" onClick={() => setPaymentOpen(false)} className="btn-secondary">Sonra</button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </>
  )
}
