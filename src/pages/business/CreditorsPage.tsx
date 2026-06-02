import { useState, useEffect, useCallback } from 'react'
import { SupplierDebt } from '@/types'
import { getSupplierDebts, getSupplierNames, createSupplierDebt, paySupplierDebt, deleteSupplierDebt, updateSupplierDebt } from '@/services/warehouse.service'
import { formatCurrency } from '@/lib/utils'

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

export default function CreditorsPage() {
  const [debts, setDebts]           = useState<SupplierDebt[]>([])
  const [supplierNames, setSupplierNames] = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [showPaidGroups, setShowPaidGroups] = useState(false)
  const [expandedName, setExpandedName]     = useState<string | null>(null)

  // Pay state
  const [payingId, setPayingId]     = useState<number | null>(null)
  const [payInputs, setPayInputs]   = useState<Record<number, string>>({})
  const [payErrors, setPayErrors]   = useState<Record<number, string>>({})

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId]           = useState<number | null>(null)

  // Add drawer
  const [addOpen, setAddOpen]       = useState(false)
  const [newSupplier, setNewSupplier] = useState('')
  const [newPhone, setNewPhone]     = useState('')
  const [newDesc, setNewDesc]       = useState('')
  const [newAmount, setNewAmount]   = useState('')
  const [adding, setAdding]         = useState(false)
  const [addError, setAddError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [debtsRes, namesRes] = await Promise.all([
        getSupplierDebts(true),   // always fetch all
        getSupplierNames(),
      ])
      setDebts(debtsRes.data)
      setSupplierNames(namesRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const groups = groupBySupplier(debts)
  const visibleGroups = showPaidGroups ? groups : groups.filter(g => g.hasUnpaid)
  const totalUnpaid = groups.filter(g => g.hasUnpaid).reduce((s, g) => s + g.remaining, 0)
  const unpaidCount = groups.filter(g => g.hasUnpaid).length

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
      setNewSupplier(''); setNewPhone(''); setNewDesc(''); setNewAmount('')
      setAddOpen(false)
      load()
    } catch {
      setAddError('Xəta baş verdi.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kreditorlar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Məhsul alışından yaranan borclar</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl min-h-[44px] transition-colors"
        >
          + Borc yarat
        </button>
      </div>

      {/* Summary */}
      {totalUnpaid > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Ümumi ödənilməmiş borc</p>
            <p className="text-2xl font-bold text-orange-700 mt-0.5">{formatCurrency(totalUnpaid)}</p>
          </div>
          <p className="text-sm text-orange-500">{unpaidCount} kreditor</p>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setShowPaidGroups(false)}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${!showPaidGroups ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Ödənilməmiş
        </button>
        <button
          onClick={() => setShowPaidGroups(true)}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${showPaidGroups ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Bütün kreditorlar
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : visibleGroups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium">Heç bir borc yoxdur</p>
          <p className="text-gray-500 text-sm mt-1">Bütün kreditorlara ödənilib.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleGroups.map(group => {
            const isOpen = expandedName === group.name
            return (
              <div key={group.name} className={`bg-white rounded-2xl border transition-colors ${group.isFullyPaid ? 'border-gray-200' : 'border-orange-200'}`}>
                {/* Kreditor card header — click to expand */}
                <button
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                  onClick={() => setExpandedName(isOpen ? null : group.name)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-gray-900 text-base">{group.name}</span>
                      {group.isFullyPaid ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Ödənilib</span>
                      ) : group.totalPaid > 0 ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Qismən</span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Ödənilməyib</span>
                      )}
                      <span className="text-xs text-gray-400">{group.debts.length} borc</span>
                    </div>
                    {group.phone && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {group.phone}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Cəmi</p>
                      <p className="font-bold text-gray-900">{formatCurrency(group.totalAmount)}</p>
                      {!group.isFullyPaid && (
                        <p className="text-sm font-bold text-orange-600">Borc: {formatCurrency(group.remaining)}</p>
                      )}
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded: list of individual debts */}
                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {group.debts.map(debt => (
                      <div key={debt.id} className={`px-5 py-4 ${debt.is_paid ? 'opacity-60' : ''}`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            {debt.description && (
                              <p className="text-sm font-medium text-gray-800">{debt.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">{debt.date}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-gray-900">{formatCurrency(debt.total_amount)}</p>
                            {debt.paid_amount > 0 && (
                              <p className="text-xs text-green-600">Ödənilib: {formatCurrency(debt.paid_amount)}</p>
                            )}
                            {!debt.is_paid && (
                              <p className="text-xs font-semibold text-orange-600">Qalıb: {formatCurrency(debt.remaining)}</p>
                            )}
                          </div>
                        </div>

                        {/* Pay row */}
                        {!debt.is_paid && (
                          <div className="flex gap-2 mt-2">
                            <div className="relative flex-1">
                              <input
                                type="number" min="0.01" step="0.01"
                                value={payInputs[debt.id] ?? debt.remaining.toFixed(2)}
                                onChange={e => {
                                  setPayInputs(prev => ({ ...prev, [debt.id]: e.target.value }))
                                  setPayErrors(prev => ({ ...prev, [debt.id]: '' }))
                                }}
                                className={`input text-sm pr-7 ${payErrors[debt.id] ? 'border-red-400' : ''}`}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₼</span>
                            </div>
                            <button
                              onClick={() => setPayInputs(prev => ({ ...prev, [debt.id]: debt.remaining.toFixed(2) }))}
                              className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
                            >
                              Tam
                            </button>
                            <button
                              onClick={() => handlePay(debt)}
                              disabled={payingId === debt.id}
                              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl shrink-0"
                            >
                              {payingId === debt.id ? '...' : 'Ödə'}
                            </button>
                            {confirmDeleteId === debt.id ? (
                              <div className="flex gap-1 items-center shrink-0">
                                <button onClick={() => handleDelete(debt.id)} disabled={deletingId === debt.id} className="text-xs bg-red-600 text-white px-2.5 py-2 rounded-xl hover:bg-red-700 disabled:opacity-60">Bəli</button>
                                <button onClick={() => setConfirmDeleteId(null)} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-2 rounded-xl">Xeyr</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDeleteId(debt.id)} className="p-2 text-gray-300 hover:text-red-500 shrink-0">
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
                                <button onClick={() => handleDelete(debt.id)} disabled={deletingId === debt.id} className="text-xs bg-red-600 text-white px-2.5 py-1.5 rounded-xl hover:bg-red-700 disabled:opacity-60">Bəli, sil</button>
                                <button onClick={() => setConfirmDeleteId(null)} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-xl">Xeyr</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDeleteId(debt.id)} className="text-xs text-gray-400 hover:text-red-500">Sil</button>
                            )}
                          </div>
                        )}

                        {payErrors[debt.id] && (
                          <p className="text-xs text-red-600 mt-1.5">{payErrors[debt.id]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add manual debt drawer */}
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
            <form onSubmit={handleAdd} className="flex-1 flex flex-col gap-4 px-6 py-6 overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Kreditor adı <span className="text-red-500">*</span></label>
                <input
                  list="creditor-names-list"
                  value={newSupplier}
                  onChange={e => setNewSupplier(e.target.value)}
                  placeholder="Məs. Avtoehtiyat MMC"
                  className="input"
                  autoFocus
                />
                <datalist id="creditor-names-list">
                  {supplierNames.map(n => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Telefon <span className="text-xs font-normal text-gray-400">(ixtiyari)</span></label>
                <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+994 50 000 00 00" className="input" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Məhsul / Açıqlama <span className="text-xs font-normal text-gray-400">(ixtiyari)</span></label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Məs. Mühərrik yağı 5L" className="input" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Məbləğ <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input value={newAmount} onChange={e => setNewAmount(e.target.value)} type="number" min="0.01" step="0.01" placeholder="0.00" className="input pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">₼</span>
                </div>
              </div>
              {addError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{addError}</p>}
              <div className="flex flex-col gap-3 pt-2">
                <button type="submit" disabled={adding} className="btn-primary">{adding ? 'Əlavə edilir...' : 'Əlavə et'}</button>
                <button type="button" onClick={() => setAddOpen(false)} className="btn-ghost">Ləğv et</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
