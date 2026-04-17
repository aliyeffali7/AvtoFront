import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Order, Mechanic, Product } from '@/types'
import {
  getOrder, assignMechanic, changeOrderStatus,
  addProductToOrder, removeProductFromOrder,
  addServiceToOrder, removeServiceFromOrder,
  recordPayment, updateOrder, deleteOrder,
  uploadOrderImage, deleteOrderImage,
} from '@/services/orders.service'
import { getMechanics } from '@/services/mechanics.service'
import { getProducts, createProduct, createSupplierDebt } from '@/services/warehouse.service'
import { formatDate, formatCurrency, mapApiError } from '@/lib/utils'
import { printOrderPDF } from '@/lib/printOrderPDF'
import StatusBadge from './StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PlateInput from '@/components/ui/PlateInput'

function EditOrderDrawer({
  order,
  onClose,
  onSaved,
}: {
  order: Order | null
  onClose: () => void
  onSaved: () => void
}) {
  const [plate, setPlate] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [description, setDescription] = useState('')
  const [days, setDays] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (order) {
      setPlate(order.plate_number)
      setBrand(order.car_brand)
      setModel(order.car_model)
      setDescription(order.description)
      setDays(String(order.estimated_days))
      setCustomerName(order.customer_name ?? '')
      setCustomerPhone(order.customer_phone ?? '')
      setNotes(order.notes ?? '')
      setError('')
    }
  }, [order])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    setError('')
    if (!description.trim()) {
      setError('Tapşırıq sahəsi boş ola bilməz.')
      return
    }
    setLoading(true)
    try {
      await updateOrder(order.id, {
        plate_number: plate,
        car_brand: brand,
        car_model: model,
        description,
        estimated_days: parseInt(days),
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        notes: notes || undefined,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (!order) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Sifarişi düzəlt</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 px-6 py-6 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Dövlət nişanı</label>
            <PlateInput value={plate} onChange={setPlate} required autoFocus className="input font-mono tracking-wider" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Marka</label>
            <input value={brand} onChange={e => setBrand(e.target.value)} required className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Model</label>
            <input value={model} onChange={e => setModel(e.target.value)} required className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Tapşırıq</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={3} className="input resize-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Müddət (gün)</label>
            <input value={days} onChange={e => setDays(e.target.value)} required type="number" min="1" className="input" />
          </div>
          <div className="border-t border-gray-100" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Müştəri adı</label>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} className="input" placeholder="Məs. Hüseyn Məmmədov" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Müştəri nömrəsi</label>
            <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel" className="input" placeholder="+994 50 000 00 00" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Əlavə qeydlər</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input resize-none" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex flex-col gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saxlanılır...' : 'Saxla'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Ləğv et</button>
          </div>
        </form>
      </div>
    </div>
  )
}

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

  // Products
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [warehouseProducts, setWarehouseProducts] = useState<Product[]>([])
  const warehouseLoadedRef = useRef(false)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [qty, setQty] = useState('1')
  const [addingProduct, setAddingProduct] = useState(false)
  const [productError, setProductError] = useState('')
  const [removingProductId, setRemovingProductId] = useState<number | null>(null)

  // Services
  const [addServiceOpen, setAddServiceOpen] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  const [newServiceMechanicAmount, setNewServiceMechanicAmount] = useState('')
  const [newServiceHasMechanicAmount, setNewServiceHasMechanicAmount] = useState(false)
  const [addingService, setAddingService] = useState(false)
  const [serviceError, setServiceError] = useState('')
  const [removingServiceId, setRemovingServiceId] = useState<number | null>(null)

  // New (non-warehouse) product
  const [productTab, setProductTab] = useState<'warehouse' | 'new'>('warehouse')
  const [newProdName, setNewProdName] = useState('')
  const [newProdPurchase, setNewProdPurchase] = useState('')
  const [newProdSell, setNewProdSell] = useState('')
  const [newProdQty, setNewProdQty] = useState('1')
  const [newProdSupplier, setNewProdSupplier] = useState('')

  // Images
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [removingImageId, setRemovingImageId] = useState<number | null>(null)
  const [imageError, setImageError] = useState('')

  // Edit / delete order
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Confirm dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    confirmLabel: string
    danger: boolean
    onConfirm: () => void
  }>({ open: false, title: '', message: '', confirmLabel: 'Bəli', danger: false, onConfirm: () => {} })

  function showConfirm(opts: { title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void }) {
    setConfirmDialog({ open: true, confirmLabel: 'Bəli', danger: false, ...opts })
  }
  function closeConfirm() {
    setConfirmDialog(prev => ({ ...prev, open: false }))
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [orderRes, mechanicsRes] = await Promise.all([
        getOrder(parseInt(id)),
        mechanicsLoaded ? Promise.resolve(null) : getMechanics().catch(() => null),
      ])
      setOrder(orderRes.data)
      setSelectedMechanic(String(orderRes.data.mechanic ?? ''))
      if (mechanicsRes) {
        setMechanics(mechanicsRes.data)
        setMechanicsLoaded(true)
      }
    } finally {
      setLoading(false)
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (addProductOpen && !warehouseLoadedRef.current) {
      warehouseLoadedRef.current = true
      getProducts().then(r => setWarehouseProducts(r.data)).catch(() => {})
    }
  }, [addProductOpen])

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
    } catch (err) {
      setPaymentError(mapApiError(err))
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
      setAddProductOpen(false)
      load()
    } catch (err) {
      setProductError(mapApiError(err))
    } finally {
      setAddingProduct(false)
    }
  }

  function handleRemoveProduct(orderProductId: number) {
    showConfirm({
      title: 'Məhsulu sil',
      message: 'Bu məhsulu sifarişdən çıxarmaq istəyirsiniz? Stoka qaytarılacaq.',
      confirmLabel: 'Sil',
      danger: true,
      onConfirm: async () => {
        closeConfirm()
        setRemovingProductId(orderProductId)
        try {
          await removeProductFromOrder(parseInt(id), orderProductId)
          load()
        } finally {
          setRemovingProductId(null)
        }
      },
    })
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault()
    setServiceError('')
    const price = parseFloat(newServicePrice) || 0
    const mechanicAmt = newServiceHasMechanicAmount && newServiceMechanicAmount !== ''
      ? parseFloat(newServiceMechanicAmount) || 0
      : null
    if (mechanicAmt !== null && mechanicAmt > price) {
      setServiceError('Usta payı işin qiymətindən çox ola bilməz.')
      return
    }
    setAddingService(true)
    try {
      await addServiceToOrder(parseInt(id), newServiceName.trim(), price, mechanicAmt)
      setNewServiceName('')
      setNewServicePrice('')
      setNewServiceMechanicAmount('')
      setNewServiceHasMechanicAmount(false)
      setAddServiceOpen(false)
      load()
    } catch (err) {
      setServiceError(mapApiError(err))
    } finally {
      setAddingService(false)
    }
  }

  function handleRemoveService(serviceId: number) {
    showConfirm({
      title: 'İşi sil',
      message: 'Bu işi sifarişdən silmək istəyirsiniz?',
      confirmLabel: 'Sil',
      danger: true,
      onConfirm: async () => {
        closeConfirm()
        setRemovingServiceId(serviceId)
        try {
          await removeServiceFromOrder(parseInt(id), serviceId)
          load()
        } finally {
          setRemovingServiceId(null)
        }
      },
    })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (imageInputRef.current) imageInputRef.current.value = ''
    setImageError('')
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Fayl ölçüsü 5 MB-dan çox ola bilməz.')
      return
    }
    setUploadingImage(true)
    try {
      await uploadOrderImage(parseInt(id), file)
      load()
    } catch (err) {
      setImageError(mapApiError(err))
    } finally {
      setUploadingImage(false)
    }
  }

  function handleRemoveImage(imageId: number) {
    showConfirm({
      title: 'Şəkli sil',
      message: 'Bu şəkli silmək istəyirsiniz?',
      confirmLabel: 'Sil',
      danger: true,
      onConfirm: async () => {
        closeConfirm()
        setRemovingImageId(imageId)
        try {
          await deleteOrderImage(parseInt(id), imageId)
          load()
        } finally {
          setRemovingImageId(null)
        }
      },
    })
  }

  function handleDeleteOrder() {
    showConfirm({
      title: 'Sifarişi ləğv et',
      message: 'Bu sifarişi ləğv etmək istəyirsiniz? Bütün ödəniş qeydləri maliyyədən silinəcək, anbar stoku bərpa ediləcək. Bu əməliyyat geri alına bilməz.',
      confirmLabel: 'Ləğv et',
      danger: true,
      onConfirm: async () => {
        closeConfirm()
        setDeleting(true)
        try {
          await deleteOrder(parseInt(id))
          navigate('/business/orders', { replace: true })
        } finally {
          setDeleting(false)
        }
      },
    })
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
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* LEFT — main content */}
        <div className="w-full lg:w-[65%] lg:shrink-0 flex flex-col gap-4">

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
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(order.created_at)} · {order.estimated_days} gün
                  {(order.mechanic_name || order.mechanic_email) && (
                    <> · <span className="text-blue-500">{order.mechanic_name ?? order.mechanic_email}</span></>
                  )}
                  {!order.mechanic && (
                    <> · <span className="text-amber-500">Usta təyin edilməyib</span></>
                  )}
                </p>
              </div>
              {/* Edit + Delete + PDF buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <button
                  onClick={() => printOrderPDF(order)}
                  className="flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-2 rounded-xl transition-colors min-h-[40px]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  PDF
                </button>
                {order.payment_status !== 'paid' && (
                  <button
                    onClick={() => setEditOpen(true)}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 px-3 py-2 rounded-xl transition-colors min-h-[40px]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" />
                    </svg>
                    Düzəlt
                  </button>
                )}
                <button
                  onClick={handleDeleteOrder}
                  disabled={deleting}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-xl transition-colors min-h-[40px]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {deleting ? '...' : 'Ləğv et'}
                </button>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Tapşırıq</p>
              <p className="text-sm text-gray-700 leading-relaxed">{order.description}</p>
            </div>
          </div>

          {/* Services & Customer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Services card — with add/remove */}
            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">İşlər və qiymətlər</p>
                {order.payment_status !== 'paid' && (
                  <button
                    onClick={() => { setAddServiceOpen(v => !v); setServiceError('') }}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Əlavə et
                  </button>
                )}
              </div>

              {/* Inline add service form */}
              {addServiceOpen && order.payment_status !== 'paid' && (
                <form onSubmit={handleAddService} className="mb-3 bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
                  <input
                    value={newServiceName}
                    onChange={e => setNewServiceName(e.target.value)}
                    required
                    placeholder="İş adı (məs. Yağ dəyişimi)"
                    className="input text-sm"
                    autoFocus
                  />
                  {/* Price + mechanic amount row */}
                  <div className="grid grid-cols-[1fr_32px_1fr] gap-2 items-center">
                    <div className="relative">
                      <input
                        value={newServicePrice}
                        onChange={e => setNewServicePrice(e.target.value)}
                        type="number" min="0" step="0.01" placeholder="Qiymət 0.00"
                        className="input text-sm pr-6 w-full"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₼</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setNewServiceHasMechanicAmount(v => !v); setNewServiceMechanicAmount('') }}
                      title={newServiceHasMechanicAmount ? 'Usta payını sil' : 'Usta payı əlavə et'}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${newServiceHasMechanicAmount ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-400 hover:bg-gray-300'}`}
                    >
                      U
                    </button>
                    <div className="relative">
                      {newServiceHasMechanicAmount ? (
                        <>
                          <input
                            value={newServiceMechanicAmount}
                            onChange={e => setNewServiceMechanicAmount(e.target.value)}
                            type="number" min="0" step="0.01" placeholder="Usta payı"
                            className="input text-sm pr-6 w-full"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₼</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">% ilə hesablanır</span>
                      )}
                    </div>
                  </div>
                  {serviceError && <p className="text-xs text-red-600">{serviceError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={addingService} className="btn-primary flex-1 text-sm py-2">
                      {addingService ? '...' : 'Əlavə et'}
                    </button>
                    <button type="button" onClick={() => { setAddServiceOpen(false); setNewServiceHasMechanicAmount(false); setNewServiceMechanicAmount('') }} className="btn-ghost text-sm py-2 px-3">Ləğv</button>
                  </div>
                </form>
              )}

              {!order.services || order.services.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">İş qeyd edilməyib.</p>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100">
                  {order.services.map((svc) => (
                    <div key={svc.id} className="flex items-start justify-between py-2.5 gap-3 group">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-700">{svc.name}</span>
                        {svc.mechanic_amount != null ? (
                          <p className="text-xs text-purple-600 mt-0.5">Usta payı: {formatCurrency(parseFloat(String(svc.mechanic_amount)))}</p>
                        ) : order.mechanic ? (
                          <p className="text-xs text-gray-400 mt-0.5">Usta payı: % ilə</p>
                        ) : null}
                      </div>
                      <span className="text-sm font-semibold text-gray-900 shrink-0">{formatCurrency(parseFloat(String(svc.price)))}</span>
                      {order.payment_status !== 'paid' && (
                        <button
                          onClick={() => svc.id && handleRemoveService(svc.id)}
                          disabled={removingServiceId === svc.id}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                          title="Sil"
                        >
                          {removingServiceId === svc.id ? (
                            <span className="text-xs">...</span>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      )}
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

          {/* Images */}
          {((order.images && order.images.length > 0) || order.payment_status !== 'paid') && (
            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Şəkillər {order.images && order.images.length > 0 ? `(${order.images.length}/3)` : ''}
                </p>
                {order.payment_status !== 'paid' && (order.images?.length ?? 0) < 3 && (
                  <>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <button
                      type="button"
                      onClick={() => { setImageError(''); imageInputRef.current?.click() }}
                      disabled={uploadingImage}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {uploadingImage ? (
                        <span>Yüklənir...</span>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Şəkil əlavə et
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
              {imageError && <p className="text-xs text-red-600 mb-2">{imageError}</p>}
              {!order.images || order.images.length === 0 ? (
                <p className="text-sm text-gray-400">Şəkil əlavə edilməyib.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {order.images.map(img => (
                    <div key={img.id} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group shrink-0">
                      <a href={`${import.meta.env.VITE_API_URL}${img.image}`} target="_blank" rel="noreferrer">
                        <img
                          src={`${import.meta.env.VITE_API_URL}${img.image}`}
                          alt="Şəkil"
                          className="w-full h-full object-cover"
                        />
                      </a>
                      {order.payment_status !== 'paid' && (
                        <button
                          onClick={() => handleRemoveImage(img.id)}
                          disabled={removingImageId === img.id}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          {removingImageId === img.id ? (
                            <span className="text-xs">...</span>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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

          {/* Payment action */}
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

          {/* Locked banner */}
          {order.payment_status === 'paid' && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-sm text-gray-500">Bu sifariş tam ödənilib və bağlanıb. Dəyişiklik etmək mümkün deyil.</p>
            </div>
          )}

          {/* Assign mechanic & Status — hidden when paid */}
          {order.payment_status !== 'paid' && (
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
          )}

        </div>

        {/* RIGHT — products panel */}
        <div className="w-full lg:flex-1 lg:min-w-0 lg:sticky top-6">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">İstifadə edilən məhsullar</p>
              {order.payment_status !== 'paid' && (
                <div className="flex gap-1">
                  <button
                    onClick={() => { setAddProductOpen(v => !v); setProductTab('warehouse'); setProductError('') }}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Anbarda var
                  </button>
                  <button
                    onClick={() => { setAddProductOpen(true); setProductTab('new'); setProductError('') }}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Yoxdur
                  </button>
                </div>
              )}
            </div>

            {/* Inline add product form */}
            {addProductOpen && order.payment_status !== 'paid' && (
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-3">
                {productTab === 'warehouse' ? (
                  <form onSubmit={handleAddProduct} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">Məhsul</label>
                      <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} required className="input text-sm">
                        <option value="">Seçin...</option>
                        {warehouseProducts.map(p => (
                          <option key={p.id} value={p.id} disabled={p.stock_quantity === 0}>{p.name} ({p.stock_quantity} ədəd){p.stock_quantity === 0 ? ' — stok yoxdur' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-600">Miqdar</label>
                      <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="1" required className="input text-sm" />
                    </div>
                    {productError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{productError}</p>}
                    <div className="flex gap-2">
                      <button type="submit" disabled={addingProduct} className="btn-primary flex-1 text-sm py-2">
                        {addingProduct ? 'Əlavə edilir...' : 'Əlavə et'}
                      </button>
                      <button type="button" onClick={() => { setAddProductOpen(false); setProductError('') }} className="btn-ghost text-sm py-2 px-3">Ləğv</button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={async e => {
                    e.preventDefault()
                    setProductError('')
                    const qty2 = parseInt(newProdQty) || 1
                    const purchase = parseFloat(newProdPurchase) || 0
                    setAddingProduct(true)
                    try {
                      const res = await createProduct({
                        name: newProdName.trim(),
                        purchase_price: purchase,
                        sell_price: parseFloat(newProdSell) || 0,
                        stock_quantity: qty2,
                      })
                      await addProductToOrder(parseInt(id), res.data.id, qty2)
                      if (newProdSupplier.trim() && purchase > 0) {
                        await createSupplierDebt({ supplier_name: newProdSupplier.trim(), description: newProdName.trim(), total_amount: purchase * qty2 })
                      }
                      setNewProdName(''); setNewProdPurchase(''); setNewProdSell(''); setNewProdQty('1'); setNewProdSupplier('')
                      setAddProductOpen(false)
                      load()
                    } catch (err) {
                      setProductError(mapApiError(err))
                    } finally {
                      setAddingProduct(false)
                    }
                  }} className="flex flex-col gap-2">
                    <input value={newProdName} onChange={e => setNewProdName(e.target.value)} required placeholder="Məhsul adı" className="input text-sm" autoFocus />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="relative">
                        <input value={newProdPurchase} onChange={e => setNewProdPurchase(e.target.value)} type="number" min="0" step="0.01" placeholder="Alış" className="input text-sm pr-5 w-full" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₼</span>
                      </div>
                      <div className="relative">
                        <input value={newProdSell} onChange={e => setNewProdSell(e.target.value)} type="number" min="0" step="0.01" placeholder="Satış" className="input text-sm pr-5 w-full" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₼</span>
                      </div>
                      <input value={newProdQty} onChange={e => setNewProdQty(e.target.value)} type="number" min="1" placeholder="Ədəd" className="input text-sm" />
                    </div>
                    <input value={newProdSupplier} onChange={e => setNewProdSupplier(e.target.value)} placeholder="Kreditor adı (borc varsa)" className="input text-sm text-orange-800 placeholder-orange-300 border-orange-200" />
                    {productError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{productError}</p>}
                    <div className="flex gap-2">
                      <button type="submit" disabled={addingProduct} className="btn-primary flex-1 text-sm py-2">
                        {addingProduct ? 'Əlavə edilir...' : 'Əlavə et'}
                      </button>
                      <button type="button" onClick={() => { setAddProductOpen(false); setProductError('') }} className="btn-ghost text-sm py-2 px-3">Ləğv</button>
                    </div>
                  </form>
                )}
              </div>
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
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 gap-3 group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.product_name}</p>
                      <p className="text-xs text-gray-400">{p.quantity} ədəd</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 shrink-0">
                      {formatCurrency(p.sell_price * p.quantity)}
                    </span>
                    {order.payment_status !== 'paid' && (
                      <button
                        onClick={() => handleRemoveProduct(p.id)}
                        disabled={removingProductId === p.id}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                        title="Sil"
                      >
                        {removingProductId === p.id ? (
                          <span className="text-xs">...</span>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cəmi</span>
                  <span className="text-sm font-bold text-blue-600">
                    {formatCurrency(orderProducts.reduce((s, p) => s + p.sell_price * p.quantity, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Grand total card */}
          <div className="bg-blue-600 rounded-2xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide">Ümumi məbləğ</p>
              {order.payment_status === 'partial' && (
                <p className="text-xs text-blue-200 mt-0.5">Ödənilən: {formatCurrency(Number(order.paid_amount))} · Borc: {formatCurrency(debt)}</p>
              )}
            </div>
            <span className="text-2xl font-bold text-white">{formatCurrency(grandTotal)}</span>
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
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">Ümumi məbləğ</span>
              <span className="text-base font-bold text-gray-900">{formatCurrency(paymentTotal)}</span>
            </div>

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

    <EditOrderDrawer order={editOpen ? order : null} onClose={() => setEditOpen(false)} onSaved={load} />

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
