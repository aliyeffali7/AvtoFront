import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Business, DashboardStats, FinanceReport, Order, WeeklyIncome } from '@/types'
import { getDashboardStats, getFinanceReport, getWeeklyIncome } from '@/services/finance.service'
import { getOrders } from '@/services/orders.service'
import { getBusinessProfile } from '@/services/auth.service'
import { formatCurrency, formatDate, toLocalISODate } from '@/lib/utils'
import Spinner from '@/components/ui/Spinner'
import Plate from '@/components/ui/Plate'
import Money from '@/components/ui/Money'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import InkBand from '@/components/ui/InkBand'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/orders/StatusBadge'
import { CHART_INCOME, CHART_EXPENSE, CHART_SEQUENTIAL } from '@/lib/chartColors'

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']

const AXIS_TICK = { fontSize: 11, fill: '#6B6B6B' }
const TOOLTIP_STYLE = { background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: 10, fontSize: 12 }

function formatShort(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}

const WEEKDAYS = ['B.e', 'Ç.a', 'Çər', 'C.a', 'Cüm', 'Şən', 'Baz']

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [report, setReport] = useState<FinanceReport | null>(null)
  const [shownWeek, setShownWeek] = useState<WeeklyIncome | null>(null)
  const [weekLoading, setWeekLoading] = useState(false)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [business, setBusiness] = useState<Business | null>(null)
  const [todayOrdersCount, setTodayOrdersCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date()
      const to = toLocalISODate(today)
      const fromDate = new Date(today)
      fromDate.setDate(fromDate.getDate() - 13)
      const from = toLocalISODate(fromDate)
      const [statsRes, reportRes, todayRes, recentRes, bizRes] = await Promise.all([
        getDashboardStats(),
        getFinanceReport(from, to),
        getOrders({ date_from: to, date_to: to }).catch(() => null),
        getOrders({ page: 1 }).catch(() => null),
        getBusinessProfile().catch(() => null),
      ])
      setStats(statsRes.data)
      setShownWeek(statsRes.data.weekly_income)
      setReport(reportRes.data)
      setRecentOrders((recentRes?.data.results ?? []).slice(0, 8))
      setTodayOrdersCount(todayRes?.data.count ?? 0)
      setBusiness(bizRes?.data ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function shiftWeek(delta: number) {
    if (!shownWeek || weekLoading) return
    const anchor = new Date(`${shownWeek.week_start}T12:00:00Z`)
    anchor.setUTCDate(anchor.getUTCDate() + delta * 7)
    setWeekLoading(true)
    try {
      const res = await getWeeklyIncome(toLocalISODate(anchor))
      setShownWeek(res.data)
    } finally {
      setWeekLoading(false)
    }
  }

  if (loading || !stats || !report || !shownWeek) {
    return <Spinner />
  }


  const dailyRows = report.daily ?? []
  const todayStats = stats.today ?? { net: 0 }
  const weekly = shownWeek
  const isCurrentWeek = weekly.days.some(d => d.is_today)
  const weekChart = weekly.days.map((d, i) => ({ ...d, label: WEEKDAYS[i] }))

  const now = new Date()
  const todayLabel = formatDate(toLocalISODate(now))
  const subtitle = `${MONTHS[now.getMonth()]} ${now.getFullYear()}${business?.name ? ` · ${business.name}` : ''}`

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Ana səhifə"
        subtitle={subtitle}
        actions={<Button icon={Plus} onClick={() => navigate('/business/orders/new')}>Yeni sifariş</Button>}
      />

      <InkBand
        label={`Bu gün · ${todayLabel}`}
        items={[
          { label: 'Bugünkü xalis', value: formatCurrency(todayStats.net), highlight: true },
          { label: 'Gəlir', value: formatCurrency(todayStats.income ?? 0) },
          { label: 'Xərc', value: formatCurrency(todayStats.expense ?? 0) },
          { label: 'Bugünkü sifarişlər', value: String(todayOrdersCount) },
        ]}
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/business/orders" className="block min-w-0">
          <KpiCard label="Aktiv sifarişlər" value={stats.active_orders_count} note="Sifarişlərə keç" className="h-full hover:bg-surface-2 transition-colors" />
        </Link>
        <Link to="/business/finance/debitorlar" className="block min-w-0">
          <KpiCard label="Borclu müştərilər" value={stats.debtor_customers_count} note={<>Alınacaq: <Money value={stats.debtors_remaining} showWord={false} className="text-small" /></>} className="h-full hover:bg-surface-2 transition-colors" />
        </Link>
        <Link to="/business/warehouse" className="block min-w-0">
          <KpiCard label="Stokdakı məhsullar" value={stats.in_stock_count} note={`${stats.low_stock_count} az qalıb · ${stats.out_of_stock_count} bitib`} className="h-full hover:bg-surface-2 transition-colors" />
        </Link>
        <Link to="/business/finance/kassa" className="block min-w-0">
          <KpiCard label="Son 14 gün xalis" value={report.net} money meaning="profit" note={`Gəlir ${formatCurrency(report.total_income)} · Xərc ${formatCurrency(report.total_expense)}`} className="h-full hover:bg-surface-2 transition-colors" />
        </Link>
      </div>

      {stats.out_of_stock_count > 0 && (
        <Link
          to="/business/warehouse/products?tab=out"
          className="block bg-danger-subtle border border-danger/30 rounded-lg px-5 py-3 text-body text-danger-strong font-semibold hover:opacity-90 transition-opacity"
        >
          {stats.out_of_stock_count} məhsul stokda bitib — Bitənlərə bax →
        </Link>
      )}

      {/* Son sifarişlər */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="card-title">Son sifarişlər</h2>
          <Link to="/business/orders" className="text-small font-semibold text-ink hover:underline underline-offset-2">Hamısına bax →</Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-body text-text-3 px-5 py-8 text-center">Hələ sifariş yoxdur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th className="ledger-th">№</th>
                  <th className="ledger-th">Müştəri</th>
                  <th className="ledger-th">Nişan</th>
                  <th className="ledger-th">Vəziyyət</th>
                  <th className="ledger-th text-right">Məbləğ</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id} onClick={() => navigate(`/business/orders/${o.id}`)} className="ledger-row">
                    <td className="ledger-td font-mono font-semibold">{o.number ?? o.id}</td>
                    <td className="ledger-td">{[o.customer_name, o.customer_surname].filter(Boolean).join(' ') || <span className="text-text-3">—</span>}</td>
                    <td className="ledger-td"><Plate value={o.plate_number} /></td>
                    <td className="ledger-td"><StatusBadge status={o.status} /></td>
                    <td className="ledger-td text-right">{o.total != null && o.total > 0 ? <Money value={o.total} /> : <span className="text-text-3">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Həftəlik gəlir — 7 days, Monday to Sunday */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="card-title">Həftəlik gəlir</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftWeek(-1)}
                disabled={weekLoading}
                aria-label="Əvvəlki həftə"
                className="w-9 h-9 rounded flex items-center justify-center border border-border-strong text-text-2 hover:bg-surface-2 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-small font-mono text-ink min-w-[120px] text-center">
                {formatShort(weekly.week_start)} – {formatShort(weekly.week_end)}
              </span>
              <button
                type="button"
                onClick={() => shiftWeek(1)}
                disabled={weekLoading || isCurrentWeek}
                aria-label="Növbəti həftə"
                className="w-9 h-9 rounded flex items-center justify-center border border-border-strong text-text-2 hover:bg-surface-2 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-mono font-semibold tabular-nums text-[34px] leading-10 text-ink">
                {Number(weekly.total).toLocaleString('az-AZ', { maximumFractionDigits: 0 })} <span className="text-h3 text-text-3">₼</span>
              </p>
              <div className="mt-1 flex items-center gap-2 text-small">
                {weekly.change_percent != null && (
                  <span
                    className="inline-flex items-center gap-0.5 font-semibold"
                    style={{ color: weekly.change_percent >= 0 ? CHART_INCOME : CHART_EXPENSE }}
                  >
                    {weekly.change_percent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {weekly.change_percent >= 0 ? '+' : ''}{weekly.change_percent}%
                  </span>
                )}
                <span className="text-text-3">əvvəlki həftəyə görə</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={weekChart} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barCategoryGap="22%">
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  formatter={(v: unknown) => [formatCurrency(Number(v)), 'Gəlir']}
                  labelFormatter={(l: unknown) => {
                    const day = weekChart.find(d => d.label === l)
                    return day ? formatDate(day.date) : String(l)
                  }}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} minPointSize={6}>
                  {weekChart.map(d => (
                    <Cell key={d.date} fill={d.is_today ? CHART_SEQUENTIAL : d.is_future ? '#E0E0E0' : '#A0A0A0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Kassa: last 14 days */}
        <section className="card p-5">
          <h2 className="card-title mb-4">Kassa — son 14 gün</h2>
          {dailyRows.length === 0 ? (
            <p className="text-body text-text-3">Bu dövrdə qeyd yoxdur.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E0E0E0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: '#E0E0E0' }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Gəlir" fill={CHART_INCOME} radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" name="Xərc" fill={CHART_EXPENSE} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>
    </div>
  )
}
