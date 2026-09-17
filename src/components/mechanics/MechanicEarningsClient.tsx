import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MechanicEarnings } from '@/types'
import { getMyEarnings } from '@/services/mechanics.service'
import { formatCurrency } from '@/lib/utils'
import { CHART_SEQUENTIAL } from '@/lib/chartColors'
import Spinner from '@/components/ui/Spinner'

type Preset = '7' | '30' | 'month'

const PRESETS: { key: Preset; label: string }[] = [
  { key: '7', label: 'Son 7 gün' },
  { key: '30', label: 'Son 30 gün' },
  { key: 'month', label: 'Bu ay' },
]

function rangeFor(preset: Preset) {
  const today = new Date()
  const to = today.toISOString().slice(0, 10)
  let from: string
  if (preset === 'month') {
    from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  } else {
    const start = new Date(today)
    start.setDate(start.getDate() - (Number(preset) - 1))
    from = start.toISOString().slice(0, 10)
  }
  return { from, to }
}

export default function MechanicEarningsClient() {
  const [preset, setPreset] = useState<Preset>('30')
  const [data, setData] = useState<MechanicEarnings | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { from, to } = rangeFor(preset)
      const res = await getMyEarnings(from, to)
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [preset])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-surface border-b border-rule px-5 pt-6 pb-4">
        <h1 className="page-title mb-1.5">Qazancım</h1>
        <p className="text-sm text-ink-muted">Tamamladığınız işlərdən qazandığınız məbləğ</p>
      </div>

      <div className="px-4 py-4 pb-28 max-w-lg mx-auto flex flex-col gap-3">
        {/* Bugün / Bu ay */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card px-5 py-5">
            <p className="section-label mb-2">Bugün</p>
            <p className="text-2xl font-bold text-ink font-mono">
              {data ? formatCurrency(data.today ?? 0) : '—'}
            </p>
          </div>
          <div className="card px-5 py-5">
            <p className="section-label mb-2">Bu ay</p>
            <p className="text-2xl font-bold text-ink font-mono">
              {data ? formatCurrency(data.this_month ?? 0) : '—'}
            </p>
          </div>
        </div>

        {/* Period selector + daily breakdown */}
        <div className="card px-5 py-5">
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${
                  preset === p.key
                    ? 'bg-sidebar text-cream border-sidebar'
                    : 'bg-surface text-ink-muted border-rule hover:border-ink-muted'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {loading ? (
            <Spinner />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="section-label mb-0">Seçilmiş dövr üçün cəmi</p>
                <p className="font-mono font-semibold text-sm text-ink">{formatCurrency(data?.total ?? 0)}</p>
              </div>
              {!data || data.daily.length === 0 ? (
                <p className="text-sm text-ink-muted">Bu dövrdə qazanc qeydi yoxdur.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#CBD3C7" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7264' }} tickLine={false} axisLine={{ stroke: '#CBD3C7' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7264' }} tickLine={false} axisLine={false} width={56} />
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={{ background: '#FFFFFF', border: '1px solid #CBD3C7', borderRadius: 4, fontSize: 12 }} />
                    <Bar dataKey="amount" name="Qazanc" fill={CHART_SEQUENTIAL} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
