import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, ClipboardList, Package, Users, Wallet } from 'lucide-react'
import { DashboardStats, FinanceReport, Order, WeeklyIncome } from '@/types'
import { getDashboardStats, getFinanceReport, getWeeklyIncome } from '@/services/finance.service'
import { getOrders } from '@/services/orders.service'
import { formatCurrency, formatDate, toLocalISODate } from '@/lib/utils'
import Spinner from '@/components/ui/Spinner'
import BrandLogo from '@/components/ui/BrandLogo'
import StatusBadge from '@/components/orders/StatusBadge'
import { CHART_INCOME, CHART_EXPENSE, CHART_SEQUENTIAL } from '@/lib/chartColors'

const AXIS_TICK = { fontSize: 11, fill: '#6B6B6B' }
const TOOLTIP_STYLE = { background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: 10, fontSize: 12 }

function formatShort(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}

const WEEKDAYS = ['B.e', 'Ç.a', 'Çər', 'C.a', 'Cüm', 'Şən', 'Baz']

const PANEL = 'bg-surface border border-ink/20 rounded-[10px] shadow-[0_1px_2px_rgba(31,42,36,0.08)]'

function StatTile({ label, value, extra, icon: Icon, tone, accent, to }: {
  label: string
  value: string
  extra?: string
  icon: typeof Wallet
  tone: string
  accent?: string
  to: string
}) {
  return (
    <Link to={to} className={`${PANEL} px-5 py-4 flex items-center gap-4 transition-colors hover:bg-surface-alt`}>
      <span className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${tone}1F`, color: tone }}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-muted mb-0.5">{label}</p>
        <p className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-bold font-mono leading-tight" style={accent ? { color: accent } : undefined}>{value}</span>
          {extra && <span className="text-sm font-mono font-semibold text-ink-muted">{extra}</span>}
        </p>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [report, setReport] = useState<FinanceReport | null>(null)
  const [shownWeek, setShownWeek] = useState<WeeklyIncome | null>(null)
  const [weekLoading, setWeekLoading] = useState(false)
  const [todayOrders, setTodayOrders] = useState<Order[]>([])
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
      const [statsRes, reportRes, ordersRes] = await Promise.all([
        getDashboardStats(),
        getFinanceReport(from, to),
        getOrders({ date_from: to, date_to: to }).catch(() => null),
      ])
      setStats(statsRes.data)
      setShownWeek(statsRes.data.weekly_income)
      setReport(reportRes.data)
      setTodayOrders((ordersRes?.data.results ?? []).slice(0, 5))
      setTodayOrdersCount(ordersRes?.data.count ?? 0)
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
    return <div className="p-6 lg:p-8"><Spinner /></div>
  }


  const dailyRows = report.daily ?? []
  const todayStats = stats.today ?? { net: 0 }
  const weekly = shownWeek
  const isCurrentWeek = weekly.days.some(d => d.is_today)
  const weekChart = weekly.days.map((d, i) => ({ ...d, label: WEEKDAYS[i] }))

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile
          label="Bugünkü xalis"
          value={formatCurrency(todayStats.net)}
          icon={Wallet}
          to="/business/finance/kassa"
          tone={todayStats.net >= 0 ? CHART_INCOME : CHART_EXPENSE}
          accent={todayStats.net >= 0 ? CHART_INCOME : CHART_EXPENSE}
        />
        <StatTile label="Aktiv sifarişlər" value={String(stats.active_orders_count)} icon={ClipboardList} tone="#2a78d6" to="/business/orders" />
        <StatTile
          label="Borclu müştərilər"
          value={String(stats.debtor_customers_count)}
          extra={formatCurrency(stats.debtors_remaining)}
          icon={Users}
          tone="#eb6834"
          to="/business/finance/debitorlar"
        />
        <StatTile label="Stokdakı məhsullar" value={String(stats.in_stock_count)} icon={Package} tone="#1baf7a" to="/business/warehouse" />
      </div>

      {/* Həftəlik gəlir — 7 days, Monday to Sunday */}
      <div className={`${PANEL} p-6 mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-ink-muted">Həftəlik gəlir</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              disabled={weekLoading}
              aria-label="Əvvəlki həftə"
              className="w-8 h-8 flex items-center justify-center border border-ink/20 text-ink-muted hover:text-ink hover:bg-surface-alt disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-sm font-mono text-ink min-w-[132px] text-center">
              {formatShort(weekly.week_start)} – {formatShort(weekly.week_end)}
            </span>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              disabled={weekLoading || isCurrentWeek}
              aria-label="Növbəti həftə"
              className="w-8 h-8 flex items-center justify-center border border-ink/20 text-ink-muted hover:text-ink hover:bg-surface-alt disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="md:w-64 shrink-0">
            <p className="font-serif font-semibold text-[38px] leading-none text-ink">
              {Number(weekly.total).toLocaleString('az-AZ', { maximumFractionDigits: 0 })} <span className="text-2xl text-ink-muted">₼</span>
            </p>
            <div className="mt-3 flex items-center gap-2 text-sm">
              {weekly.change_percent != null && (
                <span
                  className="inline-flex items-center gap-0.5 font-semibold"
                  style={{ color: weekly.change_percent >= 0 ? CHART_INCOME : CHART_EXPENSE }}
                >
                  {weekly.change_percent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {weekly.change_percent >= 0 ? '+' : ''}{weekly.change_percent}%
                </span>
              )}
              <span className="text-ink-muted">əvvəlki həftəyə görə</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
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
                <Bar dataKey="total" radius={[8, 8, 0, 0]} minPointSize={6}>
                  {weekChart.map(d => (
                    <Cell key={d.date} fill={d.is_today ? CHART_SEQUENTIAL : d.is_future ? '#E6EBE3' : '#B9CBBE'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bugünkü sifarişlər */}
      <div className={`${PANEL} mb-8 overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10">
          <h2 className="card-title">
            Bugünkü sifarişlər
            {todayOrdersCount > 0 && <span className="text-ink-muted font-sans text-sm font-medium"> · {todayOrdersCount}</span>}
          </h2>
          <Link to="/business/orders" className="text-sm font-semibold text-accent hover:text-accent-hover">Hamısına bax →</Link>
        </div>
        {todayOrders.length === 0 ? (
          <p className="text-sm text-ink-muted px-6 py-8 text-center">Bu gün hələ sifariş yoxdur.</p>
        ) : (
          <ul>
            {todayOrders.map(o => (
              <li key={o.id} className="border-b border-ink/10 last:border-0">
                <Link to={`/business/orders/${o.id}`} className="flex items-center gap-4 px-6 py-3.5 hover:bg-surface-alt transition-colors">
                  <BrandLogo brand={o.car_brand} className="w-8 h-8" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-semibold text-ink">{o.plate_number || '—'}</p>
                    <p className="text-xs text-ink-muted truncate">
                      {[o.customer_name, o.customer_surname].filter(Boolean).join(' ') || [o.car_brand, o.car_model].filter(Boolean).join(' ') || '—'}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                  <span className="font-mono font-semibold text-ink w-24 text-right">
                    {o.total != null && o.total > 0 ? formatCurrency(o.total) : '—'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {stats.out_of_stock_count > 0 && (
        <Link
          to="/business/warehouse/products?tab=out"
          className="block mb-8 bg-danger-bg border border-danger/30 rounded-[10px] px-6 py-3 text-sm text-danger font-medium hover:opacity-90 transition-opacity"
        >
          {stats.out_of_stock_count} məhsul stokda bitib — Bitənlərə bax →
        </Link>
      )}

      <div className="mb-6">
        {/* Kassa: last 14 days */}
        <div className={`${PANEL} p-6`}>
          <h2 className="card-title mb-4">Kassa — son 14 gün</h2>
          {dailyRows.length === 0 ? (
            <p className="text-sm text-ink-muted">Bu dövrdə qeyd yoxdur.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
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
        </div>
      </div>
    </div>
  )
}
