import { useState, useEffect, useCallback } from 'react'
import { SupplierDebt } from '@/types'
import { getSupplierDebts, createSupplierDebt, paySupplierDebt, deleteSupplierDebt } from '@/services/warehouse.service'
import { formatCurrency } from '@/lib/utils'

export default function CreditorsPage() {
  const [debts, setDebts] = useState<SupplierDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaid, setShowPaid] = useState(false)

  // Pay state
  const [payingId, setPayingId] = useState<number | null>(null)
  const [payInputs, setPayInputs] = useState<Record<number, string>>({})
  const [payErrors, setPayErrors] = useState<Record<number, string>>({})

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Add manual debt drawer
  const [addOpen, setAddOpen] = useState(false)
  const [newSupplier, setNewSupplier] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getSupplierDebts(showPaid)
      setDebts(res.data)
    } finally {
      setLoading(false)
    }
  }, [showPaid])

  useEffect(() => { load() }, [load])

  async function handlePay(debt: SupplierDebt) {
    const remaining = debt.remaining
    const amount = parseFloat(payInputs[debt.id] ?? remaining.toFixed(2)) || 0
    if (amount <= 0) {
      setPayErrors(prev => ({ ...prev, [debt.id]: 'Məbləğ 0-dan böyük olmalıdır.' }))
      return
    }
    if (amount > remaining + 0.001) {
      setPayErrors(prev => ({ ...prev, [debt.id]: `Məbləğ qalan borcu (${formatCurrency(remaining)}) aşa bilməz.` }))
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
        description: newDesc.trim(),
        total_amount: amount,
      })
      setNewSupplier(''); setNewDesc(''); setNewAmount('')
      setAddOpen(false)
      load()
    } catch {
      setAddError('Xəta baş verdi.')
    } finally {
      setAdding(false)
    }
  }

  const totalDebt = debts.filter(d => !d.is_paid).reduce((s, d) => s + d.remaining, 0)

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kreditorlar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Məhsul alışından yaranan borclar</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl min-h-[44px] transition-colors"
        >
          + Borc əlavə et
        </button>
      </div>

      {/* Summary */}
      {totalDebt > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Ümumi ödənilməmiş borc</p>
            <p className="text-2xl font-bold text-orange-700 mt-0.5">{formatCurrency(totalDebt)}</p>
          </div>
          <p className="text-sm text-orange-500">{debts.filter(d => !d.is_paid).length} kreditor</p>
        </div>
      )}

      {/* Show paid toggle */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setShowPaid(false)}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${!showPaid ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Ödənilməmiş
        </button>
        <button
          onClick={() => setShowPaid(true)}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${showPaid ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Bütün borclar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : debts.length === 0 ? (
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
          {debts.map(debt => (
            <div key={debt.id} className={`bg-white rounded-2xl border px-5 py-4 ${debt.is_paid ? 'border-gray-200 opacity-60' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-gray-900">{debt.supplier_name}</span>
                    {debt.is_paid ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Ödənilib</span>
                    ) : debt.paid_amount > 0 ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Qismən</span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Ödənilməyib</span>
                    )}
                  </div>
                  {debt.description && (
                    <p className="text-sm text-gray-500">{debt.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{debt.date}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">Cəmi</p>
                  <p className="text-base font-bold text-gray-900">{formatCurrency(debt.total_amount)}</p>
                  {debt.paid_amount > 0 && (
                    <p className="text-xs text-green-600">Ödənilib: {formatCurrency(debt.paid_amount)}</p>
                  )}
                  {!debt.is_paid && (
                    <p className="text-sm font-bold text-orange-600">Borc: {formatCurrency(debt.remaining)}</p>
                  )}
                </div>
              </div>

              {/* Pay / delete actions */}
              {!debt.is_paid && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
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
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl shrink-0 transition-colors"
                    >
                      {payingId === debt.id ? '...' : 'Ödə'}
                    </button>
                    {confirmDeleteId === debt.id ? (
                      <div className="flex gap-1 items-center shrink-0">
                        <button
                          onClick={() => handleDelete(debt.id)}
                          disabled={deletingId === debt.id}
                          className="text-xs bg-red-600 text-white px-2.5 py-2 rounded-xl hover:bg-red-700 disabled:opacity-60"
                        >
                          Bəli
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs bg-gray-100 text-gray-700 px-2.5 py-2 rounded-xl hover:bg-gray-200"
                        >
                          Xeyr
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(debt.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                        title="Sil"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {payErrors[debt.id] && (
                    <p className="text-xs text-red-600 mt-1.5">{payErrors[debt.id]}</p>
                  )}
                </div>
              )}

              {/* Paid — only delete */}
              {debt.is_paid && (
                <div className="pt-2 border-t border-gray-100 flex justify-end">
                  {confirmDeleteId === debt.id ? (
                    <div className="flex gap-1 items-center">
                      <button onClick={() => handleDelete(debt.id)} disabled={deletingId === debt.id} className="text-xs bg-red-600 text-white px-2.5 py-1.5 rounded-xl hover:bg-red-700 disabled:opacity-60">Bəli, sil</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-xl hover:bg-gray-200">Xeyr</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(debt.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Sil</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add manual debt drawer */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setAddOpen(false)} />
          <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-semibold text-gray-900">Yeni borc əlavə et</h2>
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
                  value={newSupplier}
                  onChange={e => setNewSupplier(e.target.value)}
                  placeholder="Məs. Avtoehtiyat MMC"
                  className="input"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Məhsul / açıqlama</label>
                <input
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Məs. Yağ filteri × 5"
                  className="input"
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
              <div className="flex flex-col gap-3 pt-2">
                <button type="submit" disabled={adding} className="btn-primary">
                  {adding ? 'Əlavə edilir...' : 'Əlavə et'}
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
