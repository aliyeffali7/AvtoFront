import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { SupplierDebt, SupplierDebtItem } from '@/types'
import { getSupplierDebts, createSupplierDebt, paySupplierDebt, paySupplierItems, deleteSupplierDebt } from '@/services/warehouse.service'
import { formatCurrency, formatDate, mapApiError } from '@/lib/utils'
import ComboboxInput from '@/components/ui/ComboboxInput'
import MasterDetailShell from '@/components/ui/MasterDetailShell'
import Badge, { BadgeVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

interface SupplierGroup {
  key: string
  name: string
  storeId: number | null
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
    const key = d.store != null ? `s${d.store}` : `n${d.supplier_name}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(d)
  }
  return Array.from(map.entries()).map(([key, list]) => {
    const totalAmount = list.reduce((s, d) => s + Number(d.total_amount), 0)
    const totalPaid = list.reduce((s, d) => s + Number(d.paid_amount), 0)
    const remaining = Math.max(totalAmount - totalPaid, 0)
    return {
      key,
      name: list[0].supplier_name,
      storeId: list[0].store,
      phone: list.find(d => d.phone)?.phone ?? '',
      // Oldest first — that's the order debts are normally paid off in.
      debts: [...list].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id),
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
  const [debts, setDebts] = useState<SupplierDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaidGroups, setShowPaidGroups] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Product-level selection across all of the supplier's debts: item id → qty to pay now.
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({})
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [payNotice, setPayNotice] = useState('')

  // Amount payment for debts entered by hand (no product lines).
  const [amountInputs, setAmountInputs] = useState<Record<number, string>>({})
  const [amountPayingId, setAmountPayingId] = useState<number | null>(null)

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [newSupplier, setNewSupplier] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setDebts((await getSupplierDebts(true)).data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const groups = groupBySupplier(debts)
  const visibleGroups = showPaidGroups ? groups : groups.filter(g => g.hasUnpaid)
  const totalUnpaid = groups.filter(g => g.hasUnpaid).reduce((s, g) => s + g.remaining, 0)
  const unpaidCount = groups.filter(g => g.hasUnpaid).length
  const selectedGroup = selectedKey ? groups.find(g => g.key === selectedKey) ?? null : null
  const supplierNames = [...new Set(debts.map(d => d.supplier_name))].sort()

  function resetSelection() {
    setSelectedItems({}); setPayError(''); setPayNotice(''); setConfirmDeleteId(null)
  }

  function selectSupplier(key: string) {
    setCreating(false)
    setSelectedKey(key)
    resetSelection()
  }

  function toggleItem(item: SupplierDebtItem, checked: boolean) {
    setSelectedItems(prev => {
      const next = { ...prev }
      if (checked) next[item.id] = item.remaining_quantity
      else delete next[item.id]
      return next
    })
  }

  function setItemQty(item: SupplierDebtItem, raw: string) {
    const qty = Math.min(Math.max(parseInt(raw) || 1, 1), item.remaining_quantity)
    setSelectedItems(prev => ({ ...prev, [item.id]: qty }))
  }

  const unpaidItems = (debt: SupplierDebt) => debt.items.filter(i => !i.is_paid)
  const debtFullySelected = (debt: SupplierDebt) =>
    unpaidItems(debt).length > 0 && unpaidItems(debt).every(i => selectedItems[i.id] === i.remaining_quantity)

  function toggleDebt(debt: SupplierDebt, checked: boolean) {
    setSelectedItems(prev => {
      const next = { ...prev }
      for (const item of unpaidItems(debt)) {
        if (checked) next[item.id] = item.remaining_quantity
        else delete next[item.id]
      }
      return next
    })
  }

  const allItems = selectedGroup ? selectedGroup.debts.flatMap(d => d.items) : []
  const chosen = allItems.filter(i => selectedItems[i.id] > 0)
  const chosenTotal = chosen.reduce((s, i) => s + selectedItems[i.id] * Number(i.purchase_price), 0)
  const allUnpaidSelected = selectedGroup
    ? selectedGroup.debts.filter(d => !d.is_paid && d.items.length > 0).every(debtFullySelected) && chosen.length > 0
    : false

  function toggleAll(checked: boolean) {
    if (!selectedGroup) return
    const next: Record<number, number> = {}
    if (checked) {
      for (const d of selectedGroup.debts) for (const i of unpaidItems(d)) next[i.id] = i.remaining_quantity
    }
    setSelectedItems(next)
  }

  async function handlePaySelected() {
    if (chosen.length === 0) return
    setPaying(true); setPayError(''); setPayNotice('')
    try {
      await paySupplierItems(chosen.map(i => ({ item_id: i.id, quantity: selectedItems[i.id] })))
      setPayNotice(`${chosen.length} məhsul üçün ${formatCurrency(chosenTotal)} ödənildi (kassadan çıxdı).`)
      setSelectedItems({})
      await load()
    } catch (err) {
      setPayError(mapApiError(err))
    } finally {
      setPaying(false)
    }
  }

  async function handlePayAmount(debt: SupplierDebt) {
    const amount = parseFloat(amountInputs[debt.id] ?? String(debt.remaining)) || 0
    if (amount <= 0) { setPayError('Məbləğ 0-dan böyük olmalıdır.'); return }
    setAmountPayingId(debt.id); setPayError(''); setPayNotice('')
    try {
      await paySupplierDebt(debt.id, amount)
      setAmountInputs(prev => { const n = { ...prev }; delete n[debt.id]; return n })
      setPayNotice(`${formatCurrency(amount)} ödənildi (kassadan çıxdı).`)
      await load()
    } catch (err) {
      setPayError(mapApiError(err))
    } finally {
      setAmountPayingId(null)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id); setPayError('')
    try {
      await deleteSupplierDebt(id)
      setConfirmDeleteId(null)
      await load()
    } catch (err) {
      setPayError(mapApiError(err))
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
      const res = await createSupplierDebt({
        supplier_name: newSupplier.trim(), phone: newPhone.trim(), description: newDesc.trim(), total_amount: amount,
      })
      setNewSupplier(''); setNewPhone(''); setNewDesc(''); setNewAmount('')
      setCreating(false)
      await load()
      setSelectedKey(res.data.store != null ? `s${res.data.store}` : `n${res.data.supplier_name}`)
    } catch (err) {
      setAddError(mapApiError(err))
    } finally {
      setAdding(false)
    }
  }

  const listPane = loading ? <Spinner /> : visibleGroups.length === 0 ? (
    <div className="p-6"><EmptyState title="Heç bir borc yoxdur" subtitle="Bütün kreditorlara ödənilib." /></div>
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
            <tr key={group.key} onClick={() => selectSupplier(group.key)}
              className={`ledger-row ${!creating && selectedKey === group.key ? 'ledger-row-selected' : ''}`}>
              <td className="ledger-td font-medium">{group.name}</td>
              <td className="ledger-td"><Badge variant={statusVariant(group)}>{statusLabel(group)}</Badge></td>
              <td className="ledger-td font-mono text-ink-muted">{group.phone || '—'}</td>
              <td className="ledger-td text-right font-mono font-semibold">{formatCurrency(group.remaining)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const createForm = (
    <form onSubmit={handleAdd} className="p-6 flex flex-col gap-4">
      <div>
        <h2 className="card-title mb-1">Borc yarat</h2>
        <p className="text-xs text-ink-muted">Mal alışı ilə bağlı olmayan borc üçün (məs. sistemdən əvvəlki köhnə borc). Mal alanda "Stok → Alışlar"dan nisyə alış edin.</p>
      </div>
      <div>
        <label className="label">Kreditor adı <span className="text-danger normal-case">*</span></label>
        <ComboboxInput value={newSupplier} onChange={setNewSupplier} options={supplierNames} placeholder="Məs. Avtoehtiyat MMC" autoFocus />
      </div>
      <div>
        <label className="label">Telefon <span className="text-ink-muted normal-case font-normal">(ixtiyari)</span></label>
        <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+994 50 000 00 00" className="input" />
      </div>
      <div>
        <label className="label">Açıqlama <span className="text-ink-muted normal-case font-normal">(ixtiyari)</span></label>
        <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Məs. Köhnə borc" className="input" />
      </div>
      <div>
        <label className="label">Məbləğ <span className="text-danger normal-case">*</span></label>
        <input value={newAmount} onChange={e => setNewAmount(e.target.value)} type="number" min="0.01" step="0.01" placeholder="0.00" className="input-mono" />
      </div>
      {addError && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{addError}</p>}
      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" loading={adding}>Əlavə et</Button>
        <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Ləğv et</Button>
      </div>
    </form>
  )

  const detailPane = creating ? createForm : selectedGroup ? (
    <div className="p-6 pb-28">
      <div className="flex items-start justify-between gap-3 mb-1 pr-8">
        <div className="min-w-0">
          <h2 className="font-serif font-semibold text-xl text-ink truncate">{selectedGroup.name}</h2>
          {selectedGroup.phone && <p className="font-mono text-xs text-ink-muted mt-0.5">{selectedGroup.phone}</p>}
        </div>
        <Badge variant={statusVariant(selectedGroup)}>{statusLabel(selectedGroup)}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 my-4">
        <SummaryBox label="Cəmi" value={formatCurrency(selectedGroup.totalAmount)} />
        <SummaryBox label="Ödənilib" value={formatCurrency(selectedGroup.totalPaid)} tone="success" />
        <SummaryBox label="Qalıq" value={formatCurrency(selectedGroup.remaining)} tone="danger" />
      </div>

      {payNotice && <p className="text-sm text-success bg-success-bg rounded px-3 py-2 mb-3">{payNotice}</p>}
      {payError && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2 mb-3">{payError}</p>}

      {selectedGroup.hasUnpaid && allItems.some(i => !i.is_paid) && (
        <label className="flex items-center gap-2 text-sm font-semibold text-ink mb-3 cursor-pointer">
          <input type="checkbox" checked={allUnpaidSelected} onChange={e => toggleAll(e.target.checked)} className="w-4 h-4" />
          Bütün ödənilməmiş məhsulları seç
        </label>
      )}

      <div className="flex flex-col gap-3">
        {selectedGroup.debts.filter(d => showPaidGroups || !d.is_paid).map(debt => (
          <div key={debt.id} className={`bg-surface border border-rule rounded ${debt.is_paid ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3 px-3 pt-3 pb-2">
              <label className="flex items-start gap-2 min-w-0 cursor-pointer">
                {!debt.is_paid && debt.items.length > 0 && (
                  <input type="checkbox" checked={debtFullySelected(debt)} onChange={e => toggleDebt(debt, e.target.checked)} className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{formatDate(debt.date)}{debt.description ? ` — ${debt.description}` : ''}</span>
                  {debt.purchase && (
                    <Link to={`/business/warehouse/purchases/${debt.purchase}`} className="text-xs text-accent hover:underline">Alışa bax →</Link>
                  )}
                </span>
              </label>
              <span className="text-right shrink-0">
                <span className="block text-sm font-mono font-semibold text-ink">{formatCurrency(debt.total_amount)}</span>
                {debt.is_paid
                  ? <span className="block text-xs font-mono text-success">Ödənilib</span>
                  : <span className="block text-xs font-mono text-danger">Qalıb: {formatCurrency(debt.remaining)}</span>}
              </span>
            </div>

            {debt.items.length > 0 ? (
              <div className="border-t border-rule/70 divide-y divide-rule/70">
                {debt.items.map(item => {
                  const checked = selectedItems[item.id] > 0
                  return (
                    <div key={item.id} className={`flex items-center gap-2 px-3 py-2 ${item.is_paid ? 'opacity-50' : ''}`}>
                      {item.is_paid ? (
                        <span className="text-success text-sm w-4 text-center shrink-0" title="Ödənilib">✓</span>
                      ) : (
                        <input type="checkbox" checked={checked} onChange={e => toggleItem(item, e.target.checked)} className="w-4 h-4 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink truncate">{item.product_name}</p>
                        <p className="text-xs text-ink-muted font-mono">
                          {item.quantity} {item.unit || 'ədəd'} × {formatCurrency(item.purchase_price)}
                          {item.paid_quantity > 0 && ` · ${item.paid_quantity} ödənilib`}
                          {!item.is_paid && ` · ${item.remaining_quantity} qalıb`}
                        </p>
                      </div>
                      {checked && item.remaining_quantity > 1 && (
                        <input type="number" min={1} max={item.remaining_quantity} value={selectedItems[item.id]}
                          onChange={e => setItemQty(item, e.target.value)}
                          className="input-mono w-14 py-1 px-1 text-xs text-center shrink-0" aria-label="Ödəniləcək say" />
                      )}
                      <span className="text-xs font-mono text-ink-soft shrink-0 w-20 text-right">
                        {item.is_paid ? '' : formatCurrency(checked ? selectedItems[item.id] * Number(item.purchase_price) : item.remaining_amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : !debt.is_paid && (
              <div className="border-t border-rule/70 px-3 py-2.5 flex gap-2">
                <input type="number" min="0.01" step="0.01" value={amountInputs[debt.id] ?? String(debt.remaining)}
                  onChange={e => setAmountInputs(prev => ({ ...prev, [debt.id]: e.target.value }))}
                  className="input-mono text-sm flex-1" aria-label="Ödəniləcək məbləğ" />
                <Button className="min-h-0 py-2 text-sm" loading={amountPayingId === debt.id} onClick={() => handlePayAmount(debt)}>Ödə</Button>
              </div>
            )}

            {!debt.purchase && debt.paid_amount === 0 && (
              <div className="border-t border-rule/70 px-3 py-1.5 flex justify-end">
                {confirmDeleteId === debt.id ? (
                  <span className="flex gap-2 items-center text-xs">
                    Silinsin?
                    <button onClick={() => handleDelete(debt.id)} disabled={deletingId === debt.id} className="font-semibold text-danger">Bəli</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="font-semibold text-ink-muted">Xeyr</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDeleteId(debt.id)} className="text-xs text-ink-muted hover:text-danger">Borcu sil</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {chosen.length > 0 && (
        <div className="sticky bottom-0 mt-4 -mx-6 px-6 py-3 bg-cream border-t border-rule flex items-center gap-3">
          <span className="text-sm text-ink flex-1">
            <span className="font-semibold">{chosen.length} məhsul</span> seçilib
            <span className="block font-mono font-bold text-lg">{formatCurrency(chosenTotal)}</span>
          </span>
          <Button loading={paying} onClick={handlePaySelected}>Ödə</Button>
        </div>
      )}
    </div>
  ) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-muted">Nisyə alışlardan yaranan borclar. Ödəniş kassadan çıxır, hesabata təsir etmir.</p>
        <Button onClick={() => { setCreating(true); setSelectedKey(null); setAddError('') }}>+ Borc yarat</Button>
      </div>

      {totalUnpaid > 0 && (
        <div className="bg-danger-bg border border-rule rounded px-6 py-4 mb-6 flex items-center justify-between">
          <div>
            <p className="section-label text-danger">Ümumi ödənilməmiş borc</p>
            <p className="font-mono font-semibold text-2xl text-danger mt-0.5">{formatCurrency(totalUnpaid)}</p>
          </div>
          <p className="text-sm text-danger">{unpaidCount} kreditor</p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-5">
        {([[false, 'Ödənilməmiş'], [true, 'Bütün kreditorlar']] as const).map(([paid, label]) => (
          <button key={label} onClick={() => setShowPaidGroups(paid)}
            className={`text-xs font-mono font-semibold uppercase tracking-wide px-3 py-2 rounded border transition-colors ${showPaidGroups === paid ? 'bg-ink text-cream border-ink' : 'bg-surface text-ink-muted border-rule hover:bg-surface-alt'}`}>
            {label}
          </button>
        ))}
      </div>

      <MasterDetailShell list={listPane} detail={detailPane} onClose={() => { setCreating(false); setSelectedKey(null) }} />
    </div>
  )
}

function SummaryBox({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  return (
    <div className="bg-surface border border-rule rounded px-3 py-2.5">
      <p className="section-label mb-1">{label}</p>
      <p className={`font-mono font-semibold text-sm ${tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
