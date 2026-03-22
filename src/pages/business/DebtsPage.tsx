import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Order } from '@/types'
import { getOrders, recordPayment } from '@/services/orders.service'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function DebtsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<number | null>(null)
  const [payInputs, setPayInputs] = useState<Record<number, string>>({})
  const [payErrors, setPayErrors] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getOrders()
      const all: Order[] = Array.isArray(res.data) ? res.data : (res.data as { results: Order[] }).results ?? []
      setOrders(all.filter(o => o.status === 'done' && o.payment_status !== 'paid'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function getTotal(order: Order) {
    const svc = order.services?.reduce((s, t) => s + Number(t.price), 0) ?? 0
    const prd = (order.products ?? []).reduce((s, p) => s + Number(p.sell_price) * p.quantity, 0)
    return svc + prd
  }

  async function handlePay(order: Order, debt: number) {
    const amount = parseFloat(payInputs[order.id] ?? debt.toFixed(2)) || 0
    if (amount <= 0) {
      setPayErrors(prev => ({ ...prev, [order.id]: 'Məbləğ 0-dan böyük olmalıdır.' }))
      return
    }
    if (Math.round(amount * 100) > Math.round(debt * 100)) {
      setPayErrors(prev => ({ ...prev, [order.id]: `Məbləğ qalan borcu (${debt.toFixed(2)} ₼) aşa bilməz.` }))
      return
    }
    setPayErrors(prev => ({ ...prev, [order.id]: '' }))
    setPayingId(order.id)
    try {
      await recordPayment(order.id, amount)
      setPayInputs(prev => { const n = { ...prev }; delete n[order.id]; return n })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Xəta baş verdi.'
      setPayErrors(prev => ({ ...prev, [order.id]: msg }))
    } finally {
      setPayingId(null)
    }
  }

  const totalDebt = orders.reduce((s, o) => {
    const total = getTotal(o)
    return s + (total - Number(o.paid_amount ?? 0))
  }, 0)

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Borclar</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ödənilməmiş və ya qismən ödənilmiş sifarişlər</p>
      </div>

      {/* Summary */}
      <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Ümumi borc</p>
          <p className="text-2xl font-bold text-red-700 mt-0.5">{formatCurrency(totalDebt)}</p>
        </div>
        <p className="text-sm text-red-500">{orders.length} sifariş</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
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
          {orders.map(order => {
            const total = getTotal(order)
            const paid = Number(order.paid_amount ?? 0)
            const debt = total - paid
            const isPartial = order.payment_status === 'partial'

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
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

                {/* Inline payment */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0.01"
                        max={debt}
                        step="0.01"
                        value={payInputs[order.id] ?? debt.toFixed(2)}
                        onChange={e => {
                          setPayInputs(prev => ({ ...prev, [order.id]: e.target.value }))
                          setPayErrors(prev => ({ ...prev, [order.id]: '' }))
                        }}
                        className={`input text-sm pr-7 ${payErrors[order.id] ? 'border-red-400 focus:ring-red-300' : ''}`}
                        placeholder={debt.toFixed(2)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₼</span>
                    </div>
                    <button
                      onClick={() => setPayInputs(prev => ({ ...prev, [order.id]: debt.toFixed(2) }))}
                      className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
                    >
                      Tam
                    </button>
                    <button
                      onClick={() => handlePay(order, debt)}
                      disabled={payingId === order.id}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl shrink-0 transition-colors"
                    >
                      {payingId === order.id ? 'Saxlanılır...' : 'Ödəniş qeyd et'}
                    </button>
                  </div>
                  {payErrors[order.id] && (
                    <p className="text-xs text-red-600 mt-1.5">{payErrors[order.id]}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
