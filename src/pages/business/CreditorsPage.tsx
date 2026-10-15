import { Fragment, useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import { SupplierDebt, SupplierDebtItem } from '@/types'
import { getSupplierDebts, createSupplierDebt, paySupplierDebt, paySupplierItems, deleteSupplierDebt } from '@/services/warehouse.service'
import { formatCurrency, formatDate, formatPhone, mapApiError } from '@/lib/utils'
import ComboboxInput from '@/components/ui/ComboboxInput'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import KpiCard from '@/components/ui/KpiCard'
import Modal from '@/components/ui/Modal'
import Money from '@/components/ui/Money'
import PageHeader from '@/components/ui/PageHeader'
import Segmented from '@/components/ui/Segmented'
import Spinner from '@/components/ui/Spinner'
import StatusBadge from '@/components/ui/StatusBadge'

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

function statusWord(group: SupplierGroup): string {
  if (group.isFullyPaid) return 'Ödənilib'
  if (group.totalPaid > 0) return 'Qismən ödənilib'
  return 'Ödənilməyib'
}

export default function CreditorsPage() {
  const [debts, setDebts] = useState<SupplierDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaidGroups, setShowPaidGroups] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  // Detail list: only the latest debts first; search narrows by product or qaimə №.
  const [itemSearch, setItemSearch] = useState('')
  const [showAllItems, setShowAllItems] = useState(false)

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
    setItemSearch(''); setShowAllItems(false)
  }

  function selectSupplier(key: string) {
    setCreating(false)
    setSelectedKey(prev => (prev === key ? null : key))
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

  const searchTerm = itemSearch.trim().toLowerCase()
  const matchesSearch = (debt: SupplierDebt) =>
    !searchTerm ||
    (debt.invoice_no ?? '').toLowerCase().includes(searchTerm) ||
    debt.items.some(i => i.product_name.toLowerCase().includes(searchTerm))
  // Newest first for browsing (the group is stored oldest-first).
  const listedDebts = selectedGroup
    ? [...selectedGroup.debts].reverse().filter(d => (showPaidGroups || !d.is_paid) && matchesSearch(d))
    : []
  const LATEST_COUNT = 10
  const shownDebts = searchTerm || showAllItems ? listedDebts : listedDebts.slice(0, LATEST_COUNT)

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

  const detailPanel = selectedGroup ? (
    <div className="px-5 py-5 bg-paper border-b border-border">
      <div className="grid grid-cols-3 gap-3 mb-4 max-w-xl">
        <div className="card px-3 py-2.5">
          <p className="font-sans text-label uppercase text-text-3 mb-1">Cəmi</p>
          <Money value={selectedGroup.totalAmount} className="!justify-start" />
        </div>
        <div className="card px-3 py-2.5">
          <p className="font-sans text-label uppercase text-text-3 mb-1">Ödənilib</p>
          <Money value={selectedGroup.totalPaid} meaning="income" sign="none" className="!justify-start" />
        </div>
        <div className="card px-3 py-2.5">
          <p className="font-sans text-label uppercase text-text-3 mb-1">Qalıq</p>
          <Money value={selectedGroup.remaining} meaning="payable" showWord={false} className="!justify-start" />
        </div>
      </div>

      {payNotice && <p className="text-small text-success-strong bg-success-subtle rounded px-3 py-2 mb-3">{payNotice}</p>}
      {payError && <p className="text-small text-danger-strong bg-danger-subtle rounded px-3 py-2 mb-3">{payError}</p>}

      {selectedGroup.hasUnpaid && allItems.some(i => !i.is_paid) && (
        <label className="flex items-center gap-2 text-body font-semibold text-ink mb-3 cursor-pointer">
          <input type="checkbox" checked={allUnpaidSelected} onChange={e => toggleAll(e.target.checked)} className="w-4 h-4" />
          Bütün ödənilməmiş məhsulları seç
        </label>
      )}

      <input
        type="search"
        value={itemSearch}
        onChange={e => setItemSearch(e.target.value)}
        placeholder="Məhsul adı və ya qaimə № ilə axtar"
        aria-label="Borclarda axtar"
        className="input mb-3 max-w-sm"
      />

      <div className="flex flex-col gap-3">
        {shownDebts.length === 0 && <p className="text-body text-text-3">Heç nə tapılmadı.</p>}
        {shownDebts.map(debt => (
          <div key={debt.id} className={`bg-surface border border-border rounded-md ${debt.is_paid ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
              <label className="flex items-start gap-2 min-w-0 cursor-pointer">
                {!debt.is_paid && debt.items.length > 0 && (
                  <input type="checkbox" checked={debtFullySelected(debt)} onChange={e => toggleDebt(debt, e.target.checked)} className="w-4 h-4 mt-1 shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="block text-body font-semibold text-ink">
                    {formatDate(debt.date)}{debt.invoice_no ? ` · qaimə № ${debt.invoice_no}` : ''}{debt.description ? ` — ${debt.description}` : ''}
                  </span>
                  {debt.purchase && (
                    <Link to={`/business/warehouse/purchases/${debt.purchase}`} className="text-small font-semibold text-ink underline underline-offset-2">Alışa bax →</Link>
                  )}
                </span>
              </label>
              <span className="text-right shrink-0 flex flex-col items-end">
                <Money value={debt.total_amount} />
                {debt.is_paid
                  ? <StatusBadge status="Ödənilib" className="mt-1" />
                  : <span className="text-small font-mono text-warning-strong">Qalıb: {formatCurrency(debt.remaining)}</span>}
              </span>
            </div>

            {debt.items.length > 0 ? (
              <div className="border-t border-border divide-y divide-border">
                {debt.items.map(item => {
                  const checked = selectedItems[item.id] > 0
                  return (
                    <div key={item.id} className={`flex items-center gap-3 px-4 py-2.5 ${item.is_paid ? 'opacity-50' : ''}`}>
                      {item.is_paid ? (
                        <span className="text-success text-body w-4 text-center shrink-0" title="Ödənilib">✓</span>
                      ) : (
                        <input type="checkbox" checked={checked} onChange={e => toggleItem(item, e.target.checked)} className="w-4 h-4 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-body text-ink truncate">{item.product_name}</p>
                        <p className="text-small text-text-3 font-mono">
                          {item.quantity} {item.unit || 'ədəd'} × {formatCurrency(item.purchase_price)}
                          {item.paid_quantity > 0 && ` · ${item.paid_quantity} ödənilib`}
                          {!item.is_paid && ` · ${item.remaining_quantity} qalıb`}
                        </p>
                      </div>
                      {checked && item.remaining_quantity > 1 && (
                        <input type="number" min={1} max={item.remaining_quantity} value={selectedItems[item.id]}
                          onChange={e => setItemQty(item, e.target.value)}
                          className="input-mono !w-16 !min-h-[36px] !py-1 !px-1 text-small text-center shrink-0" aria-label="Ödəniləcək say" />
                      )}
                      <span className="text-small font-mono tabular-nums text-text-2 shrink-0 w-24 text-right">
                        {item.is_paid ? '' : formatCurrency(checked ? selectedItems[item.id] * Number(item.purchase_price) : item.remaining_amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : !debt.is_paid && (
              <div className="border-t border-border px-4 py-3 flex gap-2">
                <input type="number" min="0.01" step="0.01" value={amountInputs[debt.id] ?? String(debt.remaining)}
                  onChange={e => setAmountInputs(prev => ({ ...prev, [debt.id]: e.target.value }))}
                  className="input-mono flex-1" aria-label="Ödəniləcək məbləğ" />
                <Button loading={amountPayingId === debt.id} onClick={() => handlePayAmount(debt)}>Ödə</Button>
              </div>
            )}

            {!debt.purchase && debt.paid_amount === 0 && (
              <div className="border-t border-border px-4 py-2 flex justify-end">
                <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setConfirmDeleteId(debt.id)}>Borcu sil</Button>
              </div>
            )}
          </div>
        ))}
        {!searchTerm && !showAllItems && listedDebts.length > LATEST_COUNT && (
          <Button variant="secondary" onClick={() => setShowAllItems(true)}>Hamısını göstər ({listedDebts.length})</Button>
        )}
      </div>

      {chosen.length > 0 && (
        <div className="mt-4 px-5 py-4 bg-ink rounded-lg flex items-center gap-4">
          <span className="text-body text-paper flex-1">
            <span className="font-semibold">{chosen.length} məhsul</span> seçilib
            <span className="block font-mono font-semibold text-[26px] leading-9">{formatCurrency(chosenTotal)}</span>
          </span>
          <Button variant="secondary" loading={paying} onClick={handlePaySelected}>Ödə</Button>
        </div>
      )}
    </div>
  ) : null

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Maliyyə · Kreditorlar"
        subtitle="Nisyə alışlardan yaranan borclar. Ödəniş kassadan çıxır, hesabata təsir etmir."
        actions={<Button icon={Plus} onClick={() => { setCreating(true); setAddError('') }}>Borc yarat</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Ümumi ödənilməmiş borc"
          value={totalUnpaid}
          money
          meaning="payable"
          note={`${unpaidCount} kreditor · Ödəniləcək`}
        />
      </div>

      <Segmented
        label="Filtr"
        value={showPaidGroups ? 'all' : 'unpaid'}
        onChange={k => setShowPaidGroups(k === 'all')}
        options={[{ key: 'unpaid', label: 'Ödənilməmiş' }, { key: 'all', label: 'Bütün kreditorlar' }]}
      />

      {loading && debts.length === 0 ? <Spinner /> : visibleGroups.length === 0 ? (
        <EmptyState title="Heç bir borc yoxdur" subtitle="Bütün kreditorlara ödənilib." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ledger-table min-w-[760px]">
              <thead>
                <tr>
                  <th className="ledger-th w-8" />
                  <th className="ledger-th">Tədarükçü</th>
                  <th className="ledger-th">Telefon</th>
                  <th className="ledger-th">Status</th>
                  <th className="ledger-th text-right">Cəmi</th>
                  <th className="ledger-th text-right">Ödənilib</th>
                  <th className="ledger-th text-right">Qalıq</th>
                </tr>
              </thead>
              <tbody>
                {visibleGroups.map(group => {
                  const open = selectedKey === group.key
                  return (
                    <Fragment key={group.key}>
                      <tr onClick={() => selectSupplier(group.key)} className={`ledger-row ${open ? 'ledger-row-selected' : ''}`}>
                        <td className="ledger-td !pr-0">
                          <ChevronRight size={18} strokeWidth={1.75} className={`text-text-3 transition-transform duration-[160ms] ${open ? 'rotate-90' : ''}`} />
                        </td>
                        <td className="ledger-td font-semibold">
                          {group.storeId != null ? (
                            <Link to={`/business/stores/${group.storeId}`} onClick={e => e.stopPropagation()} className="hover:underline underline-offset-2">{group.name}</Link>
                          ) : group.name}
                        </td>
                        <td className="ledger-td font-mono text-text-2">{formatPhone(group.phone) || '—'}</td>
                        <td className="ledger-td"><StatusBadge status={statusWord(group)} /></td>
                        <td className="ledger-td text-right"><Money value={group.totalAmount} /></td>
                        <td className="ledger-td text-right"><Money value={group.totalPaid} meaning="income" sign="none" /></td>
                        <td className="ledger-td text-right"><Money value={group.remaining} meaning="payable" showWord={false} /></td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={7} className="p-0">{detailPanel}</td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2">
                  <td className="ledger-td font-semibold" colSpan={4}>Cəmi · {visibleGroups.length} kreditor</td>
                  <td className="ledger-td text-right"><Money value={visibleGroups.reduce((s, g) => s + g.totalAmount, 0)} className="font-bold" /></td>
                  <td className="ledger-td text-right"><Money value={visibleGroups.reduce((s, g) => s + g.totalPaid, 0)} meaning="income" sign="none" className="font-bold" /></td>
                  <td className="ledger-td text-right"><Money value={visibleGroups.reduce((s, g) => s + g.remaining, 0)} meaning="payable" showWord={false} className="font-bold" /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={creating}
        title="Borc yarat"
        subtitle="Mal alışı ilə bağlı olmayan borc"
        onClose={() => setCreating(false)}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Ləğv et</Button>
            <Button type="submit" form="creditor-debt-form" loading={adding}>Əlavə et</Button>
          </>
        }
      >
        <form id="creditor-debt-form" onSubmit={handleAdd} className="flex flex-col gap-4 pb-2">
          <p className="text-small text-text-3">Mal alışı ilə bağlı olmayan borc üçün (məs. sistemdən əvvəlki köhnə borc). Mal alanda "Stok → Alışlar"dan nisyə alış edin.</p>
          <div>
            <label className="label">Kreditor adı <span className="text-danger normal-case">*</span></label>
            <ComboboxInput value={newSupplier} onChange={setNewSupplier} options={supplierNames} placeholder="Məs. Avtoehtiyat MMC" autoFocus />
          </div>
          <div>
            <label className="label">Telefon <span className="text-text-3 normal-case font-normal">(ixtiyari)</span></label>
            <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+994 50 000 00 00" className="input" />
          </div>
          <div>
            <label className="label">Açıqlama <span className="text-text-3 normal-case font-normal">(ixtiyari)</span></label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Məs. Köhnə borc" className="input" />
          </div>
          <div>
            <label className="label">Məbləğ <span className="text-danger normal-case">*</span></label>
            <input value={newAmount} onChange={e => setNewAmount(e.target.value)} type="number" min="0.01" step="0.01" placeholder="0.00" className="input-mono" />
          </div>
          {addError && <p className="text-small text-danger-strong bg-danger-subtle rounded px-3 py-2">{addError}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Borc silinsin?"
        message="Bu borc qeydi silinəcək. Bu əməliyyat geri qaytarıla bilməz."
        confirmLabel={deletingId !== null ? '...' : 'Bəli, sil'}
        cancelLabel="Xeyr"
        danger
        onConfirm={() => confirmDeleteId !== null && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
