import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Order, ManualDebt } from '@/types'
import { getOrders, recordPayment } from '@/services/orders.service'
import { getManualDebts, createManualDebt, payManualDebt, deleteManualDebt } from '@/services/finance.service'
import { formatDate, formatCurrency } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

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

  // Create form (inline, expands above the manual-debts table)
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ordersRes, debtsRes] = await Promise.all([
        getOrders({ status: 'done', payment_status: 'unpaid_or_partial', all: 'true' }),
        getManualDebts(),
      ])
      const all: Order[] = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data as { results: Order[] }).results ?? []
      const byNewest = (a: { created_at: string }, b: { created_at: string }) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      setOrders([...all].sort(byNewest))
      setManualDebts(debtsRes.data.filter(d => !d.is_paid).sort(byNewest))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function getOrderTotal(order: Order) {
    const svc = order.services?.reduce((s, t) => s + Number(t.price), 0) ?? 0
    const prd = (order.products ?? []).reduce((s, p) => s + Number(p.sell_price) * p.quantity, 0)
    const discount = Number(order.discount_amount ?? 0)
    return Math.max(svc + prd - discount, 0)
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
      <div className="mb-6">
        <h1 className="page-title">Borclar</h1>
        <p className="text-sm text-ink-muted mt-0.5">Ödənilməmiş və ya qismən ödənilmiş sifarişlər</p>
      </div>

      {/* Summary */}
      <div className="bg-danger-bg border border-danger/30 rounded px-6 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="section-label text-danger">Ümumi borc</p>
          <p className="font-mono text-2xl font-bold text-danger mt-0.5">{formatCurrency(totalDebt)}</p>
        </div>
        <p className="text-sm text-danger">{orders.length + manualDebts.length} qeyd</p>
      </div>

      {loading ? (
        <Spinner />
      ) : orders.length === 0 && manualDebts.length === 0 ? (
        <EmptyState title="Heç bir borc yoxdur" subtitle="Bütün sifarişlər ödənilib." />
      ) : (
        <div className="flex flex-col gap-8">
          {/* Order debts */}
          <Card className="p-6">
            <h2 className="card-title mb-4">Sifariş borcları</h2>
            {orders.length === 0 ? (
              <p className="text-sm text-ink-muted">Ödənilməmiş sifariş yoxdur.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th className="ledger-th">Dövlət nişanı</th>
                      <th className="ledger-th">Marka / Model</th>
                      <th className="ledger-th">Müştəri</th>
                      <th className="ledger-th">Status</th>
                      <th className="ledger-th">Tarix</th>
                      <th className="ledger-th text-right">Borc</th>
                      <th className="ledger-th">Ödəniş</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => {
                      const total = getOrderTotal(order)
                      const paid = Number(order.paid_amount ?? 0)
                      const debt = total - paid
                      const isPartial = order.payment_status === 'partial'

                      return (
                        <tr key={order.id}>
                          <td className="ledger-td">
                            <Link
                              to={`/business/orders/${order.id}`}
                              className="font-mono font-semibold text-ink tracking-wide hover:text-accent transition-colors"
                            >
                              {order.plate_number}
                            </Link>
                          </td>
                          <td className="ledger-td text-ink-soft">{order.car_brand} {order.car_model}</td>
                          <td className="ledger-td text-ink-soft">
                            {(order.customer_name || order.customer_surname) ? (
                              <>
                                {[order.customer_name, order.customer_surname].filter(Boolean).join(' ')}
                                {order.customer_phone && <span className="text-ink-muted"> · {order.customer_phone}</span>}
                              </>
                            ) : (
                              <span className="text-ink-muted">—</span>
                            )}
                          </td>
                          <td className="ledger-td">
                            <Badge variant={isPartial ? 'warning' : 'danger'}>
                              {isPartial ? 'Qismən' : 'Ödənilməyib'}
                            </Badge>
                          </td>
                          <td className="ledger-td font-mono text-xs text-ink-muted">{formatDate(order.created_at)}</td>
                          <td className="ledger-td text-right">
                            <p className="font-mono font-bold text-danger">{formatCurrency(debt)}</p>
                            {isPartial && (
                              <p className="text-xs text-ink-muted">Ödənilən: {formatCurrency(paid)}</p>
                            )}
                          </td>
                          <td className="ledger-td">
                            <div className="flex flex-col gap-1.5 items-start">
                              <div className="flex gap-1.5">
                                <div className="relative">
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
                                    className={`input-mono !py-1.5 !px-2 text-xs w-24 pr-6 ${orderPayErrors[order.id] ? 'border-danger focus:ring-danger focus:border-danger' : ''}`}
                                    placeholder={debt.toFixed(2)}
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted text-xs">₼</span>
                                </div>
                                <button
                                  onClick={() => setOrderPayInputs(prev => ({ ...prev, [order.id]: debt.toFixed(2) }))}
                                  className="text-xs px-2 py-1.5 rounded border border-rule text-ink-muted hover:bg-surface-alt shrink-0 transition-colors"
                                >
                                  Tam
                                </button>
                                <button
                                  onClick={() => handleOrderPay(order, debt)}
                                  disabled={payingOrderId === order.id}
                                  className="text-xs font-semibold px-3 py-1.5 rounded bg-accent hover:bg-accent-hover disabled:opacity-50 text-cream shrink-0 transition-colors"
                                >
                                  {payingOrderId === order.id ? 'Saxlanılır...' : 'Ödəniş qeyd et'}
                                </button>
                              </div>
                              {orderPayErrors[order.id] && (
                                <p className="text-xs text-danger">{orderPayErrors[order.id]}</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Manual debts */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title">Sair borclar</h2>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAddOpen(o => !o)}
                className="!min-h-0 !py-2 !px-3 text-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Borc yarat
              </Button>
            </div>

            {addOpen && (
              <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-5 p-4 bg-surface-alt border border-rule rounded">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1">
                    <label className="label">Ad</label>
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Məs. Əli Həsənov"
                      className="input"
                      autoFocus
                    />
                  </div>
                  <div className="sm:w-40">
                    <label className="label">Məbləğ</label>
                    <div className="relative">
                      <input
                        value={newAmount}
                        onChange={e => setNewAmount(e.target.value)}
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        className="input-mono pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">₼</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button type="submit" disabled={adding} className="!min-h-0 !py-2.5">
                      {adding ? 'Yaradılır...' : 'Yarat'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setAddOpen(false)} className="!min-h-0 !py-2.5">
                      Ləğv et
                    </Button>
                  </div>
                </div>
                {addError && <p className="text-sm text-danger">{addError}</p>}
              </form>
            )}

            {manualDebts.length === 0 ? (
              <p className="text-sm text-ink-muted">Əl ilə əlavə edilmiş borc yoxdur.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th className="ledger-th">Ad</th>
                      <th className="ledger-th">Tarix</th>
                      <th className="ledger-th text-right">Qalıq</th>
                      <th className="ledger-th">Ödəniş</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualDebts.map(debt => (
                      <tr key={debt.id}>
                        <td className="ledger-td font-semibold text-ink">{debt.name}</td>
                        <td className="ledger-td font-mono text-xs text-ink-muted">{formatDate(debt.created_at)}</td>
                        <td className="ledger-td text-right">
                          <p className="font-mono font-bold text-danger">{formatCurrency(debt.remaining)}</p>
                          {debt.paid_amount > 0 && (
                            <p className="text-xs text-ink-muted">Ödənilib: {formatCurrency(debt.paid_amount)}</p>
                          )}
                        </td>
                        <td className="ledger-td">
                          <div className="flex flex-col gap-1.5 items-start">
                            <div className="flex gap-1.5 items-center">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={debtPayInputs[debt.id] ?? debt.remaining.toFixed(2)}
                                  onChange={e => {
                                    setDebtPayInputs(prev => ({ ...prev, [debt.id]: e.target.value }))
                                    setDebtPayErrors(prev => ({ ...prev, [debt.id]: '' }))
                                  }}
                                  className={`input-mono !py-1.5 !px-2 text-xs w-24 pr-6 ${debtPayErrors[debt.id] ? 'border-danger focus:ring-danger focus:border-danger' : ''}`}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted text-xs">₼</span>
                              </div>
                              <button
                                onClick={() => setDebtPayInputs(prev => ({ ...prev, [debt.id]: debt.remaining.toFixed(2) }))}
                                className="text-xs px-2 py-1.5 rounded border border-rule text-ink-muted hover:bg-surface-alt shrink-0 transition-colors"
                              >
                                Tam
                              </button>
                              <button
                                onClick={() => handleDebtPay(debt)}
                                disabled={payingDebtId === debt.id}
                                className="text-xs font-semibold px-3 py-1.5 rounded bg-accent hover:bg-accent-hover disabled:opacity-50 text-cream shrink-0 transition-colors"
                              >
                                {payingDebtId === debt.id ? '...' : 'Ödəniş qeyd et'}
                              </button>
                              {confirmDeleteDebtId === debt.id ? (
                                <div className="flex gap-1 items-center shrink-0">
                                  <button
                                    onClick={() => handleDebtDelete(debt.id)}
                                    disabled={deletingDebtId === debt.id}
                                    className="text-xs font-semibold px-2.5 py-1.5 rounded bg-danger text-cream hover:opacity-90 disabled:opacity-50 transition-opacity"
                                  >
                                    Bəli
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteDebtId(null)}
                                    className="text-xs font-semibold px-2.5 py-1.5 rounded border border-rule text-ink-muted hover:bg-surface-alt"
                                  >
                                    Xeyr
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteDebtId(debt.id)}
                                  className="p-1.5 text-ink-muted hover:text-danger transition-colors shrink-0"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            {debtPayErrors[debt.id] && (
                              <p className="text-xs text-danger">{debtPayErrors[debt.id]}</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
