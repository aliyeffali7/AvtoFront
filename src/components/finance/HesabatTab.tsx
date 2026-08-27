import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { FinanceReport } from '@/types'
import { getFinanceReport } from '@/services/finance.service'
import { formatCurrency } from '@/lib/utils'
import Spinner from '@/components/ui/Spinner'
import { CHART_INCOME, CHART_EXPENSE, EXPENSE_CATEGORY_COLORS, EXPENSE_CATEGORY_LABELS } from '@/lib/chartColors'

type Preset = '7' | '30' | '90' | 'month'

const PRESETS: { key: Preset; label: string }[] = [
  { key: '7', label: 'Son 7 gün' },
  { key: '30', label: 'Son 30 gün' },
  { key: '90', label: 'Son 90 gün' },
  { key: 'month', label: 'Bu ay' },
]

function rangeFor(preset: Preset) {
  const today = new Date()
  const to = today.toISOString().slice(0, 10)
  let from: string
  if (preset === 'month') {
    from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  } else {
    const d = new Date(today)
    d.setDate(d.getDate() - parseInt(preset, 10))
    from = d.toISOString().slice(0, 10)
  }
  return { from, to }
}

export default function HesabatTab() {
  const [preset, setPreset] = useState<Preset>('30')
  const [report, setReport] = useState<FinanceReport | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { from, to } = rangeFor(preset)
      const res = await getFinanceReport(from, to)
      setReport(res.data)
    } finally {
      setLoading(false)
    }
  }, [preset])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="flex flex-wrap gap-1 border border-rule rounded p-1 bg-surface-alt w-fit mb-6">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`text-xs font-mono font-semibold uppercase tracking-wide px-3 py-2 rounded transition-colors ${preset === p.key ? 'bg-ink text-cream' : 'text-ink-muted hover:bg-surface'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading || !report ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
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
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={{ background: '#FFFFFF', border: '1px solid #CBD3C7', borderRadius: 4, fontSize: 12 }} />
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
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={{ background: '#FFFFFF', border: '1px solid #CBD3C7', borderRadius: 4, fontSize: 12 }} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#1F2A24', formatter: (v: any) => formatCurrency(Number(v)) }}>
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
