import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileDown, CheckCircle2 } from 'lucide-react'
import { FinanceRecord, FinanceCategory } from '@/types'
import { getFinanceRecords, createFinanceRecord, deleteFinanceRecord, getDayNote, saveDayNote } from '@/services/finance.service'
import { formatCurrency, formatDate, mapApiError, toLocalISODate } from '@/lib/utils'
import { loadDraft, saveDraft } from '@/lib/formDraft'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import PeriodFilter from '@/components/ui/PeriodFilter'
import { Period, isPeriodKey, makePeriod, periodLabel as describePeriod, periodRange } from '@/lib/period'

type TypeFilter = 'all' | 'income' | 'expense'

// Kassaya baxılan qeyddən (məs. sifarişə keçib "geri" qayıdanda) filtrlərin sıfırlanmaması üçün.
const FINANCE_FILTERS_KEY = 'avtoservis:filters:finance:v2'

interface SavedFinanceFilters {
  period: Period
  typeFilter: TypeFilter
}

function getToday() {
  return toLocalISODate(new Date())
}

// ── Add record inline form ───────────────────────────────────────────────────

const EXPENSE_CATEGORIES: { value: FinanceCategory; label: string }[] = [
  { value: 'parts', label: 'Ehtiyat hissə' },
  { value: 'salary', label: 'Əmək haqqı' },
  { value: 'rent', label: 'İcarə' },
  { value: 'utilities', label: 'Kommunal' },
  { value: 'other', label: 'Digər' },
  { value: 'owner_draw', label: 'Sahibkar götürdü' },
]

const INCOME_CATEGORIES: { value: FinanceCategory; label: string }[] = [
  { value: 'other', label: 'Digər gəlir' },
  { value: 'owner_deposit', label: 'Sahibkar qoydu' },
]

// Owner's own money moving in/out: real kassa cash, but not profit or expense.
const OWNER_CATEGORY_LABELS: Partial<Record<FinanceCategory, string>> = {
  owner_draw: 'Sahibkar götürdü',
  owner_deposit: 'Sahibkar qoydu',
}

function AddRecordForm({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [category, setCategory] = useState<FinanceCategory>('other')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function reset() { setAmount(''); setDescription(''); setType('income'); setCategory('other'); setError('') }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await createFinanceRecord({
        type,
        amount: parseFloat(amount),
        description,
        date: toLocalISODate(new Date()),
        category,
      })
      reset(); onAdded(); onClose()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <p className="card-title">Yeni qeyd</p>
        <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink transition-colors" aria-label="Bağla">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="label">Növ</label>
            <div className="flex border border-rule rounded overflow-hidden">
              <button type="button" onClick={() => { setType('income'); setCategory('other') }}
                className={`px-4 py-2.5 text-sm font-semibold transition-colors ${type === 'income' ? 'bg-success text-cream' : 'bg-surface text-ink-soft hover:bg-surface-alt'}`}>
                Gəlir
              </button>
              <button type="button" onClick={() => { setType('expense'); setCategory('other') }}
                className={`px-4 py-2.5 text-sm font-semibold transition-colors border-l border-rule ${type === 'expense' ? 'bg-danger text-cream' : 'bg-surface text-ink-soft hover:bg-surface-alt'}`}>
                Xərc
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <label className="label">Maddə</label>
            <select value={category} onChange={e => setCategory(e.target.value as FinanceCategory)} className="input">
              {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
            <label className="label">Məbləğ (₼)</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} required type="number" step="0.01" min="0.01" placeholder="0.00" className="input-mono" />
          </div>
          <div className="flex flex-col gap-1.5 flex-[2] min-w-[200px]">
            <label className="label">Açıqlama</label>
            <input value={description} onChange={e => setDescription(e.target.value)} required placeholder="Məs. Ehtiyat hissəsi alışı" className="input" />
          </div>
        </div>
        {category in OWNER_CATEGORY_LABELS && (
          <p className="text-xs text-ink-muted">Kassada görünür, amma Hesabatda mənfəətə təsir etmir — bu, biznesin gəliri və ya xərci deyil.</p>
        )}
        {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={loading}>Saxla</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Ləğv et</Button>
        </div>
      </form>
    </Card>
  )
}

// ── End of day modal ─────────────────────────────────────────────────────────

function EndDayModal({ onClose }: { onClose: () => void }) {
  const today = getToday()
  const [todayRecords, setTodayRecords] = useState<FinanceRecord[]>([])
  useEffect(() => {
    getFinanceRecords({ from: today, to: today, all: true }).then(r => setTodayRecords(r.data.results)).catch(() => {})
  }, [today])
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
      <link href="https://fonts.googleapis.com/css2?family=Newsreader:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
      *{box-sizing:border-box}
      body{font-family:'IBM Plex Sans','Noto Sans',sans-serif;padding:24px;color:#1F2A24;background:#FFFFFF}
      table{width:100%;border-collapse:collapse}
      td,th{padding:8px 12px;border-bottom:1px solid #CBD3C7;text-align:left}
      th{font-family:'IBM Plex Mono','Noto Sans',monospace;text-transform:uppercase;font-size:10px;letter-spacing:.06em;color:#6b7264;border-bottom:2px solid #1F2A24}
      .right{text-align:right}.green{color:#1F4D36}.red{color:#A13D2B}
      h2{font-family:'Newsreader','Noto Sans',serif;font-weight:600;margin-bottom:4px}
      p{color:#6b7264;margin:0 0 16px}
      .note-box{margin-top:24px;border-top:1px solid #CBD3C7;padding-top:14px}
      .note-label{font-family:'IBM Plex Mono','Noto Sans',monospace;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7264;margin-bottom:4px}
      .note-text{font-family:'IBM Plex Sans','Noto Sans',sans-serif;font-size:13px;color:#1F2A24;white-space:pre-wrap;margin:0}</style>
      </head><body>${content}</body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/45">
      <div className="bg-surface rounded shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] border border-rule">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
          <div>
            <h2 className="font-serif font-semibold text-lg text-ink">Günün bağlanışı</h2>
            <p className="text-xs text-ink-muted mt-0.5">{new Date().toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded hover:bg-surface-alt text-ink-muted transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Printable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5" ref={printRef}>
          <h2 className="font-serif font-semibold text-lg text-ink">Avtoservis CRM — Günlük Hesabat</h2>
          <p style={{ color: '#6b7264', marginBottom: '16px' }}>
            {new Date().toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          {/* Summary */}
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-success-bg border border-rule rounded px-4 py-3">
              <p className="text-xs text-success font-medium mb-0.5">Gəlir</p>
              <p className="text-lg font-mono font-bold text-success">{formatCurrency(income)}</p>
            </div>
            <div className="bg-danger-bg border border-rule rounded px-4 py-3">
              <p className="text-xs text-danger font-medium mb-0.5">Xərc</p>
              <p className="text-lg font-mono font-bold text-danger">{formatCurrency(expense)}</p>
            </div>
            <div className={`border border-rule rounded px-4 py-3 ${net >= 0 ? 'bg-success-bg' : 'bg-danger-bg'}`}>
              <p className={`text-xs font-medium mb-0.5 ${net >= 0 ? 'text-success' : 'text-danger'}`}>Xalis</p>
              <p className={`text-lg font-mono font-bold ${net >= 0 ? 'text-success' : 'text-danger'}`}>{net >= 0 ? '+' : ''}{formatCurrency(net)}</p>
            </div>
          </div>

          {/* Transactions */}
          {todayRecords.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-8">Bu gün heç bir əməliyyat yoxdur.</p>
          ) : (
            <table className="ledger-table">
              <thead>
                <tr>
                  <th className="ledger-th">Açıqlama</th>
                  <th className="ledger-th">Növ</th>
                  <th className="ledger-th text-right">Məbləğ</th>
                </tr>
              </thead>
              <tbody>
                {todayRecords.map(r => (
                  <tr key={r.id}>
                    <td className="ledger-td text-ink">{r.description}</td>
                    <td className="ledger-td">
                      <Badge variant={r.type === 'income' ? 'success' : 'danger'}>{r.type === 'income' ? 'Gəlir' : 'Xərc'}</Badge>
                    </td>
                    <td className={`ledger-td text-right font-mono font-semibold ${r.type === 'income' ? 'text-success' : 'text-danger'}`}>
                      {r.type === 'income' ? '+' : '-'}{formatCurrency(Number(r.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Comment — at the end, only rendered if filled, appears in print */}
          {comment.trim() && (
            <div className="note-box" style={{ marginTop: '24px', borderTop: '1px solid #CBD3C7', paddingTop: '14px' }}>
              <p className="note-label" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7264', marginBottom: '4px' }}>Qeyd</p>
              <p className="note-text" style={{ fontSize: '13px', color: '#1F2A24', whiteSpace: 'pre-wrap', margin: 0 }}>{comment}</p>
            </div>
          )}
        </div>

        {/* Comment input */}
        <div className="px-6 pt-3 pb-2 border-t border-rule">
          <label className="label">Qeyd</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            placeholder="Bu gün üçün qeyd əlavə edin..."
            className="input resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4">
          <Button type="button" variant="secondary" onClick={handlePrint} className="flex-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Çap et
          </Button>
          <Button type="button" variant="primary" onClick={handleClose} loading={saving} className="flex-1">
            Günü bağla
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FinanceClient() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<FinanceRecord[]>([])
  const [totals, setTotals] = useState({ income: 0, income_count: 0, expense: 0, expense_count: 0 })
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [endDayOpen, setEndDayOpen] = useState(false)
  const [savedFilters] = useState(() => loadDraft<SavedFinanceFilters>(FINANCE_FILTERS_KEY))
  const [period, setPeriod] = useState<Period>(() =>
    savedFilters?.period && isPeriodKey(savedFilters.period.key) ? savedFilters.period : makePeriod('today'),
  )
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(savedFilters?.typeFilter ?? 'all')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [pageNote, setPageNote] = useState('')

  // The selected period as a date range (null = open-ended), sent to the server.
  const range = useMemo(() => {
    const { from, to } = periodRange(period)
    return { start: from, end: to }
  }, [period])
  const typeParam = typeFilter === 'all' ? undefined : typeFilter

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getFinanceRecords({ from: range.start, to: range.end, type: typeParam, page: 1 })
      setRecords(res.data.results)
      setTotals(res.data.totals)
      setCount(res.data.count)
      setPage(1)
      setTotalPages(res.data.total_pages)
    } finally {
      setLoading(false)
    }
  }, [range, typeParam])

  useEffect(() => { load() }, [load])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const res = await getFinanceRecords({ from: range.start, to: range.end, type: typeParam, page: page + 1 })
      setRecords(prev => [...prev, ...res.data.results])
      setPage(res.data.page)
      setTotalPages(res.data.total_pages)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    saveDraft(FINANCE_FILTERS_KEY, { period, typeFilter })
  }, [period, typeFilter])

  // The day note belongs to one day, so it shows only when a single day is selected.
  const singleDate = range.start && range.start === range.end ? range.start : null


  useEffect(() => {
    if (!singleDate) { setPageNote(''); return }
    getDayNote(singleDate).then(r => setPageNote(r.data.note)).catch(() => setPageNote(''))
  }, [singleDate, endDayOpen]) // re-fetch after modal closes

  async function handleDeleteRecord(id: number) {
    setDeletingId(id)
    try {
      await deleteFinanceRecord(id)
      await load()
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const filtered = records
  const income = Number(totals.income)
  const expense = Number(totals.expense)
  const net = income - expense
  const operationCount = totals.income_count + totals.expense_count

  const periodLabel = describePeriod(period)

  async function exportPDF() {
    // The PDF lists the whole period (every type), not just the loaded page.
    const win = window.open('', '_blank')
    if (!win) return
    const all = (await getFinanceRecords({ from: range.start, to: range.end, all: true })).data.results
    const rows = all.map(r => `
      <tr>
        <td>${r.date.slice(0, 10)}</td>
        <td>${r.description || '—'}</td>
        <td><span class="${r.type === 'income' ? 'income' : 'expense'}">${r.type === 'income' ? 'Gəlir' : 'Xərc'}</span></td>
        <td class="amount ${r.type === 'income' ? 'income' : 'expense'}">${r.type === 'income' ? '+' : '-'}${Number(r.amount).toFixed(2)} ₼</td>
      </tr>`).join('')

    const noteHtml = singleDate && pageNote
      ? `<div class="note-box"><p class="note-label">Gün qeydi</p><p class="note-text">${pageNote.replace(/\n/g, '<br>')}</p></div>`
      : ''

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Maliyyə Hesabatı — ${periodLabel}</title>
    <link href="https://fonts.googleapis.com/css2?family=Newsreader:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'IBM Plex Sans','Noto Sans',sans-serif;padding:32px;color:#1F2A24;font-size:13px;background:#FFFFFF}
      h1{font-family:'Newsreader','Noto Sans',serif;font-size:22px;font-weight:600;margin-bottom:4px}
      .sub{color:#6b7264;margin-bottom:24px;font-size:12px;font-family:'IBM Plex Mono','Noto Sans',monospace}
      .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px}
      .card{border:1px solid #CBD3C7;border-radius:10px;padding:14px 16px}
      .card-label{font-family:'IBM Plex Mono','Noto Sans',monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
      .card-value{font-family:'Newsreader','Noto Sans',serif;font-size:22px;font-weight:600}
      .green{color:#1F4D36}.red{color:#A13D2B}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{text-align:left;font-family:'IBM Plex Mono','Noto Sans',monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7264;padding:8px 10px;border-bottom:2px solid #1F2A24}
      td{padding:9px 10px;border-bottom:1px solid #CBD3C7}
      tr:last-child td{border-bottom:none}
      .amount{text-align:right;font-weight:600;font-family:'IBM Plex Mono','Noto Sans',monospace}
      .income{color:#1F4D36}.expense{color:#A13D2B}
      .note-box{margin-top:28px;border-top:1px solid #CBD3C7;padding-top:16px}
      .note-label{font-family:'IBM Plex Mono','Noto Sans',monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7264;margin-bottom:6px}
      .note-text{font-family:'IBM Plex Sans','Noto Sans',sans-serif;font-size:13px;color:#1F2A24;line-height:1.6}
    </style></head><body>
    <h1>Maliyyə Hesabatı</h1>
    <p class="sub">${periodLabel} · Gəlir: ${income.toFixed(2)} ₼ · Xərc: ${expense.toFixed(2)} ₼ · Xalis: ${net >= 0 ? '+' : ''}${net.toFixed(2)} ₼</p>
    <div class="summary">
      <div class="card"><p class="card-label green">Gəlir</p><p class="card-value green">${income.toFixed(2)} ₼</p></div>
      <div class="card"><p class="card-label red">Xərc</p><p class="card-value red">${expense.toFixed(2)} ₼</p></div>
      <div class="card"><p class="card-label ${net >= 0 ? 'green' : 'red'}">Xalis</p><p class="card-value ${net >= 0 ? 'green' : 'red'}">${net >= 0 ? '+' : ''}${net.toFixed(2)} ₼</p></div>
    </div>
    ${all.length === 0 ? '<p style="color:#6b7264;text-align:center;padding:32px 0">Bu dövr üzrə əməliyyat yoxdur.</p>' : `
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
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-end gap-4 mb-6">
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" onClick={exportPDF}>
              <FileDown className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="secondary" onClick={() => setEndDayOpen(true)}>
              <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span className="hidden sm:inline">Günü bağla</span>
            </Button>
            <Button variant="primary" onClick={() => setAddOpen(o => !o)}>
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
              <span className="hidden sm:inline">Qeyd əlavə et</span>
            </Button>
          </div>
        </div>

        <PeriodFilter value={period} onChange={setPeriod} withAll className="mb-6" />

        {/* Summary: big net total + income/expense pair */}
        <Card className="px-6 py-6 mb-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="section-label mb-1.5">{periodLabel} üzrə hesabat</p>
              <p className={`font-serif font-semibold text-[40px] leading-none ${net >= 0 ? 'text-accent' : 'text-danger'}`}>
                {net >= 0 ? '+' : ''}{formatCurrency(net)}
              </p>
              <p className="text-sm text-ink-soft mt-1.5">Xalis · {operationCount} əməliyyat</p>
            </div>
            <div className="flex gap-8">
              <div className="text-right">
                <p className="font-mono font-semibold text-xl text-ink">{formatCurrency(income)}</p>
                <p className="section-label mt-1">Gəlir · {totals.income_count}</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-semibold text-xl text-danger">{formatCurrency(expense)}</p>
                <p className="section-label mt-1">Xərc · {totals.expense_count}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Table filter */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1 border border-rule rounded p-1 bg-surface-alt">
            {(['all', 'income', 'expense'] as TypeFilter[]).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  typeFilter === t ? 'bg-surface text-ink border border-rule' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t === 'all' ? 'Hamısı' : t === 'income' ? 'Gəlir' : 'Xərc'}
              </button>
            ))}
          </div>
          <p className="section-label">{count} qeyd</p>
        </div>

        {/* Inline add-record form — expands above the records table */}
        {addOpen && <AddRecordForm onClose={() => setAddOpen(false)} onAdded={load} />}

        {/* Records table */}
        {loading ? (
          <Card>
            <Spinner />
          </Card>
        ) : filtered.length === 0 ? (
          <EmptyState title="Qeyd tapılmadı" subtitle="Seçilmiş filtr üzrə heç bir əməliyyat yoxdur." />
        ) : (
          <Card className="overflow-hidden overflow-x-auto">
            <table className="ledger-table min-w-[560px]">
              <thead>
                <tr>
                  <th className="ledger-th">Tarix</th>
                  <th className="ledger-th">Növ</th>
                  <th className="ledger-th">Açıqlama</th>
                  <th className="ledger-th text-right">Məbləğ</th>
                  <th className="ledger-th" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr
                    key={r.id}
                    className={`ledger-row ${r.order ? '' : 'cursor-default'}`}
                    onClick={r.order ? () => navigate(`/business/orders/${r.order}`) : undefined}
                    title={r.order ? 'Sifarişə keç' : undefined}
                  >
                    <td className="ledger-td font-mono text-ink-muted">{formatDate(r.date)}</td>
                    <td className="ledger-td">
                      <Badge variant={r.type === 'income' ? 'success' : 'danger'}>{r.type === 'income' ? 'Gəlir' : 'Xərc'}</Badge>
                    </td>
                    <td className="ledger-td whitespace-normal">
                      <span className="flex items-center gap-1.5">
                        {r.category && OWNER_CATEGORY_LABELS[r.category] && (
                          <Badge variant="neutral">{OWNER_CATEGORY_LABELS[r.category]}</Badge>
                        )}
                        {r.description}
                        {r.order && (
                          <svg className="w-3.5 h-3.5 text-accent shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        )}
                      </span>
                    </td>
                    <td className={`ledger-td text-right font-mono font-semibold ${r.type === 'income' ? 'text-success' : 'text-danger'}`}>
                      {r.type === 'income' ? '+' : '-'}{formatCurrency(Number(r.amount))}
                    </td>
                    <td className="ledger-td text-right" onClick={e => e.stopPropagation()}>
                      {r.source && r.source !== 'manual' ? (
                        <span className="text-xs text-ink-muted" title="Sistem qeydidir — onu yaradan sifariş, alış və ya borc üzərindən dəyişdirilir">avtomatik</span>
                      ) : confirmDeleteId === r.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-ink-muted">Silinsin?</span>
                          <button
                            onClick={() => handleDeleteRecord(r.id)}
                            disabled={deletingId === r.id}
                            className="text-xs font-semibold px-2.5 py-1 rounded bg-danger text-cream hover:bg-danger/90 disabled:opacity-50 transition-colors"
                          >
                            {deletingId === r.id ? '...' : 'Bəli'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-semibold px-2.5 py-1 rounded border border-rule text-ink-muted hover:bg-surface-alt transition-colors"
                          >
                            Xeyr
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="text-ink-muted hover:text-danger transition-colors p-1.5 rounded hover:bg-danger-bg"
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
          </Card>
        )}


        {!loading && page < totalPages && (
          <div className="flex justify-center mt-4">
            <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
              Daha çox göstər ({records.length} / {count})
            </Button>
          </div>
        )}

        {/* Saved day note */}
        {singleDate && pageNote && (
          <div className="card mt-6 px-5 py-4 border-l-2 border-l-warning">
            <p className="section-label text-warning mb-1">Gün qeydi</p>
            <p className="text-sm text-ink whitespace-pre-wrap">{pageNote}</p>
          </div>
        )}
      </div>

      {endDayOpen && <EndDayModal onClose={() => { setEndDayOpen(false); load() }} />}
    </>
  )
}
