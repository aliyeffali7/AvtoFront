import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Order, ManualDebt } from '@/types'
import { getOrders, recordPayment } from '@/services/orders.service'
import { getManualDebts, createManualDebt, payManualDebt, deleteManualDebt } from '@/services/finance.service'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function DebtsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [manualDebts, setManualDebts] = useState<ManualDebt[]>([])
  const [loading, setLoading] = useState(true)

  // Order payment state
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null)
  const [orderPayInputs, setOrderPayInputs] = useState<Record<number, string>>({})
  const [orderPayErrors, setOrderPayErrors] = useState<Record<number, string>>({})

  // Manual debt payment state
  const [payingDebtId, setPayingDebtId] = useState<number | null>(null)
  const [debtPayInputs, setDebtPayInputs] = useState<Record<number, string>>({})
  const [debtPayErrors, setDebtPayErrors] = useState<Record<number, string>>({})
  const [confirmDeleteDebtId, setConfirmDeleteDebtId] = useState<number | null>(null)
  const [deletingDebtId, setDeletingDebtId] = useState<number | null>(null)

  // Create drawer
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ordersRes, debtsRes] = await Promise.all([getOrders(), getManualDebts()])
      const all: Order[] = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data as { results: Order[] }).results ?? []
      setOrders(all.filter(o => o.status === 'done' && o.payment_status !== 'paid'))
      setManualDebts(debtsRes.data.filter(d => !d.is_paid))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function getOrderTotal(order: Order) {
    const svc = order.services?.reduce((s, t) => s + Number(t.price), 0) ?? 0
    const prd = (order.products ?? []).reduce((s, p) => s + Number(p.sell_price) * p.quantity, 0)
    return svc + prd
  }

  async function handleOrderPay(order: Order, debt: number) {
    const amount = parseFloat(orderPayInputs[order.id] ?? debt.toFixed(2)) || 0
    if (amount <= 0) {
      setOrderPayErrors(prev => ({ ...prev, [order.id]: 'Məbləğ 0-dan böyük olmalıdır.' }))
      return
    }
    if (Math.round(amount * 100) > Math.round(debt * 100)) {
      setOrderPayErrors(prev => ({ ...prev, [order.id]: `Məbləğ qalan borcu (${debt.toFixed(2)} ₼) aşa bilməz.` }))
      return
    }
    setOrderPayErrors(prev => ({ ...prev, [order.id]: '' }))
    setPayingOrderId(order.id)
    try {
      await recordPayment(order.id, amount)
      setOrderPayInputs(prev => { const n = { ...prev }; delete n[order.id]; return n })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Xəta baş verdi.'
      setOrderPayErrors(prev => ({ ...prev, [order.id]: msg }))
    } finally {
      setPayingOrderId(null)
    }
  }

  async function handleDebtPay(debt: ManualDebt) {
    const amount = parseFloat(debtPayInputs[debt.id] ?? debt.remaining.toFixed(2)) || 0
    if (amount <= 0) {
      setDebtPayErrors(prev => ({ ...prev, [debt.id]: 'Məbləğ 0-dan böyük olmalıdır.' }))
      return
    }
    if (amount > debt.remaining + 0.001) {
      setDebtPayErrors(prev => ({ ...prev, [debt.id]: `Məbləğ qalan borcu (${formatCurrency(debt.remaining)}) aşa bilməz.` }))
      return
    }
    setDebtPayErrors(prev => ({ ...prev, [debt.id]: '' }))
    setPayingDebtId(debt.id)
    try {
      await payManualDebt(debt.id, amount)
      setDebtPayInputs(prev => { const n = { ...prev }; delete n[debt.id]; return n })
      load()
    } catch {
      setDebtPayErrors(prev => ({ ...prev, [debt.id]: 'Xəta baş verdi.' }))
    } finally {
      setPayingDebtId(null)
    }
  }

  async function handleDebtDelete(id: number) {
    setDeletingDebtId(id)
    try {
      await deleteManualDebt(id)
      setConfirmDeleteDebtId(null)
      load()
    } finally {
      setDeletingDebtId(null)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    if (!newName.trim()) { setAddError('Ad daxil edin.'); return }
    const amount = parseFloat(newAmount)
    if (!amount || amount <= 0) { setAddError('Düzgün məbləğ daxil edin.'); return }
    setAdding(true)
    try {
      await createManualDebt({ name: newName.trim(), amount })
      setNewName(''); setNewAmount('')
      setAddOpen(false)
      load()
    } catch {
      setAddError('Xəta baş verdi.')
    } finally {
      setAdding(false)
    }
  }

  const totalOrderDebt = orders.reduce((s, o) => {
    const total = getOrderTotal(o)
    return s + (total - Number(o.paid_amount ?? 0))
  }, 0)
  const totalManualDebt = manualDebts.reduce((s, d) => s + d.remaining, 0)
  const totalDebt = totalOrderDebt + totalManualDebt

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Borclar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ödənilməmiş və ya qismən ödənilmiş sifarişlər</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl min-h-[44px] transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Borc yarat
        </button>
      </div>

      {/* Summary */}
      <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Ümumi borc</p>
          <p className="text-2xl font-bold text-red-700 mt-0.5">{formatCurrency(totalDebt)}</p>
        </div>
        <p className="text-sm text-red-500">{orders.length + manualDebts.length} qeyd</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 && manualDebts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium">Heç bir borc yoxdur</p>
          <p className="text-gray-500 text-sm mt-1">Bütün sifarişlər ödənilib.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Manual debts */}
          {manualDebts.map(debt => (
            <div key={`m-${debt.id}`} className="bg-white rounded-2xl border border-orange-200 px-5 py-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{debt.name}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      Əl ilə əlavə
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(debt.created_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-red-600">{formatCurrency(debt.remaining)}</p>
                  {debt.paid_amount > 0 && (
                    <p className="text-xs text-gray-400">Ödənilib: {formatCurrency(debt.paid_amount)}</p>
                  )}
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={debtPayInputs[debt.id] ?? debt.remaining.toFixed(2)}
                      onChange={e => {
                        setDebtPayInputs(prev => ({ ...prev, [debt.id]: e.target.value }))
                        setDebtPayErrors(prev => ({ ...prev, [debt.id]: '' }))
                      }}
                      className={`input text-sm pr-7 ${debtPayErrors[debt.id] ? 'border-red-400' : ''}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₼</span>
                  </div>
                  <button
                    onClick={() => setDebtPayInputs(prev => ({ ...prev, [debt.id]: debt.remaining.toFixed(2) }))}
                    className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
                  >
                    Tam
                  </button>
                  <button
                    onClick={() => handleDebtPay(debt)}
                    disabled={payingDebtId === debt.id}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl shrink-0 transition-colors"
                  >
                    {payingDebtId === debt.id ? '...' : 'Ödəniş qeyd et'}
                  </button>
                  {confirmDeleteDebtId === debt.id ? (
                    <div className="flex gap-1 items-center shrink-0">
                      <button onClick={() => handleDebtDelete(debt.id)} disabled={deletingDebtId === debt.id} className="text-xs bg-red-600 text-white px-2.5 py-2 rounded-xl hover:bg-red-700 disabled:opacity-60">Bəli</button>
                      <button onClick={() => setConfirmDeleteDebtId(null)} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-2 rounded-xl">Xeyr</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteDebtId(debt.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                {debtPayErrors[debt.id] && (
                  <p className="text-xs text-red-600 mt-1.5">{debtPayErrors[debt.id]}</p>
                )}
              </div>
            </div>
          ))}

          {/* Order debts */}
          {orders.map(order => {
            const total = getOrderTotal(order)
            const paid = Number(order.paid_amount ?? 0)
            const debt = total - paid
            const isPartial = order.payment_status === 'partial'

            return (
              <div key={`o-${order.id}`} className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link to={`/business/orders/${order.id}`} className="font-bold text-gray-900 font-mono tracking-wider hover:text-blue-600 transition-colors">
                        {order.plate_number}
                      </Link>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPartial ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {isPartial ? 'Qismən' : 'Ödənilməyib'}
                      </span>
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
                    <p className="text-lg font-bold text-red-600 mt-0.5">{formatCurrency(debt)}</p>
                    {isPartial && (
                      <p className="text-xs text-gray-400">Ödənilən: {formatCurrency(paid)}</p>
                    )}
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0.01"
                        max={debt}
                        step="0.01"
                        value={orderPayInputs[order.id] ?? debt.toFixed(2)}
                        onChange={e => {
                          setOrderPayInputs(prev => ({ ...prev, [order.id]: e.target.value }))
                          setOrderPayErrors(prev => ({ ...prev, [order.id]: '' }))
                        }}
                        className={`input text-sm pr-7 ${orderPayErrors[order.id] ? 'border-red-400 focus:ring-red-300' : ''}`}
                        placeholder={debt.toFixed(2)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₼</span>
                    </div>
                    <button
                      onClick={() => setOrderPayInputs(prev => ({ ...prev, [order.id]: debt.toFixed(2) }))}
                      className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
                    >
                      Tam
                    </button>
                    <button
                      onClick={() => handleOrderPay(order, debt)}
                      disabled={payingOrderId === order.id}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl shrink-0 transition-colors"
                    >
                      {payingOrderId === order.id ? 'Saxlanılır...' : 'Ödəniş qeyd et'}
                    </button>
                  </div>
                  {orderPayErrors[order.id] && (
                    <p className="text-xs text-red-600 mt-1.5">{orderPayErrors[order.id]}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create debt drawer */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setAddOpen(false)} />
          <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-semibold text-gray-900">Borc yarat</h2>
              <button onClick={() => setAddOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="flex-1 flex flex-col gap-4 px-6 py-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Ad <span className="text-red-500">*</span></label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Məs. Əli Həsənov"
                  className="input"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Məbləğ <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="input pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">₼</span>
                </div>
              </div>
              {addError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{addError}</p>}
              <div className="flex flex-col gap-3 pt-2 mt-auto">
                <button type="submit" disabled={adding} className="btn-primary">
                  {adding ? 'Yaradılır...' : 'Yarat'}
                </button>
                <button type="button" onClick={() => setAddOpen(false)} className="btn-ghost">Ləğv et</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
