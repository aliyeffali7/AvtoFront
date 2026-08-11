import { useState, useEffect, useCallback } from 'react'
import { SupplierDebt, SupplierDebtItem } from '@/types'
import { getSupplierDebts, createSupplierDebt, paySupplierDebt, paySupplierDebtItems, deleteSupplierDebt } from '@/services/warehouse.service'
import { formatCurrency } from '@/lib/utils'
import ComboboxInput from '@/components/ui/ComboboxInput'
import MasterDetailShell from '@/components/ui/MasterDetailShell'
import Badge, { BadgeVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

interface SupplierGroup {
  name: string
  phone: string
  debts: SupplierDebt[]
  totalAmount: number
  totalPaid: number
  remaining: number
  isFullyPaid: boolean
  hasUnpaid: boolean
}

function groupBySupplier(debts: SupplierDebt[]): SupplierGroup[] {
  const map = new Map<string, SupplierDebt[]>()
  for (const d of debts) {
    const key = d.supplier_name
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(d)
  }
  return Array.from(map.entries()).map(([name, list]) => {
    const totalAmount = list.reduce((s, d) => s + Number(d.total_amount), 0)
    const totalPaid   = list.reduce((s, d) => s + Number(d.paid_amount), 0)
    const remaining   = Math.max(totalAmount - totalPaid, 0)
    const phone       = list.find(d => d.phone)?.phone ?? ''
    return {
      name,
      phone,
      debts: list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      totalAmount,
      totalPaid,
      remaining,
      isFullyPaid: remaining <= 0,
      hasUnpaid: remaining > 0,
    }
  }).sort((a, b) => (b.hasUnpaid ? 1 : 0) - (a.hasUnpaid ? 1 : 0) || a.name.localeCompare(b.name))
}

function statusVariant(group: SupplierGroup): BadgeVariant {
  if (group.isFullyPaid) return 'success'
  if (group.totalPaid > 0) return 'warning'
  return 'danger'
}

function statusLabel(group: SupplierGroup): string {
  if (group.isFullyPaid) return 'Ödənilib'
  if (group.totalPaid > 0) return 'Qismən'
  return 'Ödənilməyib'
}

export default function CreditorsPage() {
  const [debts, setDebts]           = useState<SupplierDebt[]>([])
  const [supplierNames, setSupplierNames] = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [showPaidGroups, setShowPaidGroups] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
  const [creating, setCreating]     = useState(false)

  // Pay state
  const [payingId, setPayingId]     = useState<number | null>(null)
  const [payInputs, setPayInputs]   = useState<Record<number, string>>({})
  const [payErrors, setPayErrors]   = useState<Record<number, string>>({})

  // Per-product pay selection: item id -> quantity to pay now
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({})

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId]           = useState<number | null>(null)

  // Create form
  const [newSupplier, setNewSupplier] = useState('')
  const [newPhone, setNewPhone]     = useState('')
  const [newDesc, setNewDesc]       = useState('')
  const [newAmount, setNewAmount]   = useState('')
  const [adding, setAdding]         = useState(false)
  const [addError, setAddError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const debtsRes = await getSupplierDebts(true)
      setDebts(debtsRes.data)
      const names = [...new Set(debtsRes.data.map(d => d.supplier_name))].sort()
      setSupplierNames(names)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const groups = groupBySupplier(debts)
  const visibleGroups = showPaidGroups ? groups : groups.filter(g => g.hasUnpaid)
  const totalUnpaid = groups.filter(g => g.hasUnpaid).reduce((s, g) => s + g.remaining, 0)
  const unpaidCount = groups.filter(g => g.hasUnpaid).length
  const selectedGroup = selectedSupplier ? groups.find(g => g.name === selectedSupplier) ?? null : null

  function openCreate() {
    setCreating(true)
    setSelectedSupplier(null)
    setAddError('')
  }

  function selectSupplier(name: string) {
    setCreating(false)
    setSelectedSupplier(name)
    setSelectedItems({})
  }

  function toggleItemSelect(item: SupplierDebtItem, checked: boolean) {
    setSelectedItems(prev => {
      const next = { ...prev }
      if (checked) next[item.id] = item.remaining_quantity
      else delete next[item.id]
      return next
    })
  }

  function updateItemQty(item: SupplierDebtItem, raw: string) {
    const qty = Math.min(Math.max(parseInt(raw) || 1, 1), item.remaining_quantity)
    setSelectedItems(prev => ({ ...prev, [item.id]: qty }))
  }

  function selectAllUnpaid(debt: SupplierDebt) {
    setSelectedItems(prev => {
      const next = { ...prev }
      for (const item of debt.items) {
        if (!item.is_paid) next[item.id] = item.remaining_quantity
      }
      return next
    })
  }

  function debtSelectedEntries(debt: SupplierDebt) {
    return debt.items
      .filter(item => selectedItems[item.id] > 0)
      .map(item => ({ item, qty: selectedItems[item.id] }))
  }

  function debtSelectedTotal(debt: SupplierDebt) {
    return debtSelectedEntries(debt).reduce((s, { item, qty }) => s + qty * Number(item.purchase_price), 0)
  }

  async function handlePayItems(debt: SupplierDebt) {
    const entries = debtSelectedEntries(debt)
    if (entries.length === 0) return
    setPayErrors(prev => ({ ...prev, [debt.id]: '' }))
    setPayingId(debt.id)
    try {
      await paySupplierDebtItems(debt.id, entries.map(({ item, qty }) => ({ item_id: item.id, quantity: qty })))
      setSelectedItems(prev => {
        const next = { ...prev }
        for (const { item } of entries) delete next[item.id]
        return next
      })
      load()
    } catch {
      setPayErrors(prev => ({ ...prev, [debt.id]: 'Xəta baş verdi.' }))
    } finally {
      setPayingId(null)
    }
  }

  async function handlePay(debt: SupplierDebt) {
    const remaining = debt.remaining
    const amount    = parseFloat(payInputs[debt.id] ?? remaining.toFixed(2)) || 0
    if (amount <= 0) {
      setPayErrors(prev => ({ ...prev, [debt.id]: 'Məbləğ 0-dan böyük olmalıdır.' }))
      return
    }
    if (amount > remaining + 0.001) {
      setPayErrors(prev => ({ ...prev, [debt.id]: `Qalan borcu (${formatCurrency(remaining)}) aşa bilməz.` }))
      return
    }
    setPayErrors(prev => ({ ...prev, [debt.id]: '' }))
    setPayingId(debt.id)
    try {
      await paySupplierDebt(debt.id, amount)
      setPayInputs(prev => { const n = { ...prev }; delete n[debt.id]; return n })
      load()
    } catch {
      setPayErrors(prev => ({ ...prev, [debt.id]: 'Xəta baş verdi.' }))
    } finally {
      setPayingId(null)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await deleteSupplierDebt(id)
      setConfirmDeleteId(null)
      load()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    if (!newSupplier.trim()) { setAddError('Kreditor adı daxil edin.'); return }
    const amount = parseFloat(newAmount)
    if (!amount || amount <= 0) { setAddError('Düzgün məbləğ daxil edin.'); return }
    setAdding(true)
    try {
      await createSupplierDebt({
        supplier_name: newSupplier.trim(),
        phone: newPhone.trim(),
        description: newDesc.trim(),
        total_amount: amount,
      })
      const created = newSupplier.trim()
      setNewSupplier(''); setNewPhone(''); setNewDesc(''); setNewAmount('')
      setCreating(false)
      setSelectedSupplier(created)
      load()
    } catch {
      setAddError('Xəta baş verdi.')
    } finally {
      setAdding(false)
    }
  }

  const listPane = (
    <>
      {loading ? (
        <Spinner />
      ) : visibleGroups.length === 0 ? (
        <div className="p-6">
          <EmptyState title="Heç bir borc yoxdur" subtitle="Bütün kreditorlara ödənilib." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="ledger-table min-w-[560px]">
            <thead>
              <tr>
                <th className="ledger-th">Təchizatçı</th>
                <th className="ledger-th">Status</th>
                <th className="ledger-th">Telefon</th>
                <th className="ledger-th text-right">Qalıq</th>
              </tr>
            </thead>
            <tbody>
              {visibleGroups.map(group => (
                <tr
                  key={group.name}
                  onClick={() => selectSupplier(group.name)}
                  className={`ledger-row ${!creating && selectedSupplier === group.name ? 'ledger-row-selected' : ''}`}
                >
                  <td className="ledger-td font-medium">{group.name}</td>
                  <td className="ledger-td"><Badge variant={statusVariant(group)}>{statusLabel(group)}</Badge></td>
                  <td className="ledger-td font-mono text-ink-muted">{group.phone || '—'}</td>
                  <td className="ledger-td text-right font-mono font-semibold">{formatCurrency(group.remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )

  const createForm = (
    <form onSubmit={handleAdd} className="p-6 flex flex-col gap-4">
      <h2 className="card-title mb-1">Borc yarat</h2>
      <div>
        <label className="label">Kreditor adı <span className="text-danger normal-case">*</span></label>
        <ComboboxInput
          value={newSupplier}
          onChange={setNewSupplier}
          options={supplierNames}
          placeholder="Məs. Avtoehtiyat MMC"
          autoFocus
        />
      </div>
      <div>
        <label className="label">Telefon <span className="text-ink-muted normal-case font-normal">(ixtiyari)</span></label>
        <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+994 50 000 00 00" className="input" />
      </div>
      <div>
        <label className="label">Məhsul / Açıqlama <span className="text-ink-muted normal-case font-normal">(ixtiyari)</span></label>
        <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Məs. Mühərrik yağı 5L" className="input" />
      </div>
      <div>
        <label className="label">Məbləğ <span className="text-danger normal-case">*</span></label>
        <div className="relative">
          <input value={newAmount} onChange={e => setNewAmount(e.target.value)} type="number" min="0.01" step="0.01" placeholder="0.00" className="input-mono pr-8" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm font-mono">₼</span>
        </div>
      </div>
      {addError && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{addError}</p>}
      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" loading={adding}>{adding ? 'Əlavə edilir...' : 'Əlavə et'}</Button>
        <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Ləğv et</Button>
      </div>
    </form>
  )

  const detailPane = creating ? (
    createForm
  ) : selectedGroup ? (
    <div className="p-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          <h2 className="font-serif font-semibold text-xl text-ink truncate">{selectedGroup.name}</h2>
          {selectedGroup.phone && <p className="font-mono text-xs text-ink-muted mt-0.5">{selectedGroup.phone}</p>}
        </div>
        <Badge variant={statusVariant(selectedGroup)}>{statusLabel(selectedGroup)}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 my-4">
        <div className="bg-surface border border-rule rounded px-3 py-2.5">
          <p className="section-label mb-1">Cəmi</p>
          <p className="font-mono font-semibold text-sm text-ink">{formatCurrency(selectedGroup.totalAmount)}</p>
        </div>
        <div className="bg-surface border border-rule rounded px-3 py-2.5">
          <p className="section-label mb-1">Ödənilib</p>
          <p className="font-mono font-semibold text-sm text-success">{formatCurrency(selectedGroup.totalPaid)}</p>
        </div>
        <div className="bg-surface border border-rule rounded px-3 py-2.5">
          <p className="section-label mb-1">Qalıq</p>
          <p className="font-mono font-semibold text-sm text-danger">{formatCurrency(selectedGroup.remaining)}</p>
        </div>
      </div>

      <p className="section-label mb-2">Borc qeydləri ({selectedGroup.debts.length})</p>
      <div className="flex flex-col gap-3">
        {selectedGroup.debts.map(debt => (
          <div key={debt.id} className={`bg-surface border border-rule rounded px-4 py-3 ${debt.is_paid ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                {debt.description && (
                  <p className="text-sm font-medium text-ink">{debt.description}</p>
                )}
                <p className="text-xs text-ink-muted mt-0.5">{debt.date}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono font-semibold text-ink">{formatCurrency(debt.total_amount)}</p>
                {debt.paid_amount > 0 && (
                  <p className="text-xs font-mono text-success">Ödənilib: {formatCurrency(debt.paid_amount)}</p>
                )}
                {!debt.is_paid && (
                  <p className="text-xs font-mono font-semibold text-danger">Qalıb: {formatCurrency(debt.remaining)}</p>
                )}
              </div>
            </div>

            {/* Product line items */}
            {debt.items && debt.items.length > 0 && (
              <div className="mb-2 rounded border border-rule/70 bg-surface-alt/50 divide-y divide-rule/70">
                {debt.items.map(item => {
                  const checked = selectedItems[item.id] > 0
                  const qty = selectedItems[item.id] ?? item.remaining_quantity
                  return (
                    <div key={item.id} className={`flex items-center gap-2 px-3 py-1.5 ${item.is_paid ? 'opacity-50' : ''}`}>
                      {item.is_paid ? (
                        <span className="text-success text-xs shrink-0" title="Ödənilib">✓</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => toggleItemSelect(item, e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-rule text-accent cursor-pointer shrink-0"
                        />
                      )}
                      <p className="text-xs text-ink-soft truncate flex-1 min-w-0">
                        {item.product_name} × {item.quantity}
                        {!item.is_paid && item.paid_quantity > 0 && (
                          <span className="text-ink-muted"> ({item.remaining_quantity} qalıb)</span>
                        )}
                      </p>
                      {checked && item.remaining_quantity > 1 && (
                        <input
                          type="number"
                          min={1}
                          max={item.remaining_quantity}
                          value={qty}
                          onChange={e => updateItemQty(item, e.target.value)}
                          className="input-mono w-12 py-0.5 px-1 text-xs text-center shrink-0"
                        />
                      )}
                      <p className="text-xs font-mono text-ink-muted shrink-0 text-right">
                        {item.is_paid ? 'Ödənilib' : formatCurrency(checked ? qty * Number(item.purchase_price) : item.remaining_amount)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pay row */}
            {!debt.is_paid && debt.items && debt.items.length > 0 ? (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <button onClick={() => selectAllUnpaid(debt)} className="text-xs font-mono font-semibold text-accent hover:text-accent-hover shrink-0">
                    Hamısını seç
                  </button>
                  <p className="text-xs font-mono text-ink-muted text-right truncate">
                    {debtSelectedEntries(debt).length} məhsul — {formatCurrency(debtSelectedTotal(debt))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePayItems(debt)}
                    disabled={payingId === debt.id || debtSelectedEntries(debt).length === 0}
                    className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-cream text-xs font-semibold px-4 py-2 rounded"
                  >
                    {payingId === debt.id ? '...' : 'Seçilənləri ödə'}
                  </button>
                  {confirmDeleteId === debt.id ? (
                    <div className="flex gap-1 items-center shrink-0">
                      <button onClick={() => handleDelete(debt.id)} disabled={deletingId === debt.id} className="text-xs font-semibold bg-danger text-cream px-2.5 py-2 rounded hover:opacity-90 disabled:opacity-60">Bəli</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs font-semibold bg-surface-alt text-ink px-2.5 py-2 rounded">Xeyr</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(debt.id)} className="p-2 text-ink-muted hover:text-danger shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ) : !debt.is_paid && (
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <input
                    type="number" min="0.01" step="0.01"
                    value={payInputs[debt.id] ?? debt.remaining.toFixed(2)}
                    onChange={e => {
                      setPayInputs(prev => ({ ...prev, [debt.id]: e.target.value }))
                      setPayErrors(prev => ({ ...prev, [debt.id]: '' }))
                    }}
                    className={`input-mono text-sm pr-7 ${payErrors[debt.id] ? 'border-danger' : ''}`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">₼</span>
                </div>
                <button
                  onClick={() => setPayInputs(prev => ({ ...prev, [debt.id]: debt.remaining.toFixed(2) }))}
                  className="text-xs font-mono font-semibold px-3 py-2 rounded border border-rule text-ink-muted hover:bg-surface-alt shrink-0"
                >
                  Tam
                </button>
                <button
                  onClick={() => handlePay(debt)}
                  disabled={payingId === debt.id}
                  className="bg-accent hover:bg-accent-hover disabled:opacity-60 text-cream text-xs font-semibold px-4 py-2 rounded shrink-0"
                >
                  {payingId === debt.id ? '...' : 'Ödə'}
                </button>
                {confirmDeleteId === debt.id ? (
                  <div className="flex gap-1 items-center shrink-0">
                    <button onClick={() => handleDelete(debt.id)} disabled={deletingId === debt.id} className="text-xs font-semibold bg-danger text-cream px-2.5 py-2 rounded hover:opacity-90 disabled:opacity-60">Bəli</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs font-semibold bg-surface-alt text-ink px-2.5 py-2 rounded">Xeyr</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(debt.id)} className="p-2 text-ink-muted hover:text-danger shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {debt.is_paid && (
              <div className="flex justify-end mt-1">
                {confirmDeleteId === debt.id ? (
                  <div className="flex gap-1 items-center">
                    <button onClick={() => handleDelete(debt.id)} disabled={deletingId === debt.id} className="text-xs font-semibold bg-danger text-cream px-2.5 py-1.5 rounded hover:opacity-90 disabled:opacity-60">Bəli, sil</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs font-semibold bg-surface-alt text-ink px-2.5 py-1.5 rounded">Xeyr</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(debt.id)} className="text-xs text-ink-muted hover:text-danger">Sil</button>
                )}
              </div>
            )}

            {payErrors[debt.id] && (
              <p className="text-xs text-danger mt-1.5">{payErrors[debt.id]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  ) : null

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Kreditorlar</h1>
          <p className="text-sm text-ink-muted mt-0.5">Məhsul alışından yaranan borclar</p>
        </div>
        <Button onClick={openCreate}>+ Borc yarat</Button>
      </div>

      {/* Summary */}
      {totalUnpaid > 0 && (
        <div className="bg-danger-bg border border-rule rounded px-6 py-4 mb-6 flex items-center justify-between">
          <div>
            <p className="section-label text-danger">Ümumi ödənilməmiş borc</p>
            <p className="font-mono font-semibold text-2xl text-danger mt-0.5">{formatCurrency(totalUnpaid)}</p>
          </div>
          <p className="text-sm text-danger">{unpaidCount} kreditor</p>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setShowPaidGroups(false)}
          className={`text-xs font-mono font-semibold uppercase tracking-wide px-3 py-2 rounded border transition-colors ${!showPaidGroups ? 'bg-ink text-cream border-ink' : 'bg-surface text-ink-muted border-rule hover:bg-surface-alt'}`}
        >
          Ödənilməmiş
        </button>
        <button
          onClick={() => setShowPaidGroups(true)}
          className={`text-xs font-mono font-semibold uppercase tracking-wide px-3 py-2 rounded border transition-colors ${showPaidGroups ? 'bg-ink text-cream border-ink' : 'bg-surface text-ink-muted border-rule hover:bg-surface-alt'}`}
        >
          Bütün kreditorlar
        </button>
      </div>

      <MasterDetailShell list={listPane} detail={detailPane} onClose={() => { setCreating(false); setSelectedSupplier(null) }} />
    </div>
  )
}
