import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { DashboardStats, FinanceReport } from '@/types'
import { getDashboardStats, getFinanceReport } from '@/services/finance.service'
import { formatCurrency } from '@/lib/utils'
import Spinner from '@/components/ui/Spinner'
import { CHART_INCOME, CHART_EXPENSE, EXPENSE_CATEGORY_COLORS, EXPENSE_CATEGORY_LABELS, CHART_SEQUENTIAL } from '@/lib/chartColors'

const AXIS_TICK = { fontSize: 11, fill: '#6b7264' }
const TOOLTIP_STYLE = { background: '#FFFFFF', border: '1px solid #CBD3C7', borderRadius: 4, fontSize: 12 }

function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card px-4 py-4">
      <p className="section-label mb-2">{label}</p>
      <p className="text-xl font-bold font-mono" style={accent ? { color: accent } : undefined}>{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [report, setReport] = useState<FinanceReport | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date()
      const to = today.toISOString().slice(0, 10)
      const fromDate = new Date(today)
      fromDate.setDate(fromDate.getDate() - 13)
      const from = fromDate.toISOString().slice(0, 10)
      const [statsRes, reportRes] = await Promise.all([getDashboardStats(), getFinanceReport(from, to)])
      setStats(statsRes.data)
      setReport(reportRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading || !stats || !report) {
    return <div className="p-6 lg:p-8"><Spinner /></div>
  }

  const creditorsVsDebtors = [
    { label: 'Debitorlar (bizə borc)', value: stats.debtors_remaining, fill: CHART_INCOME },
    { label: 'Kreditorlar (biz borcluyuq)', value: stats.creditors_remaining, fill: CHART_EXPENSE },
  ]

  const topCustomers = stats.top_customers.map(c => ({ name: c.full_name, total_paid: c.total_paid }))

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatTile
          label="Bugünkü xalis"
          value={formatCurrency(stats.today.net)}
          accent={stats.today.net >= 0 ? CHART_INCOME : CHART_EXPENSE}
        />
        <StatTile label="Az qalan / bitmiş məhsul" value={`${stats.low_stock_count} / ${stats.out_of_stock_count}`} />
        <StatTile label="Bu ay yeni müştəri" value={String(stats.new_customers_this_month)} />
        <StatTile
          label="Rezervasiya çevrilməsi"
          value={stats.reservations.conversion_rate != null ? `${stats.reservations.conversion_rate}%` : '—'}
        />
      </div>

      {stats.out_of_stock_count > 0 && (
        <Link
          to="/business/warehouse"
          className="block mb-8 bg-danger-bg border border-danger/30 rounded px-6 py-3 text-sm text-danger font-medium hover:opacity-90 transition-opacity"
        >
          {stats.out_of_stock_count} məhsul stokda bitib — Anbara keç →
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Kassa: last 14 days */}
        <div className="card p-6">
          <h2 className="card-title mb-4">Kassa — son 14 gün</h2>
          {report.daily.length === 0 ? (
            <p className="text-sm text-ink-muted">Bu dövrdə qeyd yoxdur.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={report.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#CBD3C7" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: '#CBD3C7' }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Gəlir" fill={CHART_INCOME} radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" name="Xərc" fill={CHART_EXPENSE} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Kreditorlar vs Debitorlar */}
        <div className="card p-6">
          <h2 className="card-title mb-4">Kreditorlar / Debitorlar</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={creditorsVsDebtors} layout="vertical" margin={{ top: 8, right: 56, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#CBD3C7" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: '#CBD3C7' }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: '#1F2A24' }} tickLine={false} axisLine={false} width={150} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="value" position="right" formatter={(v: any) => formatCurrency(Number(v))} style={{ fontSize: 11, fill: '#1F2A24' }} />
                {creditorsVsDebtors.map(row => <Cell key={row.label} fill={row.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Maliyyət hesabatı: expense by category */}
        <div className="card p-6">
          <h2 className="card-title mb-4">Xərclər — kateqoriya üzrə (son 14 gün)</h2>
          {report.expense_by_category.length === 0 ? (
            <p className="text-sm text-ink-muted">Bu dövrdə xərc yoxdur.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(report.expense_by_category.length * 40, 120)}>
              <BarChart
                data={report.expense_by_category.map(c => ({ ...c, label: EXPENSE_CATEGORY_LABELS[c.category] || c.category }))}
                layout="vertical"
                margin={{ top: 4, right: 56, left: 0, bottom: 4 }}
              >
                <CartesianGrid stroke="#CBD3C7" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: '#CBD3C7' }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: '#1F2A24' }} tickLine={false} axisLine={false} width={110} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="amount" position="right" formatter={(v: any) => formatCurrency(Number(v))} style={{ fontSize: 11, fill: '#1F2A24' }} />
                  {report.expense_by_category.map(c => (
                    <Cell key={c.category} fill={EXPENSE_CATEGORY_COLORS[c.category] || '#6b7264'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top customers */}
        <div className="card p-6">
          <h2 className="card-title mb-4">Fav müştərilər</h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-ink-muted">Hələ ödəniş edən müştəri yoxdur.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(topCustomers.length * 40, 120)}>
              <BarChart data={topCustomers} layout="vertical" margin={{ top: 4, right: 56, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#CBD3C7" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: '#CBD3C7' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#1F2A24' }} tickLine={false} axisLine={false} width={130} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="total_paid" fill={CHART_SEQUENTIAL} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="total_paid" position="right" formatter={(v: any) => formatCurrency(Number(v))} style={{ fontSize: 11, fill: '#1F2A24' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
