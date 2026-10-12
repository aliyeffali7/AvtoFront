import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { FinanceReport } from '@/types'
import { getFinanceReport } from '@/services/finance.service'
import { formatCurrency } from '@/lib/utils'
import PeriodFilter from '@/components/ui/PeriodFilter'
import { Period, makePeriod, periodRange } from '@/lib/period'
import Spinner from '@/components/ui/Spinner'
import { CHART_INCOME, CHART_EXPENSE, EXPENSE_CATEGORY_COLORS, EXPENSE_CATEGORY_LABELS, INCOME_CATEGORY_LABELS } from '@/lib/chartColors'

export default function HesabatTab() {
  const [period, setPeriod] = useState<Period>(() => makePeriod('30'))
  const [report, setReport] = useState<FinanceReport | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { from, to } = periodRange(period)
      const res = await getFinanceReport(from ?? '', to ?? '')
      setReport(res.data)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <PeriodFilter value={period} onChange={setPeriod} className="mb-6" />

      {loading || !report ? (
        <Spinner />
      ) : (
        <>
          <h2 className="font-serif font-semibold text-lg text-ink mb-1">1. Mənfəət</h2>
          <p className="text-sm text-ink-muted mb-3">
            İş tamamlanan gün sayılır — müştəri ödəyib-ödəməməsindən asılı deyil. Mal alışı burada xərc deyil;
            malın maya dəyəri satılanda (sifariş tamamlananda) xərcə düşür.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="card px-4 py-4">
              <p className="section-label mb-2">Gəlir</p>
              <p className="text-xl font-bold font-mono" style={{ color: CHART_INCOME }}>{formatCurrency(report.total_income)}</p>
            </div>
            <div className="card px-4 py-4">
              <p className="section-label mb-2">Xərc</p>
              <p className="text-xl font-bold font-mono" style={{ color: CHART_EXPENSE }}>{formatCurrency(report.total_expense)}</p>
            </div>
            <div className="card px-4 py-4">
              <p className="section-label mb-2">Xalis</p>
              <p className={`text-xl font-bold font-mono ${report.net >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(report.net)}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-3 mb-8">
            <BreakdownCard
              title="Gəlir"
              rows={report.income_by_category.map(c => ({ label: INCOME_CATEGORY_LABELS[c.category] || EXPENSE_CATEGORY_LABELS[c.category] || c.category, amount: Number(c.amount) }))}
              total={Number(report.total_income)}
            />
            <BreakdownCard
              title="Xərc"
              rows={report.expense_by_category.map(c => ({ label: EXPENSE_CATEGORY_LABELS[c.category] || c.category, amount: Number(c.amount) }))}
              total={Number(report.total_expense)}
            />
          </div>

          <h2 className="font-serif font-semibold text-lg text-ink mb-3">2. Dövr ərzində hərəkətlər</h2>
          <div className="card divide-y divide-rule mb-8">
            <MoveRow label="Nisyə alınan mal (kreditorlara borc əlavə olundu)" value={report.movements.purchases_credit} />
            <MoveRow label="Nağd alınan mal (kassadan)" value={report.movements.purchases_cash} />
            <MoveRow label="Kreditorlara ödənilən" value={report.movements.supplier_payments} />
            <MoveRow label="Müştərilərdən yığılan (sifariş ödənişləri)" value={report.movements.customer_payments} />
            <MoveRow label="Kassaya daxil olan / çıxan" value={report.movements.cash_in} second={report.movements.cash_out} />
            <MoveRow label="Sahibkar qoydu / götürdü (mənfəətə təsir etmir)" value={report.movements.owner_deposits} second={report.movements.owner_draws} />
          </div>

          <h2 className="font-serif font-semibold text-lg text-ink mb-3">3. Bu günə vəziyyət</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <div className="card px-4 py-4">
              <p className="section-label mb-2">Anbarın dəyəri</p>
              <p className="text-xl font-bold font-mono text-ink">{formatCurrency(report.balances.stock_value)}</p>
              <p className="text-xs text-ink-muted mt-1">Rəfdəki malın alış (maya) dəyəri</p>
            </div>
            <div className="card px-4 py-4">
              <p className="section-label mb-2">Kreditorlara borc</p>
              <p className="text-xl font-bold font-mono text-danger">{formatCurrency(report.balances.creditors)}</p>
              <p className="text-xs text-ink-muted mt-1">Mağazalara ödənməli</p>
            </div>
            <div className="card px-4 py-4">
              <p className="section-label mb-2">Debitorlardan alınacaq</p>
              <p className="text-xl font-bold font-mono text-success">{formatCurrency(report.balances.debtors)}</p>
              <p className="text-xs text-ink-muted mt-1">Müştərilərin borcu</p>
            </div>
          </div>

          <div className="card p-6 mb-8">
            <h2 className="card-title mb-4">Gəlir / Xərc — gün üzrə</h2>
            {report.daily.length === 0 ? (
              <p className="text-sm text-ink-muted">Bu dövrdə qeyd yoxdur.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={report.daily} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#CBD3C7" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7264' }} tickLine={false} axisLine={{ stroke: '#CBD3C7' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7264' }} tickLine={false} axisLine={false} width={60} />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} contentStyle={{ background: '#FFFFFF', border: '1px solid #CBD3C7', borderRadius: 10, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="income" name="Gəlir" stroke={CHART_INCOME} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="expense" name="Xərc" stroke={CHART_EXPENSE} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-6">
            <h2 className="card-title mb-4">Xərclər — kateqoriya üzrə</h2>
            {report.expense_by_category.length === 0 ? (
              <p className="text-sm text-ink-muted">Bu dövrdə xərc yoxdur.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(report.expense_by_category.length * 44, 120)}>
                <BarChart
                  data={report.expense_by_category.map(c => ({ ...c, label: EXPENSE_CATEGORY_LABELS[c.category] || c.category }))}
                  layout="vertical"
                  margin={{ top: 4, right: 56, left: 0, bottom: 4 }}
                >
                  <CartesianGrid stroke="#CBD3C7" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7264' }} tickLine={false} axisLine={{ stroke: '#CBD3C7' }} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: '#1F2A24' }} tickLine={false} axisLine={false} width={110} />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} contentStyle={{ background: '#FFFFFF', border: '1px solid #CBD3C7', borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#1F2A24', formatter: (v: unknown) => formatCurrency(Number(v)) }}>
                    {report.expense_by_category.map(c => (
                      <Cell key={c.category} fill={EXPENSE_CATEGORY_COLORS[c.category] || '#6b7264'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function BreakdownCard({ title, rows, total }: { title: string; rows: { label: string; amount: number }[]; total: number }) {
  return (
    <div className="card p-4">
      <p className="card-title mb-2">{title}</p>
      {rows.length === 0 ? <p className="text-sm text-ink-muted">Bu dövrdə yoxdur.</p> : (
        <div className="flex flex-col divide-y divide-rule/60">
          {rows.map(r => (
            <div key={r.label} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-ink-soft">{r.label}</span>
              <span className="font-mono text-ink">{formatCurrency(r.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 text-sm font-semibold">
            <span>Cəmi</span>
            <span className="font-mono">{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function MoveRow({ label, value, second }: { label: string; value: number; second?: number }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="font-mono font-semibold text-ink shrink-0">
        {second === undefined ? formatCurrency(value) : <>+{formatCurrency(value)} / −{formatCurrency(second)}</>}
      </span>
    </div>
  )
}
