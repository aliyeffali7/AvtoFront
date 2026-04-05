import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { FinanceRecord } from '@/types'
import { getFinanceRecords, createFinanceRecord, deleteFinanceRecord, getDayNote, saveDayNote } from '@/services/finance.service'
import { formatCurrency, formatDate, mapApiError } from '@/lib/utils'

type Period = 'day' | 'week' | 'month' | 'all' | 'custom'
type TypeFilter = 'all' | 'income' | 'expense'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Bugün' },
  { key: 'week', label: 'Bu həftə' },
  { key: 'month', label: 'Bu ay' },
  { key: 'all', label: 'Hamısı' },
  { key: 'custom', label: 'Tarix seç' },
]

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getPeriodRange(period: Period): { start: string | null; end: string | null } {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  if (period === 'day') return { start: today, end: today }
  if (period === 'week') {
    const d = new Date(now)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return { start: d.toISOString().slice(0, 10), end: today }
  }
  if (period === 'month') {
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    return { start, end: today }
  }
  return { start: null, end: null }
}

function filterByRange(records: FinanceRecord[], start: string | null, end: string | null) {
  return records.filter(r => {
    const d = r.date.slice(0, 10)
    if (start && d < start) return false
    if (end && d > end) return false
    return true
  })
}

// ── Add record drawer ────────────────────────────────────────────────────────

function AddRecordDrawer({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function reset() { setAmount(''); setDescription(''); setType('income'); setError('') }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await createFinanceRecord({ type, amount: parseFloat(amount), description })
      reset(); onAdded(); onClose()
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Yeni qeyd</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Növ</label>
            <div className="flex rounded-xl border border-gray-300 overflow-hidden">
              <button type="button" onClick={() => setType('income')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${type === 'income' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                Gəlir
              </button>
              <button type="button" onClick={() => setType('expense')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${type === 'expense' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                Xərc
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Məbləğ (₼)</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} required type="number" step="0.01" min="0.01" placeholder="0.00" className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Açıqlama</label>
            <input value={description} onChange={e => setDescription(e.target.value)} required placeholder="Məs. Ehtiyat hissəsi alışı" className="input" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary mt-2">{loading ? 'Saxlanılır...' : 'Saxla'}</button>
          <button type="button" onClick={onClose} className="btn-ghost">Ləğv et</button>
        </form>
      </div>
    </div>
  )
}

// ── End of day modal ─────────────────────────────────────────────────────────

function EndDayModal({ records, onClose }: { records: FinanceRecord[]; onClose: () => void }) {
  const today = getToday()
  const todayRecords = records.filter(r => r.date.slice(0, 10) === today)
  const income = todayRecords.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0)
  const expense = todayRecords.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0)
  const net = income - expense
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getDayNote(today).then(r => setComment(r.data.note)).catch(() => {})
  }, [today])

  async function handleClose() {
    setSaving(true)
    try { await saveDayNote(today, comment) } catch { /* ignore */ } finally { setSaving(false) }
    onClose()
  }

  function handlePrint() {
    const content = printRef.current?.innerHTML ?? ''
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><title>Günlük Hesabat</title>
      <style>body{font-family:sans-serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse}
      td,th{padding:8px 12px;border-bottom:1px solid #eee;text-align:left}
      .right{text-align:right}.green{color:#16a34a}.red{color:#dc2626}
      h2{margin-bottom:4px}p{color:#6b7280;margin:0 0 16px}
      .note-box{margin-top:24px;border-top:1px solid #e5e7eb;padding-top:14px}
      .note-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:4px}
      .note-text{font-size:13px;color:#111827;white-space:pre-wrap;margin:0}</style>
      </head><body>${content}</body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Günün bağlanışı</h2>
            <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Printable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5" ref={printRef}>
          <h2 className="text-base font-bold text-gray-900">Avtoservis CRM — Günlük Hesabat</h2>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            {new Date().toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <p className="text-xs text-green-600 font-medium mb-0.5">Gəlir</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(income)}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-xs text-red-600 font-medium mb-0.5">Xərc</p>
              <p className="text-lg font-bold text-red-700">{formatCurrency(expense)}</p>
            </div>
            <div className={`border rounded-xl px-4 py-3 ${net >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs font-medium mb-0.5 ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Xalis</p>
              <p className={`text-lg font-bold ${net >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{net >= 0 ? '+' : ''}{formatCurrency(net)}</p>
            </div>
          </div>

          {/* Transactions */}
          {todayRecords.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Bu gün heç bir əməliyyat yoxdur.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs text-gray-500 font-semibold pb-2">Açıqlama</th>
                  <th className="text-left text-xs text-gray-500 font-semibold pb-2">Növ</th>
                  <th className="text-right text-xs text-gray-500 font-semibold pb-2">Məbləğ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todayRecords.map(r => (
                  <tr key={r.id}>
                    <td className="py-2.5 text-gray-700 pr-4">{r.description}</td>
                    <td className="py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {r.type === 'income' ? 'Gəlir' : 'Xərc'}
                      </span>
                    </td>
                    <td className={`py-2.5 text-right font-semibold ${r.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {r.type === 'income' ? '+' : '-'}{formatCurrency(Number(r.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Comment — at the end, only rendered if filled, appears in print */}
          {comment.trim() && (
            <div className="note-box" style={{ marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '14px' }}>
              <p className="note-label" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '4px' }}>Qeyd</p>
              <p className="note-text" style={{ fontSize: '13px', color: '#111827', whiteSpace: 'pre-wrap', margin: 0 }}>{comment}</p>
            </div>
          )}
        </div>

        {/* Comment input */}
        <div className="px-6 pt-3 pb-2 border-t border-gray-100">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Qeyd</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            placeholder="Bu gün üçün qeyd əlavə edin..."
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-800 placeholder:text-gray-400"
          />
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Çap et
          </button>
          <button
            onClick={handleClose}
            disabled={saving}
            className="flex-1 bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saxlanılır...' : 'Günü bağla'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FinanceClient() {
  const [records, setRecords] = useState<FinanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [endDayOpen, setEndDayOpen] = useState(false)
  const [period, setPeriod] = useState<Period>('day')
  const [customDate, setCustomDate] = useState(getToday())
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [pageNote, setPageNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getFinanceRecords()
      setRecords(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const singleDate = period === 'day' ? getToday() : period === 'custom' ? customDate : null

  useEffect(() => {
    if (!singleDate) { setPageNote(''); return }
    getDayNote(singleDate).then(r => setPageNote(r.data.note)).catch(() => setPageNote(''))
  }, [singleDate, endDayOpen]) // re-fetch after modal closes

  async function handleDeleteRecord(id: number) {
    setDeletingId(id)
    try {
      await deleteFinanceRecord(id)
      setRecords(prev => prev.filter(r => r.id !== id))
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const periodFiltered = useMemo(() => {
    if (period === 'custom') return filterByRange(records, customDate, customDate)
    const { start, end } = getPeriodRange(period)
    return filterByRange(records, start, end)
  }, [records, period, customDate])

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return periodFiltered
    return periodFiltered.filter(r => r.type === typeFilter)
  }, [periodFiltered, typeFilter])

  const income = periodFiltered.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0)
  const expense = periodFiltered.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0)
  const net = income - expense

  const periodLabel = period === 'custom'
    ? customDate
    : PERIODS.find(p => p.key === period)?.label ?? ''

  function exportPDF() {
    const rows = periodFiltered.map(r => `
      <tr>
        <td>${r.date.slice(0, 10)}</td>
        <td>${r.description || '—'}</td>
        <td><span class="${r.type === 'income' ? 'income' : 'expense'}">${r.type === 'income' ? 'Gəlir' : 'Xərc'}</span></td>
        <td class="amount ${r.type === 'income' ? 'income' : 'expense'}">${r.type === 'income' ? '+' : '-'}${Number(r.amount).toFixed(2)} ₼</td>
      </tr>`).join('')

    const noteHtml = singleDate && pageNote
      ? `<div class="note-box"><p class="note-label">Gün qeydi</p><p class="note-text">${pageNote.replace(/\n/g, '<br>')}</p></div>`
      : ''

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Maliyyə Hesabatı — ${periodLabel}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:sans-serif;padding:32px;color:#111;font-size:13px}
      h1{font-size:18px;font-weight:700;margin-bottom:4px}
      .sub{color:#6b7280;margin-bottom:24px;font-size:12px}
      .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px}
      .card{border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px}
      .card-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
      .card-value{font-size:20px;font-weight:700}
      .green{color:#16a34a}.red{color:#dc2626}.blue{color:#2563eb}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;padding:8px 10px;border-bottom:2px solid #e5e7eb}
      td{padding:9px 10px;border-bottom:1px solid #f3f4f6}
      tr:last-child td{border-bottom:none}
      .amount{text-align:right;font-weight:600}
      .income{color:#16a34a}.expense{color:#dc2626}
      .note-box{margin-top:28px;border-top:1px solid #e5e7eb;padding-top:16px}
      .note-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:6px}
      .note-text{font-size:13px;color:#111;line-height:1.6}
    </style></head><body>
    <h1>Maliyyə Hesabatı</h1>
    <p class="sub">${periodLabel} · Gəlir: ${income.toFixed(2)} ₼ · Xərc: ${expense.toFixed(2)} ₼ · Xalis: ${net >= 0 ? '+' : ''}${net.toFixed(2)} ₼</p>
    <div class="summary">
      <div class="card"><p class="card-label green">Gəlir</p><p class="card-value green">${income.toFixed(2)} ₼</p></div>
      <div class="card"><p class="card-label red">Xərc</p><p class="card-value red">${expense.toFixed(2)} ₼</p></div>
      <div class="card"><p class="card-label ${net >= 0 ? 'blue' : 'red'}">Xalis</p><p class="card-value ${net >= 0 ? 'blue' : 'red'}">${net >= 0 ? '+' : ''}${net.toFixed(2)} ₼</p></div>
    </div>
    ${periodFiltered.length === 0 ? '<p style="color:#6b7280;text-align:center;padding:32px 0">Bu dövr üzrə əməliyyat yoxdur.</p>' : `
    <table>
      <thead><tr><th>Tarix</th><th>Açıqlama</th><th>Növ</th><th style="text-align:right">Məbləğ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`}
    ${noteHtml}
    </body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Maliyyə</h1>
            <p className="text-sm text-gray-500 mt-0.5">{periodLabel} üzrə hesabat</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF
            </button>
            <button
              onClick={() => setEndDayOpen(true)}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Günü bağla
            </button>
            <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Qeyd əlavə et
            </button>
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex flex-wrap gap-1 bg-gray-100 rounded-2xl p-1">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  period === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.key === 'custom' && (
                  <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom single date */}
        {period === 'custom' && (
          <div className="flex items-center gap-3 mb-6 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 w-fit">
            <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-blue-600 font-medium">Tarix seçin</label>
              <input
                type="date"
                value={customDate}
                max={getToday()}
                onChange={e => setCustomDate(e.target.value)}
                className="text-sm border border-blue-200 bg-white rounded-lg px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">Gəlir</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(income)}</p>
            <p className="text-xs text-gray-400 mt-1">{periodFiltered.filter(r => r.type === 'income').length} əməliyyat</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">Xərc</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(expense)}</p>
            <p className="text-xs text-gray-400 mt-1">{periodFiltered.filter(r => r.type === 'expense').length} əməliyyat</p>
          </div>

          <div className={`rounded-2xl border px-5 py-5 ${net >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${net >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>
                <svg className={`w-4 h-4 ${net >= 0 ? 'text-green-700' : 'text-red-700'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">Xalis mənfəət</p>
            </div>
            <p className={`text-2xl font-bold ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>{net >= 0 ? '+' : ''}{formatCurrency(net)}</p>
            <p className="text-xs text-gray-400 mt-1">{periodFiltered.length} əməliyyat</p>
          </div>
        </div>

        {/* Table filter */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['all', 'income', 'expense'] as TypeFilter[]).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  typeFilter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'all' ? 'Hamısı' : t === 'income' ? 'Gəlir' : 'Xərc'}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{filtered.length} qeyd</p>
        </div>

        {/* Records table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <p className="text-gray-900 font-medium">Qeyd tapılmadı</p>
            <p className="text-gray-500 text-sm mt-1">Seçilmiş filtr üzrə heç bir əməliyyat yoxdur.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Tarix</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Növ</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Açıqlama</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Məbləğ</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${r.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {r.type === 'income' ? 'Gəlir' : 'Xərc'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{r.description}</td>
                    <td className={`px-5 py-4 text-right text-sm font-semibold whitespace-nowrap ${r.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {r.type === 'income' ? '+' : '-'}{formatCurrency(Number(r.amount))}
                    </td>
                    <td className="px-3 py-4 text-right whitespace-nowrap">
                      {confirmDeleteId === r.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-gray-500">Silinsin?</span>
                          <button
                            onClick={() => handleDeleteRecord(r.id)}
                            disabled={deletingId === r.id}
                            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {deletingId === r.id ? '...' : 'Bəli'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            Xeyr
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                          title="Ləğv et"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}


        {/* Saved day note */}
        {singleDate && pageNote && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Gün qeydi</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{pageNote}</p>
          </div>
        )}
      </div>

      <AddRecordDrawer open={addOpen} onClose={() => setAddOpen(false)} onAdded={load} />
      {endDayOpen && <EndDayModal records={records} onClose={() => setEndDayOpen(false)} />}
    </>
  )
}
