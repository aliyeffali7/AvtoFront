import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Link2, MessageCircle, Pencil, Printer, RefreshCw, Wallet, Wrench, X, XCircle } from 'lucide-react'
import { useGoBack } from '@/lib/useGoBack'
import { Order, OrderService, Mechanic, Product, Business, Store, ServiceTemplate } from '@/types'
import {
  getOrder, assignMechanic, changeOrderStatus,
  addProductToOrder, removeProductFromOrder, updateOrderProduct, purchaseProductForOrder, returnOrderProduct,
  addServiceToOrder, updateOrderService, removeServiceFromOrder, getServiceTemplates,
  recordPayment, updateOrder, deleteOrder,
  uploadOrderImage, deleteOrderImage,
  resetOrderShare, shareOrder,
} from '@/services/orders.service'
import { getMechanics } from '@/services/mechanics.service'
import ServiceTemplatePicker from '@/components/orders/ServiceTemplatePicker'
import { getProducts } from '@/services/warehouse.service'
import { getStores } from '@/services/stores.service'
import { getBusinessProfile } from '@/services/auth.service'
import { formatDate, formatCurrency, formatPhone, mapApiError } from '@/lib/utils'
import { printOrderPDF } from '@/lib/serviceActPdf'
import { carReadyMessage, debtReminderMessage, hasWhatsAppNumber, orderLinkMessage, whatsappLink } from '@/lib/whatsapp'
import { mediaUrl } from '@/lib/apiUrl'
import BrandLogo from '@/components/ui/BrandLogo'
import UiStatusBadge from '@/components/ui/StatusBadge'
import Plate from '@/components/ui/Plate'
import Money from '@/components/ui/Money'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import BoughtNowRemoveModal, { BoughtNowAction, BoughtNowMode, BoughtNowPart } from '@/components/orders/BoughtNowRemoveModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ComboboxInput from '@/components/ui/ComboboxInput'
import Spinner from '@/components/ui/Spinner'
import StatusBadge from './StatusBadge'
import OrderForm from './OrderForm'

const PAYMENT_WORD = { unpaid: 'Ödənilməyib', partial: 'Qismən ödənilib', paid: 'Ödənilib' } as const

function SectionCard({ title, action, children, tone }: { title: string; action?: React.ReactNode; children: React.ReactNode; tone?: 'warning' }) {
  return (
    <section className={`card p-5 ${tone === 'warning' ? '!bg-warning-subtle !border-warning/30' : ''}`}>
      <div className="flex items-center justify-between gap-3 mb-3 min-h-[20px]">
        <h2 className={`section-label ${tone === 'warning' ? '!text-warning-strong' : ''}`}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

type ServiceValues = { name: string; price: string; mechanicId: string; mechanicAmount: string; templateId: string }

/** Add / edit one job: name, price, usta and usta payı (pre-filled from the
 * mechanic's percent, editable by the owner). */
function ServiceForm({ initial, mechanics, templates, submitLabel, loading, error, onSubmit, onCancel }: {
  initial: ServiceValues
  mechanics: Mechanic[]
  templates: ServiceTemplate[]
  submitLabel: string
  loading: boolean
  error: string
  onSubmit: (v: ServiceValues) => void
  onCancel: () => void
}) {
  const [v, setV] = useState<ServiceValues>(initial)
  const percentAmount = (price: string, mechanicId: string) => {
    const mech = mechanics.find(m => m.id === parseInt(mechanicId))
    return mech && parseFloat(price) > 0 ? (parseFloat(price) * mech.work_percent / 100).toFixed(2) : null
  }
  // A job picked from "Hazır işlər" keeps its fixed usta payı: changing the
  // price or the mechanic never recalculates it from the mechanic's percent.
  const fixedPay = v.templateId !== ''
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(v) }} className="mb-3 border border-border rounded-lg p-3 flex flex-col gap-2 bg-paper">
      <ServiceTemplatePicker
        templates={templates}
        onPick={t => setV({ ...v, name: t.name, price: String(t.price), mechanicAmount: String(t.mechanic_amount), templateId: String(t.id) })}
      />
      <input value={v.name} onChange={e => setV({ ...v, name: e.target.value })} required placeholder="İş adı" aria-label="İş adı" className="input" autoFocus />
      <div className="flex gap-2 flex-wrap">
        <input
          value={v.price}
          onChange={e => {
            const amount = fixedPay ? null : percentAmount(e.target.value, v.mechanicId)
            setV({ ...v, price: e.target.value, mechanicAmount: amount ?? v.mechanicAmount })
          }}
          type="number" min="0" step="0.01" placeholder="Qiymət ₼" aria-label="Qiymət" className="input-mono flex-1 min-w-[120px]"
        />
        <select
          value={v.mechanicId}
          onChange={e => {
            const amount = fixedPay ? null : percentAmount(v.price, e.target.value)
            setV({ ...v, mechanicId: e.target.value, mechanicAmount: fixedPay ? v.mechanicAmount : e.target.value ? (amount ?? v.mechanicAmount) : '' })
          }}
          aria-label="Usta"
          className="input flex-1 min-w-[160px]"
        >
          <option value="">— Usta yoxdur</option>
          {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name || m.id} ({m.work_percent}%)</option>)}
        </select>
      </div>
      {(v.mechanicId || fixedPay) && (
        <div className="flex items-center gap-2">
          <span className="label !mb-0 shrink-0">Usta payı</span>
          <input value={v.mechanicAmount} onChange={e => setV({ ...v, mechanicAmount: e.target.value })} type="number" min="0" step="0.01" placeholder="0.00" aria-label="Usta payı" className="input-mono" />
          {fixedPay && <span className="text-small text-text-3">Hazır iş — sabit pay</span>}
        </div>
      )}
      {error && <p className="text-small text-danger">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Ləğv</Button>
        <Button type="submit" size="sm" loading={loading}>{submitLabel}</Button>
      </div>
    </form>
  )
}

/** Owner view: who does the job and the mechanic's share. */
function ServiceMechanicLine({ svc }: { svc: OrderService }) {
  if (!svc.mechanic) return <p className="text-small text-text-3">Usta təyin edilməyib</p>
  return (
    <p className="text-small text-text-3 flex flex-wrap items-center gap-x-1.5">
      <span>Usta: <span className="text-text-2 font-medium">{svc.mechanic_name || '—'}</span></span>
      <span aria-hidden>·</span>
      <span>Usta payı: <Money value={Number(svc.mechanic_amount ?? 0)} className="!text-small !font-medium" /></span>
    </p>
  )
}

const LINK_BTN = 'text-small font-semibold text-ink hover:underline underline-offset-2'

/** Full-page order: lines, photos, notes on the left, bill + info + actions on the right. */
export default function OrderDetailClient() {
  const navigate = useNavigate()
  const goBack = useGoBack('/business/orders')
  const { id } = useParams<{ id: string }>()

  const [order, setOrder] = useState<Order | null>(null)
  const [orderLoading, setOrderLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [business, setBusiness] = useState<Business | null>(null)
  const [waMenuOpen, setWaMenuOpen] = useState(false)
  // Customer link (/s/<token>) for the open order; fetched on first use.
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [shareError, setShareError] = useState('')
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [templates, setTemplates] = useState<ServiceTemplate[]>([])
  const [templatesLoaded, setTemplatesLoaded] = useState(false)
  const [mechanicsLoaded, setMechanicsLoaded] = useState(false)
  const [selectedMechanic, setSelectedMechanic] = useState('')
  const [assigningMechanic, setAssigningMechanic] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
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
  // The "bought for this order" question: what it is about and what to run with the answer.
  const [boughtAsk, setBoughtAsk] = useState<{ mode: BoughtNowMode; parts: BoughtNowPart[]; run: (action: BoughtNowAction) => Promise<void> } | null>(null)
  const [boughtBusy, setBoughtBusy] = useState(false)
  const [boughtRemoveError, setBoughtRemoveError] = useState('')
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
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null)
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

  const loadOrder = useCallback(async () => {
    if (!id) return
    setOrderLoading(true)
    setLoadError(false)
    try {
      const [orderRes, mechanicsRes] = await Promise.all([
        getOrder(parseInt(id)),
        mechanicsLoaded ? Promise.resolve(null) : getMechanics().catch(() => null),
      ])
      setOrder(orderRes.data)
      setSelectedMechanic(String(orderRes.data.mechanic ?? ''))
      if (mechanicsRes) { setMechanics(mechanicsRes.data); setMechanicsLoaded(true) }
    } catch {
      setLoadError(true)
    } finally {
      setOrderLoading(false)
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setEditing(false); loadOrder() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getStores().then(r => setStores(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (addProductOpen && !warehouseLoadedRef.current) {
      warehouseLoadedRef.current = true
      getProducts().then(r => setWarehouseProducts(r.data)).catch(() => {})
    }
  }, [addProductOpen])

  async function ensureTemplates() {
    if (templatesLoaded) return
    setTemplatesLoaded(true)
    try { setTemplates((await getServiceTemplates()).data) } catch { /* picker stays hidden */ }
  }

  async function ensureMechanics() {
    if (mechanicsLoaded) return
    setMechanicsLoaded(true)
    try { setMechanics((await getMechanics()).data) } catch { /* ignore */ }
  }

  async function handleAssign() {
    if (!selectedMechanic || !order) return
    setAssigningMechanic(true)
    try { await assignMechanic(order.id, parseInt(selectedMechanic)); setAssignOpen(false); loadOrder() } finally { setAssigningMechanic(false) }
  }

  async function handleStatus(newStatus: 'pending' | 'in_progress' | 'done') {
    if (!order) return
    setStatusOpen(false)
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
    const owed = effective - Number(order.paid_amount ?? 0)
    setPaymentTotal(owed); setPaidInput(owed.toFixed(2)); setPaymentError('')
    setDiscountEnabled(false); setDiscountPrice(owed.toFixed(2))
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
      loadOrder()
    } catch (err) {
      setReturnMessage(mapApiError(err))
    } finally {
      setReturnBusy(false)
    }
  }

  function handleRemoveProduct(orderProductId: number) {
    if (!order) return
    const line = order.products.find(x => x.id === orderProductId)
    if (line && (line.bought_now_quantity ?? 0) > 0) {
      setBoughtRemoveError('')
      setBoughtAsk({
        mode: 'remove',
        parts: [{ name: line.product_name, quantity: line.bought_now_quantity ?? line.quantity, supplier: line.bought_now_supplier }],
        run: async action => { await removeProductFromOrder(order.id, line.id, action); setBoughtAsk(null); loadOrder() },
      })
      return
    }
    showConfirm({
      title: 'Məhsulu sil', message: 'Bu məhsulu sifarişdən çıxarmaq istəyirsiniz? Stoka qaytarılacaq.', confirmLabel: 'Sil', danger: true,
      onConfirm: async () => {
        closeConfirm(); setRemovingProductId(orderProductId)
        try { await removeProductFromOrder(order.id, orderProductId); loadOrder() } finally { setRemovingProductId(null) }
      },
    })
  }

  async function handleBoughtChoose(action: BoughtNowAction) {
    if (!boughtAsk) return
    setBoughtBusy(true)
    setBoughtRemoveError('')
    try {
      await boughtAsk.run(action)
    } catch (err) {
      setBoughtRemoveError(mapApiError(err))
    } finally {
      setBoughtBusy(false)
    }
  }

  async function handleSaveProductEdit(orderProductId: number) {
    if (!order) return
    setEditProductError('')
    const newQty = parseInt(editProductQty)
    const line = order.products.find(x => x.id === orderProductId)
    if (Number.isNaN(newQty) || newQty < 0) { setEditProductError('Miqdar tam ədəd olmalıdır (0 = sətri çıxar).'); return }
    if (newQty === 0) {
      // Reducing to nothing is removing the line — same flow (and question) as the bin button.
      setEditingProductId(null)
      handleRemoveProduct(orderProductId)
      return
    }
    const removed = line ? line.quantity - newQty : 0
    const bought = line?.bought_now_quantity ?? 0
    // Ordinary-stock units go first; only what eats into the bought-now ones needs the question.
    const boughtRemoved = line ? Math.min(bought, Math.max(removed - Math.max(line.quantity - bought, 0), 0)) : 0
    if (line && boughtRemoved > 0) {
      setBoughtRemoveError('')
      setBoughtAsk({
        mode: 'reduce',
        parts: [{ name: line.product_name, quantity: boughtRemoved, supplier: line.bought_now_supplier }],
        run: async action => {
          await updateOrderProduct(order.id, orderProductId, {
            quantity: newQty,
            ...(editProductSell !== '' ? { sell_price: parseFloat(editProductSell) } : {}),
            bought_now_action: action,
          })
          setBoughtAsk(null); setEditingProductId(null); loadOrder()
        },
      })
      return
    }
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

  async function submitService(v: ServiceValues, serviceId?: number) {
    if (!order) return
    setServiceError('')
    const price = parseFloat(v.price) || 0
    const mechanicId = v.mechanicId ? parseInt(v.mechanicId) : null
    const mechanicAmt = (mechanicId !== null || v.templateId !== '') && v.mechanicAmount !== '' ? parseFloat(v.mechanicAmount) || 0 : null
    if (mechanicAmt !== null && mechanicAmt > price) { setServiceError('Usta payı işin qiymətindən çox ola bilməz.'); return }
    const templateId = v.templateId ? parseInt(v.templateId) : null
    setAddingService(true)
    try {
      if (serviceId !== undefined) await updateOrderService(order.id, serviceId, { name: v.name.trim(), price, mechanic: mechanicId, mechanic_amount: mechanicAmt, template: templateId })
      else await addServiceToOrder(order.id, v.name.trim(), price, mechanicId, mechanicAmt, templateId)
      setAddServiceOpen(false); setEditingServiceId(null); loadOrder()
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
    const boughtLines = order.products.filter(x => (x.bought_now_quantity ?? 0) > 0)
    if (boughtLines.length > 0) {
      setBoughtRemoveError('')
      setBoughtAsk({
        mode: 'order',
        parts: boughtLines.map(x => ({ name: x.product_name, quantity: x.bought_now_quantity ?? 0, supplier: x.bought_now_supplier })),
        run: async action => {
          setDeleting(true)
          try { await deleteOrder(order.id, action) } finally { setDeleting(false) }
          navigate('/business/orders', { replace: true })
        },
      })
      return
    }
    showConfirm({
      title: 'Sifarişi ləğv et',
      message: 'Bu sifarişi ləğv etmək istəyirsiniz? Bütün ödəniş qeydləri maliyyədən silinəcək, anbar stoku bərpa ediləcək. Bu əməliyyat geri alına bilməz.',
      confirmLabel: 'Ləğv et', danger: true,
      onConfirm: async () => {
        closeConfirm(); setDeleting(true)
        try { await deleteOrder(order.id); navigate('/business/orders', { replace: true }) } finally { setDeleting(false) }
      },
    })
  }

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

  const backLink = (
    <button type="button" onClick={goBack} className="btn-ghost !min-h-[36px] !px-2 -ml-2 self-start text-text-2">
      <ArrowLeft size={18} strokeWidth={1.75} /> Sifarişlər
    </button>
  )

  if (orderLoading && !order) {
    return <div className="flex flex-col gap-4">{backLink}<Spinner /></div>
  }
  if (!order) {
    return (
      <div className="flex flex-col gap-4">
        {backLink}
        <div className="card p-8 text-center text-text-3">{loadError ? 'Sifariş tapılmadı və ya yüklənmədi.' : '—'}</div>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-4">
        {backLink}
        <OrderForm
          order={order}
          onDone={() => { setEditing(false); loadOrder() }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  const customerName = [order.customer_name, order.customer_surname].filter(Boolean).join(' ')
  const orderNo = order.number ?? order.id
  const mechanicName = order.mechanic_name ?? order.mechanic_email
  const due = Number(order.amount_due ?? 0)

  return (
    <div className="flex flex-col gap-4">
      {backLink}

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="page-title">Sifariş <span className="font-mono">№{orderNo}</span></h1>
        <StatusBadge status={order.status} />
        {order.status === 'done' && <UiStatusBadge status={PAYMENT_WORD[order.payment_status ?? 'unpaid']} />}
        <span className="text-small text-text-3 font-mono">{formatDate(order.created_at)}</span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        {/* LEFT */}
        <div className="flex flex-col gap-4 min-w-0">
          <SectionCard title="Müştərinin müraciəti">
            <p className="text-body text-text-2 whitespace-pre-line">{order.description || '—'}</p>
          </SectionCard>

          {order.diagnosis && (
            <SectionCard title="Diaqnostika nəticəsi">
              <p className="text-body text-text-2 whitespace-pre-line">{order.diagnosis}</p>
            </SectionCard>
          )}

          {order.status === 'done' && order.payment_status !== 'paid' && (
            <p className="text-small text-text-2 bg-surface-2 border border-border rounded-lg px-4 py-3">
              Sifariş tamamlanıb və hesabata yazılıb. İş və ya məhsulu dəyişmək üçün statusu "İcrada" edin; müştəri hissəni geri gətiribsə "Qaytar" düyməsini basın.
            </p>
          )}
          {returnMessage && <p className="text-body text-text-1 bg-warning-subtle border border-warning/30 rounded-lg px-4 py-3">{returnMessage}</p>}

          {/* Services */}
          <SectionCard
            title="Xidmətlər"
            action={linesEditable && (
              <button onClick={() => { setAddServiceOpen(v => !v); setEditingServiceId(null); setServiceError(''); ensureMechanics(); ensureTemplates() }} className={LINK_BTN}>+ Əlavə et</button>
            )}
          >
            {addServiceOpen && linesEditable && (
              <ServiceForm
                initial={{ name: '', price: '', mechanicId: '', mechanicAmount: '', templateId: '' }}
                mechanics={mechanics} templates={templates} submitLabel="Əlavə et" loading={addingService} error={serviceError}
                onSubmit={v => submitService(v)} onCancel={() => setAddServiceOpen(false)}
              />
            )}
            {!order.services || order.services.length === 0 ? (
              <p className="text-body text-text-3">İş qeyd edilməyib.</p>
            ) : (
              <div>
                {order.services.map((svc, i) => (
                  editingServiceId !== null && editingServiceId === svc.id ? (
                    <ServiceForm
                      key={svc.id}
                      initial={{ name: svc.name, price: String(svc.price), mechanicId: svc.mechanic ? String(svc.mechanic) : '', mechanicAmount: svc.mechanic_amount != null ? String(svc.mechanic_amount) : '', templateId: svc.template ? String(svc.template) : '' }}
                      mechanics={mechanics} templates={[]} submitLabel="Saxla" loading={addingService} error={serviceError}
                      onSubmit={v => submitService(v, svc.id)} onCancel={() => setEditingServiceId(null)}
                    />
                  ) : (
                    <div key={svc.id ?? i} className="flex items-center justify-between py-2.5 gap-3 border-b border-border">
                      <div className="min-w-0 flex-1">
                        <p className="text-body text-text-1">{svc.name}</p>
                        <ServiceMechanicLine svc={svc} />
                      </div>
                      <Money value={parseFloat(String(svc.price))} />
                      {linesEditable && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            aria-label="Düzəlt"
                            onClick={() => { setEditingServiceId(svc.id ?? null); setServiceError(''); setAddServiceOpen(false); ensureMechanics() }}
                            className="text-text-3 hover:text-ink"
                          >
                            <Pencil size={16} strokeWidth={1.75} />
                          </button>
                          <button onClick={() => svc.id && handleRemoveService(svc.id)} disabled={removingServiceId === svc.id} aria-label="Sil" className="text-text-3 hover:text-danger">
                            <X size={16} strokeWidth={1.75} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                ))}
                <div className="flex items-center justify-between pt-3">
                  <span className="section-label">Cəmi</span>
                  <Money value={servicesTotal} className="text-body-l" />
                </div>
              </div>
            )}
          </SectionCard>

          {/* Products */}
          <SectionCard
            title="Məhsullar"
            action={linesEditable && (
              <div className="flex gap-4">
                <button onClick={() => { setAddProductOpen(v => !v); setProductTab('warehouse'); setProductError('') }} className={LINK_BTN}>Anbarda var</button>
                <button onClick={() => { setAddProductOpen(true); setProductTab('new'); setProductError('') }} className="text-small font-semibold text-warning-strong hover:underline underline-offset-2">Anbarda yoxdur</button>
              </div>
            )}
          >
            {addProductOpen && linesEditable && (
              <div className="mb-3 border border-border rounded-lg p-3 bg-paper">
                {productTab === 'warehouse' ? (
                  <form onSubmit={handleAddProduct} className="flex flex-col gap-2">
                    <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} required className="input">
                      <option value="">Seçin...</option>
                      {warehouseProducts.map(p => (
                        <option key={p.id} value={p.id} disabled={p.stock_quantity === 0}>
                          {p.name} — {p.stock_quantity > 0 ? `${p.stock_quantity} ${p.unit}, ${formatCurrency(p.sell_price)}` : 'stokda yoxdur'}
                        </option>
                      ))}
                    </select>
                    <p className="text-small text-text-3">Stokda olmayan hissə üçün yuxarıdakı <span className="font-semibold text-warning-strong">"Anbarda yoxdur"</span> düyməsini basın.</p>
                    <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="1" required placeholder="Miqdar" className="input-mono" />
                    {productError && <p className="text-small text-danger">{productError}</p>}
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setAddProductOpen(false)}>Ləğv</Button>
                      <Button type="submit" size="sm" loading={addingProduct}>Əlavə et</Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleAddNewProduct} className="flex flex-col gap-2">
                    <p className="text-small text-text-3">Hissə indi mağazadan alınıb bu sifarişə qoyulur. Eyni adlı məhsul varsa, yenisi yaradılmır.</p>
                    <input value={newProdName} onChange={e => setNewProdName(e.target.value)} required placeholder="Məhsul adı" className="input" autoFocus />
                    <div className="flex gap-2">
                      <input value={newProdPurchase} onChange={e => setNewProdPurchase(e.target.value)} type="number" min="0" step="0.01" placeholder="Alış ₼" className="input-mono flex-1 min-w-0" />
                      <input value={newProdSell} onChange={e => setNewProdSell(e.target.value)} type="number" min="0" step="0.01" placeholder="Satış ₼" className="input-mono flex-1 min-w-0" />
                      <input value={newProdQty} onChange={e => setNewProdQty(e.target.value)} type="number" min="1" placeholder="Ədəd" className="input-mono w-20 shrink-0" />
                    </div>
                    <ComboboxInput value={newProdSupplier} onChange={setNewProdSupplier} options={stores.map(s => s.name)} placeholder="Mağaza (məcburi)" />
                    <label className="flex items-center gap-2 text-body text-text-1 cursor-pointer">
                      <input type="checkbox" checked={newProdOnCredit} onChange={e => setNewProdOnCredit(e.target.checked)} className="w-4 h-4 accent-ink" />
                      Nisyə alınıb
                      <span className="text-small text-text-3">{newProdOnCredit ? '— kreditor borcu yaranacaq' : '— kassadan çıxacaq'}</span>
                    </label>
                    {productError && <p className="text-small text-danger">{productError}</p>}
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setAddProductOpen(false)}>Ləğv</Button>
                      <Button type="submit" size="sm" loading={addingProduct}>Əlavə et</Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {orderProductsList.length === 0 ? (
              <p className="text-body text-text-3">Məhsul əlavə edilməyib.</p>
            ) : (
              <div>
                {orderProductsList.map(p => (
                  <div key={p.id} className="border-b border-border">
                    {editingProductId === p.id ? (
                      <div className="py-3 flex flex-col gap-2">
                        <p className="text-body font-semibold text-text-1">{p.product_name}</p>
                        <div className="flex gap-2">
                          <label className="flex flex-col flex-1">
                            <span className="label">Bu sifarişdə satış qiyməti (₼)</span>
                            <input value={editProductSell} onChange={e => setEditProductSell(e.target.value)} type="number" min="0" step="0.01" className="input-mono" autoFocus />
                          </label>
                          <label className="flex flex-col w-24">
                            <span className="label">Ədəd</span>
                            <input value={editProductQty} onChange={e => setEditProductQty(e.target.value)} type="number" min="0" className="input-mono" />
                          </label>
                        </div>
                        <p className="text-small text-text-3">Qiymət yalnız bu sifarişdə dəyişir. Miqdar artsa, fərq stokdan çıxılır; azalsa, stoka qayıdır. 0 yazsanız, sətir sifarişdən çıxır.</p>
                        {editProductError && <p className="text-small text-danger">{editProductError}</p>}
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="secondary" size="sm" onClick={() => setEditingProductId(null)}>Ləğv</Button>
                          <Button type="button" size="sm" loading={savingProductEdit} onClick={() => handleSaveProductEdit(p.id)}>Saxla</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between py-2.5 gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-body text-text-1">{p.product_name}</p>
                          {p.source === 'customer'
                            ? <p className="text-small text-text-3 font-mono">{p.quantity} ədəd</p>
                            : (
                              <p className="text-small text-text-3 font-mono">
                                {p.quantity} × {formatCurrency(Number(p.sell_price))}
                                <span className="font-sans"> satış</span>
                                <span aria-hidden> · </span>
                                {formatCurrency(Number(p.purchase_price ?? 0))}
                                <span className="font-sans"> alış</span>
                              </p>
                            )}
                        </div>
                        {p.source === 'customer'
                          ? <span className="text-small font-semibold text-text-2 bg-surface-2 border border-border rounded-sm px-2 py-0.5 shrink-0">Müştəri gətirib</span>
                          : <Money value={p.sell_price * p.quantity} />}
                        {order.status === 'done' && p.source !== 'customer' && (
                          <button
                            onClick={() => { setReturningProductId(returningProductId === p.id ? null : p.id); setReturnQty('1'); setReturnMessage('') }}
                            className="text-small font-semibold text-warning-strong hover:underline shrink-0"
                          >
                            Qaytar
                          </button>
                        )}
                        {linesEditable && (
                          <div className="flex items-center gap-2 shrink-0">
                            {p.source !== 'customer' && (
                              <button
                                aria-label="Düzəlt"
                                onClick={() => {
                                  setEditingProductId(p.id)
                                  setEditProductSell(String(p.sell_price)); setEditProductQty(String(p.quantity)); setEditProductError('')
                                }}
                                className="text-text-3 hover:text-ink"
                              >
                                <Pencil size={16} strokeWidth={1.75} />
                              </button>
                            )}
                            <button aria-label="Sil" onClick={() => handleRemoveProduct(p.id)} disabled={removingProductId === p.id} className="text-text-3 hover:text-danger">
                              <X size={16} strokeWidth={1.75} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {returningProductId === p.id && (
                      <form onSubmit={e => { e.preventDefault(); handleReturnProduct(p.id) }} className="pb-3 flex flex-col gap-2">
                        <p className="text-small text-text-2">Müştəri neçə ədədi geri gətirib? Hissə stoka qayıdır, hesabatdan çıxılır; artıq ödənilmiş məbləğ kassadan qaytarılır.</p>
                        <div className="flex gap-2">
                          <input type="number" min={1} max={p.quantity} value={returnQty} onChange={e => setReturnQty(e.target.value)} className="input-mono w-24" />
                          <Button type="submit" size="sm" loading={returnBusy} className="flex-1 !min-h-[44px]">Qaytarışı qeyd et</Button>
                          <Button type="button" variant="secondary" size="sm" className="!min-h-[44px]" onClick={() => setReturningProductId(null)}>Ləğv</Button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3">
                  <span className="section-label">Cəmi</span>
                  <Money value={productsTotal} className="text-body-l" />
                </div>
              </div>
            )}
          </SectionCard>

          {/* Images */}
          <SectionCard
            title={`Şəkillər${order.images && order.images.length > 0 ? ` (${order.images.length}/3)` : ''}`}
            action={order.payment_status !== 'paid' && (order.images?.length ?? 0) < 3 && (
              <>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <button onClick={() => { setImageError(''); imageInputRef.current?.click() }} disabled={uploadingImage} className={`${LINK_BTN} disabled:opacity-50`}>
                  {uploadingImage ? 'Yüklənir...' : '+ Şəkil'}
                </button>
              </>
            )}
          >
            {imageError && <p className="text-small text-danger mb-2">{imageError}</p>}
            {!order.images || order.images.length === 0 ? (
              <p className="text-body text-text-3">Şəkil əlavə edilməyib.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {order.images.map(img => (
                  <div key={img.id} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border group shrink-0">
                    <a href={mediaUrl(img.image)} target="_blank" rel="noreferrer">
                      <img src={mediaUrl(img.image)} alt="Şəkil" className="w-full h-full object-cover" />
                    </a>
                    {order.payment_status !== 'paid' && (
                      <button
                        aria-label="Şəkli sil"
                        onClick={() => handleRemoveImage(img.id)}
                        disabled={removingImageId === img.id}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-ink/80 text-paper flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                      >
                        <X size={14} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {order.notes && (
            <SectionCard title="Əlavə qeydlər" tone="warning">
              <p className="text-body text-text-1 whitespace-pre-line">{order.notes}</p>
            </SectionCard>
          )}

          {order.recommendations && (
            <SectionCard title="Tövsiyə olunan işlər">
              <p className="text-body text-text-2 whitespace-pre-line">{order.recommendations}</p>
            </SectionCard>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-4 min-w-0 lg:sticky lg:top-6">
          <div className="bg-ink rounded-lg p-6 flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-sans text-label uppercase text-text-4">Hesab</span>
              <span className="font-mono text-small text-text-4">№{orderNo}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-sans text-label uppercase text-text-4">Ümumi məbləğ</span>
              <span className="font-mono font-semibold tabular-nums text-[34px] leading-10 text-paper">{formatCurrency(effectiveOrderTotal)}</span>
              {Number(order.discount_amount ?? 0) > 0 && (
                <span className="font-mono text-small text-text-4 line-through">{formatCurrency(grandTotal)}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-ink-up pt-4">
              <div className="flex flex-col gap-1">
                <span className="font-sans text-label uppercase text-text-4">Ödənilib</span>
                <span className="font-mono font-semibold tabular-nums text-[20px] text-paper">{formatCurrency(Number(order.paid_amount ?? 0))}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-sans text-label uppercase text-text-4">Qalıq</span>
                <span className="font-mono font-semibold tabular-nums text-[20px] text-paper">{formatCurrency(Math.max(0, debt))}</span>
              </div>
            </div>
            {/* Net profit — business owner only, never printed on the customer PDF */}
            <div className="flex items-baseline justify-between gap-3 border-t border-ink-up pt-4">
              <span className="font-sans text-label uppercase text-text-4">Xalis mənfəət</span>
              <span className="font-mono font-semibold tabular-nums text-body-l text-paper">{netProfit < 0 ? '−' : ''}{formatCurrency(Math.abs(netProfit))}</span>
            </div>
          </div>

          <div className="card p-5 flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap">
              <StatusBadge status={order.status} />
              {order.status === 'done' && <UiStatusBadge status={PAYMENT_WORD[order.payment_status ?? 'unpaid']} />}
            </div>
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <BrandLogo brand={order.car_brand} className="w-9 h-9" />
              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold text-text-1 truncate">{[order.car_brand, order.car_model, order.car_year].filter(Boolean).join(' ') || '—'}</p>
                <p className="text-small text-text-3 truncate">
                  {order.customer
                    ? <Link to={`/business/customers/${order.customer}`} className="hover:underline underline-offset-2">{customerName || 'Müştəri'}</Link>
                    : (customerName || '—')}
                  {order.customer_phone && <span className="font-mono"> · {formatPhone(order.customer_phone)}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="section-label">Nişan</span>
              <Plate value={order.plate_number} size={14} />
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="section-label">Usta</span>
              <span className="text-body text-right">{mechanicName ?? <span className="text-warning-strong">təyin edilməyib</span>}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="section-label">Tarix</span>
              <span className="text-body font-mono">{formatDate(order.created_at)}</span>
            </div>
            {order.completed_on && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="section-label">Təhvil</span>
                <span className="text-body font-mono">{formatDate(order.completed_on)}</span>
              </div>
            )}
            {order.mileage != null && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="section-label">Yürüş</span>
                <span className="text-body font-mono">{order.mileage.toLocaleString()} {order.mileage_unit ?? 'km'}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="section-label">Zəmanət</span>
              <button
                onClick={async () => { try { await updateOrder(order.id, { has_guarantee: !order.has_guarantee }); loadOrder() } catch { /* ignore */ } }}
                title="Dəyişmək üçün basın"
                className={`text-small font-semibold tracking-wide px-2.5 h-7 rounded-sm border ${order.has_guarantee ? 'border-success bg-success-subtle text-success-strong' : 'border-border-strong text-text-3 hover:bg-surface-2'}`}
              >
                {order.has_guarantee ? 'ZƏMANƏTLİ' : 'ZƏMANƏTSİZ'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {order.status === 'done' && order.payment_status !== 'paid' && (
              <Button icon={Wallet} onClick={openPaymentPanel} className="w-full">Ödəniş qeyd et</Button>
            )}
            {order.payment_status === 'paid' && (
              <p className="text-body font-semibold text-success-strong bg-success-subtle rounded-lg px-4 py-3">Bu sifariş tam ödənilib və bağlanıb.</p>
            )}
            {order.payment_status !== 'paid' && (
              <>
                <Button variant="secondary" icon={RefreshCw} className="w-full" disabled={changingStatus} onClick={() => setStatusOpen(true)}>Status dəyiş</Button>
                <Button variant="secondary" icon={Wrench} className="w-full" onClick={() => { ensureMechanics(); setAssignOpen(true) }}>Usta təyin et</Button>
              </>
            )}
            {linesEditable && (
              <Button variant="secondary" icon={Pencil} className="w-full" onClick={() => setEditing(true)}>Düzəlt</Button>
            )}
            <Button
              variant="secondary"
              icon={Printer}
              className="w-full"
              loading={generatingPdf}
              onClick={async () => { setGeneratingPdf(true); try { await printOrderPDF(order, business) } finally { setGeneratingPdf(false) } }}
            >
              {generatingPdf ? 'Hazırlanır...' : 'PDF'}
            </Button>
            <Button
              variant="secondary"
              icon={MessageCircle}
              className="w-full"
              onClick={() => { if (!waMenuOpen) loadShareUrl(); setWaMenuOpen(true) }}
              disabled={!hasWhatsAppNumber(order.customer_phone)}
              title={hasWhatsAppNumber(order.customer_phone) ? undefined : 'Telefon nömrəsi yoxdur'}
            >
              WhatsApp
            </Button>
            <Button variant="secondary" icon={shareCopied ? Check : Link2} className="w-full" onClick={handleCopyShareLink} title="Müştəri üçün sifariş linkini kopyala">
              {shareCopied ? 'Kopyalandı' : 'Link'}
            </Button>
            <Button variant="danger" icon={XCircle} className="w-full" loading={deleting} onClick={handleDeleteOrder}>Sifarişi ləğv et</Button>
            {shareError && <p className="text-small text-danger bg-danger-subtle rounded-lg px-3 py-2">{shareError}</p>}
          </div>
        </div>
      </div>

      {/* Status dialog */}
      <Modal open={statusOpen} title="Status dəyiş" subtitle={`№${orderNo}`} onClose={() => setStatusOpen(false)}>
        <div className="flex flex-col gap-2 pb-2">
          {([{ value: 'pending', label: 'Gözləyir' }, { value: 'in_progress', label: 'İcrada' }, { value: 'done', label: 'Tamamlandı' }] as const).map(s => (
            <button
              key={s.value}
              onClick={() => handleStatus(s.value)}
              disabled={changingStatus || order.status === s.value}
              className={`h-11 px-3 rounded text-body text-left border flex items-center justify-between ${order.status === s.value ? 'bg-surface-2 border-ink text-ink font-semibold' : 'border-border-strong text-text-2 hover:bg-surface-2'} disabled:cursor-default`}
            >
              {s.label}
              {order.status === s.value && <Check size={18} strokeWidth={1.75} />}
            </button>
          ))}
        </div>
      </Modal>

      {/* Mechanic dialog */}
      <Modal
        open={assignOpen}
        title="Usta təyin et"
        subtitle={`№${orderNo}`}
        onClose={() => setAssignOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Ləğv et</Button>
            <Button onClick={handleAssign} disabled={!selectedMechanic} loading={assigningMechanic}>Təyin et</Button>
          </>
        }
      >
        <select value={selectedMechanic} onChange={e => setSelectedMechanic(e.target.value)} onFocus={ensureMechanics} className="input">
          <option value="">Seçilməyib</option>
          {mechanics.filter(m => m.is_active).map(m => <option key={m.id} value={m.id}>{m.full_name ?? m.phone}</option>)}
        </select>
      </Modal>

      {/* WhatsApp dialog */}
      {order.customer_phone && business && (() => {
        const phone = order.customer_phone
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
          <Modal open={waMenuOpen} title="WhatsApp" subtitle={formatPhone(phone)} onClose={() => setWaMenuOpen(false)}>
            <div className="flex flex-col gap-2 pb-2">
              {options.map(o => (
                <a
                  key={o.label}
                  href={whatsappLink(phone, o.text)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setWaMenuOpen(false)}
                  className="h-11 px-3 rounded border border-border-strong text-body text-text-1 hover:bg-surface-2 flex items-center gap-2"
                >
                  <MessageCircle size={18} strokeWidth={1.75} className="shrink-0" /> {o.label}
                </a>
              ))}
              <p className="text-small text-text-3 pt-1">WhatsApp mətnlə açılır — göndərməzdən əvvəl düzəldə bilərsiniz.</p>
              {shareUrl && (
                <button onClick={() => { setWaMenuOpen(false); handleResetShareLink() }} className="text-left text-small text-text-3 hover:text-danger underline">
                  Linki yenilə (köhnə link işləməyəcək)
                </button>
              )}
            </div>
          </Modal>
        )
      })()}

      {/* Payment dialog — shown automatically when an order is marked Tamamlandı, or via "Ödəniş qeyd et" */}
      {paymentOpen && (() => {
        const effectiveTotal = discountEnabled ? Math.max(0, parseFloat(discountPrice) || 0) : paymentTotal
        const discountAmt = paymentTotal - effectiveTotal
        const paid = parseFloat(paidInput) || 0
        return (
          <Modal
            open
            title="Ödəniş qeydi"
            subtitle={`№${orderNo} · Sifariş tamamlandı`}
            onClose={() => setPaymentOpen(false)}
            footer={
              <>
                <Button type="button" variant="secondary" onClick={() => setPaymentOpen(false)}>Sonra</Button>
                <Button type="submit" form="payment-form" loading={recordingPayment}>{recordingPayment ? 'Saxlanılır...' : 'Qeyd et'}</Button>
              </>
            }
          >
            <form id="payment-form" onSubmit={handleRecordPayment} className="flex flex-col gap-3 pb-2">
              <div className="flex items-center justify-between bg-surface-2 rounded px-3 py-2.5">
                <span className="text-body text-text-3">Ümumi məbləğ</span>
                <span className={`font-mono font-semibold ${discountEnabled && discountAmt > 0 ? 'line-through text-text-3' : 'text-text-1'}`}>{formatCurrency(paymentTotal)}</span>
              </div>
              <label className="flex items-center gap-2 text-body text-text-1 cursor-pointer select-none">
                <input type="checkbox" checked={discountEnabled} onChange={e => { setDiscountEnabled(e.target.checked); setPaidInput(e.target.checked ? discountPrice : paymentTotal.toFixed(2)) }} className="w-4 h-4 accent-ink" />
                Endirimli qiymət
              </label>
              {discountEnabled && (
                <div>
                  <p className="label">Yeni qiymət (endirimli)</p>
                  <input type="number" min="0.01" max={paymentTotal - 0.01} step="0.01" value={discountPrice} onChange={e => { setDiscountPrice(e.target.value); setPaidInput(e.target.value) }} className="input-mono text-body-l" autoFocus />
                  {discountAmt > 0 && (
                    <div className="flex items-center justify-between bg-surface-2 rounded px-3 py-2 mt-2">
                      <span className="text-body text-text-3">Endirim məbləği</span>
                      <Money value={-discountAmt} />
                    </div>
                  )}
                </div>
              )}
              <div>
                <p className="label">Ödənilən məbləğ</p>
                <input type="number" min="0" max={effectiveTotal} step="0.01" value={paidInput} onChange={e => setPaidInput(e.target.value)} className="input-mono text-body-l" autoFocus={!discountEnabled} />
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setPaidInput('0')}>Borc</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setPaidInput((effectiveTotal / 2).toFixed(2))}>Yarısı</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setPaidInput(effectiveTotal.toFixed(2))}>Tam</Button>
                </div>
              </div>
              {paid < effectiveTotal && paid >= 0 && (
                <div className="flex items-center justify-between bg-warning-subtle rounded px-3 py-2">
                  <span className="text-body text-warning-strong font-semibold">Borc qalır</span>
                  <span className="font-mono font-semibold text-warning-strong">{formatCurrency(effectiveTotal - paid)}</span>
                </div>
              )}
              {paid >= effectiveTotal && (
                <div className="flex items-center gap-2 bg-success-subtle rounded px-3 py-2">
                  <span className="text-body text-success-strong font-semibold">Tam ödənilib</span>
                </div>
              )}
              {paymentError && <p className="text-body text-danger bg-danger-subtle rounded px-3 py-2">{paymentError}</p>}
            </form>
          </Modal>
        )
      })()}

      <BoughtNowRemoveModal
        open={boughtAsk !== null}
        parts={boughtAsk?.parts ?? []}
        mode={boughtAsk?.mode}
        busy={boughtBusy}
        error={boughtRemoveError}
        onChoose={handleBoughtChoose}
        onClose={() => setBoughtAsk(null)}
      />
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  )
}
