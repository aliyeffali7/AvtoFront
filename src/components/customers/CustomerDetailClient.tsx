import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CustomerDetail } from '@/types'
import { getCustomer, updateCustomer, deleteCustomer } from '@/services/customers.service'
import { formatCurrency, formatDate, mapApiError } from '@/lib/utils'
import StatusBadge from '@/components/orders/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PlateInput from '@/components/ui/PlateInput'
import { printOrderPDF } from '@/lib/printOrderPDF'

function EditCustomerDrawer({
  open,
  customer,
  onClose,
  onUpdated,
}: {
  open: boolean
  customer: CustomerDetail
  onClose: () => void
  onUpdated: (c: CustomerDetail) => void
}) {
  const [fullName, setFullName] = useState(customer.full_name)
  const [phone, setPhone] = useState(customer.phone ?? '')
  const [carBrand, setCarBrand] = useState(customer.car_brand ?? '')
  const [carModel, setCarModel] = useState(customer.car_model ?? '')
  const [carYear, setCarYear] = useState(customer.car_year ?? '')
  const [carPlate, setCarPlate] = useState(customer.car_plate ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setFullName(customer.full_name)
      setPhone(customer.phone ?? '')
      setCarBrand(customer.car_brand ?? '')
      setCarModel(customer.car_model ?? '')
      setCarYear(customer.car_year ?? '')
      setCarPlate(customer.car_plate ?? '')
      setError('')
    }
  }, [open, customer])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await updateCustomer(customer.id, {
        full_name: fullName,
        phone: phone || undefined,
        car_brand: carBrand || undefined,
        car_model: carModel || undefined,
        car_year: carYear || undefined,
        car_plate: carPlate || undefined,
      })
      onUpdated(res.data)
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
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Müştəri redaktəsi</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 px-6 py-6 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Ad Soyad</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              autoFocus
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Əlaqə nömrəsi</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              type="tel"
              placeholder="+994 50 000 00 00"
              className="input"
            />
          </div>

          <div className="border-t border-gray-100 pt-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Avtomobil</p>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">Marka</label>
                  <input value={carBrand} onChange={e => setCarBrand(e.target.value)} placeholder="Toyota" className="input" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">Model</label>
                  <input value={carModel} onChange={e => setCarModel(e.target.value)} placeholder="Camry" className="input" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">İl</label>
                  <input value={carYear} onChange={e => setCarYear(e.target.value)} placeholder="2020" maxLength={4} className="input" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">Dövlət nişanı</label>
                  <PlateInput value={carPlate} onChange={setCarPlate} className="input font-mono tracking-wider" />
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="mt-auto flex flex-col gap-3 pt-2">
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

export default function CustomerDetailClient() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getCustomer(parseInt(id))
      .then(res => setCustomer(res.data))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!customer) return
    await deleteCustomer(customer.id)
    navigate('/business/customers')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-8 text-center text-gray-500">Müştəri tapılmadı.</div>
    )
  }

  const hasDebt = customer.total_debt > 0

  return (
    <>
      <div className="p-6 lg:p-8 max-w-3xl">
        {/* Back */}
        <Link to="/business/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Müştərilər
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{customer.full_name}</h1>
              {customer.phone && (
                <p className="text-sm text-gray-500 mt-0.5">{customer.phone}</p>
              )}
              {(customer.car_brand || customer.car_model) && (
                <p className="text-sm text-gray-600 mt-1">
                  {[customer.car_brand, customer.car_model, customer.car_year].filter(Boolean).join(' ')}
                </p>
              )}
              {(customer.car_plate || customer.plates.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {customer.car_plate ? (
                    <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-sm font-mono text-gray-700 font-semibold">
                      {customer.car_plate}
                    </span>
                  ) : customer.plates.map(plate => (
                    <span key={plate} className="px-2.5 py-1 rounded-lg bg-gray-100 text-sm font-mono text-gray-700 font-semibold">
                      {plate}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setEditOpen(true)}
                className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                title="Redaktə et"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="p-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                title="Sil"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Ödənilmiş</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(customer.total_paid)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Borc</p>
              <p className={`text-lg font-bold ${hasDebt ? 'text-red-600' : 'text-gray-400'}`}>
                {formatCurrency(customer.total_debt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Son ziyarət</p>
              <p className="text-sm font-medium text-gray-700">
                {customer.last_visit
                  ? new Date(customer.last_visit).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Orders */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Sifarişlər ({customer.orders.length})
        </h2>

        {customer.orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500 text-sm">Bu müştərinin sifarişi yoxdur.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {customer.orders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all flex items-center gap-2 pr-3">
                <Link
                  to={`/business/orders/${order.id}`}
                  className="flex-1 px-5 py-4 flex items-center justify-between gap-4 min-w-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-gray-900 font-mono tracking-wider">{order.plate_number}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-gray-600">{order.car_brand} {order.car_model}</p>
                    {order.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{order.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                    {order.total != null && order.total > 0 && (
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatCurrency(order.total)}</p>
                    )}
                    {order.payment_status === 'paid' ? (
                      <p className="text-xs text-green-600 mt-0.5">Ödənildi</p>
                    ) : order.payment_status === 'partial' ? (
                      <p className="text-xs text-amber-600 mt-0.5">Qismən</p>
                    ) : (
                      <p className="text-xs text-red-500 mt-0.5">Ödənilməyib</p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <button
                  onClick={() => printOrderPDF(order)}
                  title="PDF yüklə"
                  className="p-2 rounded-xl text-green-600 hover:bg-green-50 border border-green-200 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <EditCustomerDrawer
        open={editOpen}
        customer={customer}
        onClose={() => setEditOpen(false)}
        onUpdated={updated => setCustomer(updated)}
      />

      <ConfirmDialog
        open={deleteConfirm}
        title="Müştərini sil"
        message={`"${customer.full_name}" müştərisi silinsin? Bu əməliyyat geri qaytarıla bilməz.`}
        confirmLabel="Sil"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </>
  )
}
