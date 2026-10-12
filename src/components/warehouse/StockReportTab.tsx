import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StockReport } from '@/types'
import { getStockReport } from '@/services/warehouse.service'
import { formatCurrency } from '@/lib/utils'
import Spinner from '@/components/ui/Spinner'
import PeriodFilter from '@/components/ui/PeriodFilter'
import { Period, makePeriod, periodRange } from '@/lib/period'

export default function StockReportTab() {
  const [period, setPeriod] = useState<Period>(() => makePeriod('30'))
  const [report, setReport] = useState<StockReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [onlyMoved, setOnlyMoved] = useState(true)

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

  const rows = report ? report.rows.filter(r => !onlyMoved || r.in_qty || r.out_qty) : []

  return (
    <div>
      <PeriodFilter value={period} onChange={setPeriod} className="mb-6" />

      {loading || !report ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card label="Dövrün əvvəlinə qalıq" value={formatCurrency(report.totals.opening_value)} />
            <Card label="Daxil olan" value={formatCurrency(report.totals.in_value)} tone="success" />
            <Card label="Çıxan (maya ilə)" value={formatCurrency(report.totals.out_value)} tone="danger" />
            <Card label="Dövrün sonuna qalıq" value={formatCurrency(report.totals.closing_value)} tone="accent" />
          </div>
          <p className="text-xs text-ink-muted mb-6">
            Əvvələ qalıq + daxil olan − çıxan = sona qalıq. Bütün məbləğlər alış (maya) qiyməti ilədir.
            Hazırda anbarın dəyəri: <span className="font-mono font-semibold text-ink">{formatCurrency(report.stock_value)}</span>
          </p>

          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            <TopList title="Ən çox satılan" rows={report.top_sold.map(r => ({ id: r.product, name: r.name, value: `${r.quantity} ədəd` }))} />
            <TopList title="Ən çox qazandıran" rows={report.top_profit.map(r => ({ id: r.product, name: r.name, value: formatCurrency(r.profit) }))} />
            <TopList title="60 gündür satılmayan (ölü stok)" rows={report.dead_stock.map(r => ({ id: r.product, name: r.name, value: `${r.stock_quantity} stokda` }))} />
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="section-label">Məhsullar üzrə ({rows.length})</p>
            <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
              <input type="checkbox" checked={onlyMoved} onChange={e => setOnlyMoved(e.target.checked)} className="w-4 h-4" />
              Yalnız hərəkəti olanlar
            </label>
          </div>
          <div className="card overflow-x-auto">
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
                {rows.map(r => (
                  <tr key={r.product} className="ledger-row cursor-default">
                    <td className="ledger-td whitespace-normal">
                      <Link to={`/business/warehouse/products/${r.product}`} className="font-medium text-ink hover:text-accent">{r.name}</Link>
                      {r.code && <span className="ml-2 font-mono text-xs text-ink-muted">{r.code}</span>}
                    </td>
                    <td className="ledger-td text-right font-mono">{r.opening_qty}</td>
                    <td className="ledger-td text-right font-mono text-success">{r.in_qty ? `+${r.in_qty}` : '—'}</td>
                    <td className="ledger-td text-right font-mono text-danger">{r.out_qty ? `−${r.out_qty}` : '—'}</td>
                    <td className="ledger-td text-right font-mono font-semibold">{r.closing_qty}</td>
                    <td className="ledger-td text-right font-mono">{formatCurrency(r.closing_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Card({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' | 'accent' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : tone === 'accent' ? 'text-accent' : 'text-ink'
  return (
    <div className="card px-4 py-4">
      <p className="section-label mb-2">{label}</p>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
    </div>
  )
}

function TopList({ title, rows }: { title: string; rows: { id: number; name: string; value: string }[] }) {
  return (
    <div className="card p-4">
      <p className="card-title mb-3">{title}</p>
      {rows.length === 0 ? <p className="text-sm text-ink-muted">Məlumat yoxdur.</p> : (
        <ol className="flex flex-col gap-1.5">
          {rows.slice(0, 8).map((r, i) => (
            <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
              <Link to={`/business/warehouse/products/${r.id}`} className="truncate hover:text-accent">
                <span className="font-mono text-xs text-ink-muted mr-2">{i + 1}.</span>{r.name}
              </Link>
              <span className="font-mono shrink-0">{r.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
