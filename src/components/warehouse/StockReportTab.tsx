import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StockReport } from '@/types'
import { getStockReport } from '@/services/warehouse.service'
import { formatCurrency } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'
import Money from '@/components/ui/Money'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import PeriodFilter from '@/components/ui/PeriodFilter'
import Spinner from '@/components/ui/Spinner'
import { Period, makePeriod, periodLabel, periodRange } from '@/lib/period'

const PAGE_SIZE = 25

/** Stok · Anbar hesabatı. The endpoint takes only from/to, so the product table is
 * paginated client-side; the totals row is computed over all (filtered) rows. */
export default function StockReportTab() {
  const [period, setPeriod] = useState<Period>(() => makePeriod('30'))
  const [report, setReport] = useState<StockReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [onlyMoved, setOnlyMoved] = useState(true)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { from, to } = periodRange(period)
      setReport((await getStockReport(from ?? '', to ?? '')).data)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [period, onlyMoved])

  const rows = useMemo(
    () => (report ? report.rows.filter(r => !onlyMoved || r.in_qty || r.out_qty) : []),
    [report, onlyMoved],
  )
  const totals = useMemo(() => rows.reduce(
    (a, r) => ({
      opening: a.opening + r.opening_qty,
      in: a.in + r.in_qty,
      out: a.out + r.out_qty,
      closing: a.closing + r.closing_qty,
      closingValue: a.closingValue + Number(r.closing_value),
    }),
    { opening: 0, in: 0, out: 0, closing: 0, closingValue: 0 },
  ), [rows])
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Stok · Anbar hesabatı" subtitle={periodLabel(period)} />
      <PeriodFilter value={period} onChange={setPeriod} />

      {loading && !report ? <Spinner /> : !report ? null : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Block label="Dövrün əvvəlinə qalıq" value={formatCurrency(report.totals.opening_value)} />
            <Block label="Daxil olan" value={`+${formatCurrency(report.totals.in_value)}`} />
            <Block label="Çıxan (maya ilə)" value={signedOut(Number(report.totals.out_value), formatCurrency)} />
            <Block label="Dövrün sonuna qalıq" value={formatCurrency(report.totals.closing_value)} />
          </div>
          <p className="text-small text-text-3">
            Əvvələ qalıq + daxil olan − çıxan = sona qalıq. Bütün məbləğlər alış (maya) qiyməti ilədir.
            Hazırda anbarın dəyəri: <span className="font-mono font-semibold text-ink">{formatCurrency(report.stock_value)}</span>
          </p>

          <div className="grid lg:grid-cols-3 gap-4">
            <TopList title="Ən çox satılan" rows={report.top_sold.map(r => ({ id: r.product, name: r.name, value: `${r.quantity} ədəd` }))} />
            <TopList title="Ən çox qazandıran" rows={report.top_profit.map(r => ({ id: r.product, name: r.name, value: formatCurrency(r.profit) }))} />
            <TopList title="60 gündür satılmayan (ölü stok)" rows={report.dead_stock.map(r => ({ id: r.product, name: r.name, value: `${r.stock_quantity} stokda` }))} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-label">Məhsullar üzrə ({rows.length})</h2>
            <label className="flex items-center gap-2 text-body text-text-2 cursor-pointer">
              <input type="checkbox" checked={onlyMoved} onChange={e => setOnlyMoved(e.target.checked)} className="w-4 h-4 accent-ink" />
              Yalnız hərəkəti olanlar
            </label>
          </div>

          {rows.length === 0 ? (
            <EmptyState title="Hərəkət tapılmadı" subtitle="Seçilmiş dövrdə stok hərəkəti olan məhsul yoxdur." />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="ledger-table min-w-[820px]">
                  <thead>
                    <tr>
                      <th className="ledger-th">Məhsul</th>
                      <th className="ledger-th text-right">Əvvələ</th>
                      <th className="ledger-th text-right">Daxil</th>
                      <th className="ledger-th text-right">Çıxış</th>
                      <th className="ledger-th text-right">Sona</th>
                      <th className="ledger-th text-right">Sona (₼)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(r => (
                      <tr key={r.product} className="ledger-row cursor-default">
                        <td className="ledger-td whitespace-normal">
                          <Link to={`/business/warehouse/products/${r.product}`} className="font-semibold text-ink hover:underline underline-offset-2">{r.name}</Link>
                          {r.code && <span className="ml-2 font-mono text-small text-text-3">{r.code}</span>}
                        </td>
                        <td className="ledger-td text-right font-mono tabular-nums">{r.opening_qty}</td>
                        <td className="ledger-td text-right font-mono tabular-nums">{r.in_qty ? `+${r.in_qty}` : '—'}</td>
                        <td className="ledger-td text-right font-mono tabular-nums">{r.out_qty ? signedOut(r.out_qty) : '—'}</td>
                        <td className="ledger-td text-right font-mono tabular-nums font-semibold">{r.closing_qty}</td>
                        <td className="ledger-td text-right"><Money value={r.closing_value} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-2">
                      <td className="ledger-td font-semibold">Cəmi · {rows.length} məhsul</td>
                      <td className="ledger-td text-right font-mono font-bold tabular-nums">{totals.opening}</td>
                      <td className="ledger-td text-right font-mono font-bold tabular-nums">{totals.in ? `+${totals.in}` : '—'}</td>
                      <td className="ledger-td text-right font-mono font-bold tabular-nums">{totals.out ? signedOut(totals.out) : '—'}</td>
                      <td className="ledger-td text-right font-mono font-bold tabular-nums">{totals.closing}</td>
                      <td className="ledger-td text-right"><Money value={totals.closingValue} className="font-bold" /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
          <p className="text-small text-text-3">
            Daxil = alışlar + ilkin qalıq + sayımda artıq çıxan. Çıxan = satılan mal (sifarişə çıxış − sifarişdən qaytarma) +
            silinmə/itki + mağazaya qaytarma + sayımda çatışan.
          </p>
        </>
      )}
    </div>
  )
}

/** Net outflow shown with a minus; a negative net (more came back than left) shows as a plus. */
function signedOut(n: number, fmt: (v: number) => string = String): string {
  return n >= 0 ? `−${fmt(n)}` : `+${fmt(-n)}`
}

/** Number block: 3px ink left rule, mono label, big display number. */
function Block({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-[3px] border-ink pl-4 py-1 min-w-0">
      <p className="font-mono text-label uppercase text-text-3">{label}</p>
      <p className="font-display font-bold text-[28px] leading-10 tracking-tight text-ink tabular-nums truncate">{value}</p>
    </div>
  )
}

function TopList({ title, rows }: { title: string; rows: { id: number; name: string; value: string }[] }) {
  return (
    <section className="card p-5">
      <h2 className="section-label mb-3">{title}</h2>
      {rows.length === 0 ? <p className="text-body text-text-3">Məlumat yoxdur.</p> : (
        <ol className="flex flex-col">
          {rows.slice(0, 8).map((r, i) => (
            <li key={r.id} className={`flex items-center justify-between gap-3 py-2 ${i < Math.min(rows.length, 8) - 1 ? 'border-b border-border' : ''}`}>
              <Link to={`/business/warehouse/products/${r.id}`} className="truncate text-body hover:underline underline-offset-2">
                <span className="font-mono text-small text-text-3 mr-2">{i + 1}.</span>{r.name}
              </Link>
              <span className="font-mono text-small font-semibold tabular-nums shrink-0">{r.value}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
