import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FileDown, CheckCircle2, Printer, Trash2 } from 'lucide-react'
import { FinanceRecord, FinanceCategory } from '@/types'
import { getFinanceRecords, createFinanceRecord, deleteFinanceRecord, getDayNote, saveDayNote } from '@/services/finance.service'
import { formatCurrency, formatDate, mapApiError, toLocalISODate } from '@/lib/utils'
import { loadDraft, saveDraft } from '@/lib/formDraft'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import InkBand from '@/components/ui/InkBand'
import Modal from '@/components/ui/Modal'
import Money from '@/components/ui/Money'
import PageHeader from '@/components/ui/PageHeader'
import Segmented from '@/components/ui/Segmented'
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

// ── Add record modal ─────────────────────────────────────────────────────────

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

const CATEGORY_LABELS: Partial<Record<FinanceCategory, string>> = {
  parts: 'Ehtiyat hissə',
  salary: 'Əmək haqqı',
  rent: 'İcarə',
  utilities: 'Kommunal',
  cogs: 'Maya dəyəri',
  write_off: 'Anbar itkisi',
  service: 'Xidmət',
  parts_sale: 'Hissə satışı',
  discount: 'Endirim',
  goods_purchase: 'Mal alışı',
  ...OWNER_CATEGORY_LABELS,
}

function categoryLabel(r: FinanceRecord): string {
  if (!r.category) return '—'
  if (r.category === 'other') return r.type === 'income' ? 'Digər gəlir' : 'Digər'
  return CATEGORY_LABELS[r.category] ?? '—'
}

function AddRecordForm({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [category, setCategory] = useState<FinanceCategory>('other')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      onAdded(); onClose()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open
      title="Yeni qeyd"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Ləğv et</Button>
          <Button type="submit" form="kassa-add-form" loading={loading}>Saxla</Button>
        </>
      }
    >
      <form id="kassa-add-form" onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        <div>
          <label className="label">Növ</label>
          <Segmented
            label="Növ"
            value={type}
            onChange={t => { setType(t); setCategory('other') }}
            options={[{ key: 'income', label: 'Gəlir' }, { key: 'expense', label: 'Xərc' }]}
          />
        </div>
        <div>
          <label className="label">Maddə</label>
          <select value={category} onChange={e => setCategory(e.target.value as FinanceCategory)} className="input">
            {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Məbləğ (₼)</label>
          <input value={amount} onChange={e => setAmount(e.target.value)} required type="number" step="0.01" min="0.01" placeholder="0.00" className="input-mono" />
        </div>
        <div>
          <label className="label">Açıqlama</label>
          <input value={description} onChange={e => setDescription(e.target.value)} required placeholder="Məs. Ehtiyat hissəsi alışı" className="input" />
        </div>
        {category in OWNER_CATEGORY_LABELS && (
          <p className="text-small text-info-strong bg-info-subtle rounded px-3 py-2">Kassada görünür, amma Hesabatda mənfəətə təsir etmir — bu, biznesin gəliri və ya xərci deyil.</p>
        )}
        {error && <p className="text-small text-danger-strong bg-danger-subtle rounded px-3 py-2">{error}</p>}
      </form>
    </Modal>
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


  const dateLabel = new Date().toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Modal
      open
      title="Günün bağlanışı"
      subtitle={dateLabel}
      onClose={handleClose}
      width="max-w-lg"
      footer={
        <>
          <Button type="button" variant="secondary" icon={Printer} onClick={handlePrint}>Çap et</Button>
          <Button type="button" variant="primary" onClick={handleClose} loading={saving}>Günü bağla</Button>
        </>
      }
    >
      {/* Printable content */}
      <div ref={printRef}>
        <h2 className="font-display font-semibold text-h3 text-ink">Avtoservis CRM — Günlük Hesabat</h2>
        <p style={{ color: '#6b7264', marginBottom: '16px' }}>{dateLabel}</p>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="border border-border rounded-md px-4 py-3">
            <p className="font-sans text-label uppercase text-text-3">Gəlir</p>
            <p className="text-body-l font-mono font-semibold text-success">{formatCurrency(income)}</p>
          </div>
          <div className="border border-border rounded-md px-4 py-3">
            <p className="font-sans text-label uppercase text-text-3">Xərc</p>
            <p className="text-body-l font-mono font-semibold text-danger">{formatCurrency(expense)}</p>
          </div>
          <div className="border border-border rounded-md px-4 py-3">
            <p className="font-sans text-label uppercase text-text-3">Xalis</p>
            <p className={`text-body-l font-mono font-semibold ${net >= 0 ? 'text-success' : 'text-danger'}`}>{net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(net))}</p>
          </div>
        </div>

        {/* Transactions */}
        {todayRecords.length === 0 ? (
          <p className="text-body text-text-3 text-center py-8">Bu gün heç bir əməliyyat yoxdur.</p>
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
                  <td className="ledger-td text-ink !whitespace-normal">{r.description}</td>
                  <td className="ledger-td">
                    <Badge variant={r.type === 'income' ? 'success' : 'danger'}>{r.type === 'income' ? 'Gəlir' : 'Xərc'}</Badge>
                  </td>
                  <td className="ledger-td text-right">
                    <Money value={Number(r.amount)} meaning={r.type === 'income' ? 'income' : 'expense'} />
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
      <div className="mt-5 pt-4 border-t border-border pb-2">
        <label className="label">Qeyd</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={2}
          placeholder="Bu gün üçün qeyd əlavə edin..."
          className="input resize-none"
        />
      </div>
    </Modal>
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
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Maliyyə · Kassa"
        subtitle={`${periodLabel} · ${count} qeyd`}
        actions={
          <>
            <Button variant="secondary" icon={FileDown} onClick={exportPDF}>
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="secondary" icon={CheckCircle2} onClick={() => setEndDayOpen(true)}>
              <span className="hidden sm:inline">Günü bağla</span>
            </Button>
            <Button icon={Plus} onClick={() => setAddOpen(true)}>Yeni qeyd</Button>
          </>
        }
      />

      <InkBand
        label={`${periodLabel} üzrə`}
        items={[
          { label: 'Gəlir', value: `+${formatCurrency(income)}`, note: `${totals.income_count} əməliyyat` },
          { label: 'Xərc', value: `−${formatCurrency(expense)}`, note: `${totals.expense_count} əməliyyat` },
          { label: 'Xalis', value: `${net < 0 ? '−' : net > 0 ? '+' : ''}${formatCurrency(Math.abs(net))}`, note: `${operationCount} əməliyyat`, highlight: true },
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodFilter value={period} onChange={setPeriod} withAll />
        <Segmented
          label="Növ"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { key: 'all', label: 'Hamısı' },
            { key: 'income', label: 'Gəlir' },
            { key: 'expense', label: 'Xərc' },
          ]}
        />
      </div>

      {/* Records table */}
      {loading && records.length === 0 ? (
        <Spinner />
      ) : records.length === 0 ? (
        <EmptyState title="Qeyd tapılmadı" subtitle="Seçilmiş filtr üzrə heç bir əməliyyat yoxdur." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ledger-table min-w-[820px]">
              <thead>
                <tr>
                  <th className="ledger-th">Tarix</th>
                  <th className="ledger-th">Növ</th>
                  <th className="ledger-th">Maddə</th>
                  <th className="ledger-th">Açıqlama</th>
                  <th className="ledger-th">Mənbə</th>
                  <th className="ledger-th text-right">Məbləğ</th>
                  <th className="ledger-th" />
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr
                    key={r.id}
                    className={`ledger-row ${r.order ? '' : '!cursor-default'}`}
                    onClick={r.order ? () => navigate(`/business/orders/${r.order}`) : undefined}
                    title={r.order ? 'Sifarişə keç' : undefined}
                  >
                    <td className="ledger-td font-mono text-text-2">{formatDate(r.date)}</td>
                    <td className="ledger-td">
                      <Badge variant={r.type === 'income' ? 'success' : 'danger'}>{r.type === 'income' ? 'Gəlir' : 'Xərc'}</Badge>
                    </td>
                    <td className="ledger-td">
                      {r.category && OWNER_CATEGORY_LABELS[r.category]
                        ? <Badge variant="neutral">{OWNER_CATEGORY_LABELS[r.category]}</Badge>
                        : <span className="text-text-2">{categoryLabel(r)}</span>}
                    </td>
                    <td className="ledger-td !whitespace-normal">{r.description || <span className="text-text-3">—</span>}</td>
                    <td className="ledger-td" onClick={e => e.stopPropagation()}>
                      <span className="flex items-center gap-2">
                        {r.order ? (
                          <Link to={`/business/orders/${r.order}`} className="font-mono text-small hover:underline underline-offset-2">Sifariş</Link>
                        ) : r.purchase ? (
                          <Link to={`/business/warehouse/purchases/${r.purchase}`} className="font-mono text-small hover:underline underline-offset-2">Alış</Link>
                        ) : null}
                        {r.source && r.source !== 'manual' && (
                          <span className="text-small text-text-3" title="Sistem qeydidir — onu yaradan sifariş, alış və ya borc üzərindən dəyişdirilir">avtomatik</span>
                        )}
                        {!r.order && !r.purchase && (!r.source || r.source === 'manual') && <span className="text-text-3">—</span>}
                      </span>
                    </td>
                    <td className="ledger-td text-right">
                      <Money value={Number(r.amount)} meaning={r.type === 'income' ? 'income' : 'expense'} />
                    </td>
                    <td className="ledger-td text-right" onClick={e => e.stopPropagation()}>
                      {(!r.source || r.source === 'manual') && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="w-9 h-9 inline-flex items-center justify-center rounded text-text-3 hover:text-danger hover:bg-danger-subtle transition-colors"
                          title="Ləğv et"
                          aria-label="Ləğv et"
                        >
                          <Trash2 size={18} strokeWidth={1.75} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2">
                  <td className="ledger-td font-semibold" colSpan={5}>Dövr üzrə cəmi · {operationCount} əməliyyat</td>
                  <td className="ledger-td text-right"><Money value={net} meaning="profit" className="font-bold" /></td>
                  <td className="ledger-td" />
                </tr>
              </tfoot>
            </table>
          </div>
          {page < totalPages && (
            <div className="flex justify-center py-3 border-t border-border">
              <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
                Daha çox göstər ({records.length} / {count})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Saved day note */}
      {singleDate && pageNote && (
        <div className="card px-5 py-4">
          <p className="font-sans text-label uppercase text-text-3 mb-1">Gün qeydi</p>
          <p className="text-body text-ink whitespace-pre-wrap">{pageNote}</p>
        </div>
      )}

      {addOpen && <AddRecordForm onClose={() => setAddOpen(false)} onAdded={load} />}
      {endDayOpen && <EndDayModal onClose={() => { setEndDayOpen(false); load() }} />}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Qeyd silinsin?"
        message="Bu qeyd kassadan silinəcək. Bu əməliyyat geri qaytarıla bilməz."
        confirmLabel={deletingId !== null ? '...' : 'Bəli, sil'}
        cancelLabel="Xeyr"
        danger
        onConfirm={() => confirmDeleteId !== null && handleDeleteRecord(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
