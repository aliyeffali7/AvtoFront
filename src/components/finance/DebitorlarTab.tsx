import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { DebtorGroup, ManualDebt } from '@/types'
import { getDebtors } from '@/services/finance.service'
import { getManualDebts, createManualDebt, payManualDebt, deleteManualDebt } from '@/services/finance.service'
import { recordPayment } from '@/services/orders.service'
import { formatDate, formatCurrency } from '@/lib/utils'
import Badge, { BadgeVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import MasterDetailShell from '@/components/ui/MasterDetailShell'

function groupKey(g: DebtorGroup) {
  return g.customer_id != null ? `c${g.customer_id}` : `n${g.customer_name}|${g.phone}`
}

function statusVariant(g: DebtorGroup): BadgeVariant {
  if (g.is_paid) return 'success'
  if (g.paid_amount > 0) return 'warning'
  return 'danger'
}

function statusLabel(g: DebtorGroup): string {
  if (g.is_paid) return 'Ödənilib'
  if (g.paid_amount > 0) return 'Qismən'
  return 'Ödənilməyib'
}

export default function DebitorlarTab() {
  const [debtors, setDebtors] = useState<DebtorGroup[]>([])
  const [manualDebts, setManualDebts] = useState<ManualDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [showPaid, setShowPaid] = useState(false)

  const [payingOrderId, setPayingOrderId] = useState<number | null>(null)
  const [orderPayInputs, setOrderPayInputs] = useState<Record<number, string>>({})
  const [orderPayErrors, setOrderPayErrors] = useState<Record<number, string>>({})

  const [payingDebtId, setPayingDebtId] = useState<number | null>(null)
  const [debtPayInputs, setDebtPayInputs] = useState<Record<number, string>>({})
  const [debtPayErrors, setDebtPayErrors] = useState<Record<number, string>>({})
  const [confirmDeleteDebtId, setConfirmDeleteDebtId] = useState<number | null>(null)
  const [deletingDebtId, setDeletingDebtId] = useState<number | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [debtorsRes, manualRes] = await Promise.all([getDebtors(), getManualDebts()])
      setDebtors(debtorsRes.data)
      setManualDebts(manualRes.data.filter(d => !d.is_paid))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const visible = showPaid ? debtors : debtors.filter(g => !g.is_paid)
  const totalUnpaid = debtors.filter(g => !g.is_paid).reduce((s, g) => s + g.remaining, 0)
  const unpaidCount = debtors.filter(g => !g.is_paid).length
  const selectedGroup = selectedKey ? debtors.find(g => groupKey(g) === selectedKey) ?? null : null

  async function handleOrderPay(orderId: number, debt: number) {
    const amount = parseFloat(orderPayInputs[orderId] ?? debt.toFixed(2)) || 0
    if (amount <= 0) {
      setOrderPayErrors(prev => ({ ...prev, [orderId]: 'Məbləğ 0-dan böyük olmalıdır.' }))
      return
    }
    if (Math.round(amount * 100) > Math.round(debt * 100)) {
      setOrderPayErrors(prev => ({ ...prev, [orderId]: `Məbləğ qalan borcu (${debt.toFixed(2)} ₼) aşa bilməz.` }))
      return
    }
    setOrderPayErrors(prev => ({ ...prev, [orderId]: '' }))
    setPayingOrderId(orderId)
    try {
      await recordPayment(orderId, amount)
      setOrderPayInputs(prev => { const n = { ...prev }; delete n[orderId]; return n })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Xəta baş verdi.'
      setOrderPayErrors(prev => ({ ...prev, [orderId]: msg }))
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

  const listPane = (
    <div className="overflow-x-auto">
      <table className="ledger-table min-w-[560px]">
        <thead>
          <tr>
            <th className="ledger-th">Müştəri</th>
            <th className="ledger-th">Status</th>
            <th className="ledger-th">Telefon</th>
            <th className="ledger-th text-right">Qalıq</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(g => (
            <tr
              key={groupKey(g)}
              onClick={() => setSelectedKey(groupKey(g))}
              className={`ledger-row ${selectedKey === groupKey(g) ? 'ledger-row-selected' : ''}`}
            >
              <td className="ledger-td font-medium">{g.customer_name}</td>
              <td className="ledger-td"><Badge variant={statusVariant(g)}>{statusLabel(g)}</Badge></td>
              <td className="ledger-td font-mono text-ink-muted">{g.phone || '—'}</td>
              <td className="ledger-td text-right font-mono font-semibold">{formatCurrency(g.remaining)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const detailPane = selectedGroup ? (
    <div className="p-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          <h2 className="font-serif font-semibold text-xl text-ink truncate">{selectedGroup.customer_name}</h2>
          {selectedGroup.phone && <p className="font-mono text-xs text-ink-muted mt-0.5">{selectedGroup.phone}</p>}
        </div>
        <Badge variant={statusVariant(selectedGroup)}>{statusLabel(selectedGroup)}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 my-4">
        <div className="bg-surface border border-rule rounded px-3 py-2.5">
          <p className="section-label mb-1">Cəmi</p>
          <p className="font-mono font-semibold text-sm text-ink">{formatCurrency(selectedGroup.total_charged)}</p>
        </div>
        <div className="bg-surface border border-rule rounded px-3 py-2.5">
          <p className="section-label mb-1">Ödənilib</p>
          <p className="font-mono font-semibold text-sm text-success">{formatCurrency(selectedGroup.paid_amount)}</p>
        </div>
        <div className="bg-surface border border-rule rounded px-3 py-2.5">
          <p className="section-label mb-1">Qalıq</p>
          <p className="font-mono font-semibold text-sm text-danger">{formatCurrency(selectedGroup.remaining)}</p>
        </div>
      </div>

      <p className="section-label mb-2">Sifarişlər ({selectedGroup.orders.length})</p>
      <div className="flex flex-col gap-3">
        {selectedGroup.orders.map(order => {
          const isPartial = order.payment_status === 'partial'
          return (
            <div key={order.id} className={`bg-surface border border-rule rounded px-4 py-3 ${order.remaining <= 0 ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <Link to={`/business/orders/${order.id}`} className="text-sm font-mono font-semibold text-ink hover:text-accent transition-colors">
                    {order.plate_number || `#${order.id}`}
                  </Link>
                  <p className="text-xs text-ink-muted mt-0.5">{order.car} · {formatDate(order.date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-semibold text-ink">{formatCurrency(order.total)}</p>
                  {order.paid_amount > 0 && (
                    <p className="text-xs font-mono text-success">Ödənilib: {formatCurrency(order.paid_amount)}</p>
                  )}
                  {order.remaining > 0 && (
                    <p className="text-xs font-mono font-semibold text-danger">Qalıb: {formatCurrency(order.remaining)}</p>
                  )}
                </div>
              </div>
              {order.remaining > 0 && (
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <input
                      type="number" min="0.01" step="0.01"
                      value={orderPayInputs[order.id] ?? order.remaining.toFixed(2)}
                      onChange={e => {
                        setOrderPayInputs(prev => ({ ...prev, [order.id]: e.target.value }))
                        setOrderPayErrors(prev => ({ ...prev, [order.id]: '' }))
                      }}
                      className={`input-mono text-sm pr-7 ${orderPayErrors[order.id] ? 'border-danger' : ''}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">₼</span>
                  </div>
                  <button
                    onClick={() => setOrderPayInputs(prev => ({ ...prev, [order.id]: order.remaining.toFixed(2) }))}
                    className="text-xs font-mono font-semibold px-3 py-2 rounded border border-rule text-ink-muted hover:bg-surface-alt shrink-0"
                  >
                    Tam
                  </button>
                  <button
                    onClick={() => handleOrderPay(order.id, order.remaining)}
                    disabled={payingOrderId === order.id}
                    className="bg-accent hover:bg-accent-hover disabled:opacity-60 text-cream text-xs font-semibold px-4 py-2 rounded shrink-0"
                  >
                    {payingOrderId === order.id ? '...' : 'Ödə'}
                  </button>
                </div>
              )}
              {orderPayErrors[order.id] && <p className="text-xs text-danger mt-1.5">{orderPayErrors[order.id]}</p>}
            </div>
          )
        })}
      </div>
    </div>
  ) : null

  return (
    <div>
      {totalUnpaid > 0 && (
        <div className="bg-danger-bg border border-rule rounded px-6 py-4 mb-6 flex items-center justify-between">
          <div>
            <p className="section-label text-danger">Ümumi debitor borcu</p>
            <p className="font-mono font-semibold text-2xl text-danger mt-0.5">{formatCurrency(totalUnpaid)}</p>
          </div>
          <p className="text-sm text-danger">{unpaidCount} müştəri</p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setShowPaid(false)}
          className={`text-xs font-mono font-semibold uppercase tracking-wide px-3 py-2 rounded border transition-colors ${!showPaid ? 'bg-ink text-cream border-ink' : 'bg-surface text-ink-muted border-rule hover:bg-surface-alt'}`}
        >
          Ödənilməmiş
        </button>
        <button
          onClick={() => setShowPaid(true)}
          className={`text-xs font-mono font-semibold uppercase tracking-wide px-3 py-2 rounded border transition-colors ${showPaid ? 'bg-ink text-cream border-ink' : 'bg-surface text-ink-muted border-rule hover:bg-surface-alt'}`}
        >
          Bütün debitorlar
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <div className="mb-8"><EmptyState title="Heç bir debitor borcu yoxdur" subtitle="Bütün sifarişlər ödənilib." /></div>
      ) : (
        <div className="mb-8">
          <MasterDetailShell list={listPane} detail={detailPane} onClose={() => setSelectedKey(null)} />
        </div>
      )}

      {/* Manual debts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="card-title">Sair borclar</h2>
          <Button type="button" variant="secondary" onClick={() => setAddOpen(o => !o)} className="!min-h-0 !py-2 !px-3 text-xs">
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
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Məs. Əli Həsənov" className="input" autoFocus />
              </div>
              <div className="sm:w-40">
                <label className="label">Məbləğ</label>
                <div className="relative">
                  <input value={newAmount} onChange={e => setNewAmount(e.target.value)} type="number" min="0.01" step="0.01" placeholder="0.00" className="input-mono pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">₼</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button type="submit" disabled={adding} className="!min-h-0 !py-2.5">{adding ? 'Yaradılır...' : 'Yarat'}</Button>
                <Button type="button" variant="secondary" onClick={() => setAddOpen(false)} className="!min-h-0 !py-2.5">Ləğv et</Button>
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
                      {debt.paid_amount > 0 && <p className="text-xs text-ink-muted">Ödənilib: {formatCurrency(debt.paid_amount)}</p>}
                    </td>
                    <td className="ledger-td">
                      <div className="flex flex-col gap-1.5 items-start">
                        <div className="flex gap-1.5 items-center">
                          <div className="relative">
                            <input
                              type="number" min="0.01" step="0.01"
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
                              <button onClick={() => handleDebtDelete(debt.id)} disabled={deletingDebtId === debt.id} className="text-xs font-semibold px-2.5 py-1.5 rounded bg-danger text-cream hover:opacity-90 disabled:opacity-50 transition-opacity">Bəli</button>
                              <button onClick={() => setConfirmDeleteDebtId(null)} className="text-xs font-semibold px-2.5 py-1.5 rounded border border-rule text-ink-muted hover:bg-surface-alt">Xeyr</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDeleteDebtId(debt.id)} className="p-1.5 text-ink-muted hover:text-danger transition-colors shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {debtPayErrors[debt.id] && <p className="text-xs text-danger">{debtPayErrors[debt.id]}</p>}
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
  )
}
