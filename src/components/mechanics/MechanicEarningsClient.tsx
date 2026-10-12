import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MechanicAccount, MechanicEarnings } from '@/types'
import { getMyAccount, getMyEarnings } from '@/services/mechanics.service'
import { formatCurrency } from '@/lib/utils'
import PeriodFilter from '@/components/ui/PeriodFilter'
import { Period, makePeriod, periodRange } from '@/lib/period'
import { CHART_SEQUENTIAL } from '@/lib/chartColors'
import Spinner from '@/components/ui/Spinner'

export default function MechanicEarningsClient() {
  const [period, setPeriod] = useState<Period>(() => makePeriod('30'))
  const [data, setData] = useState<MechanicEarnings | null>(null)
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<MechanicAccount | null>(null)

  useEffect(() => { getMyAccount().then(r => setAccount(r.data)).catch(() => {}) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { from, to } = periodRange(period)
      const res = await getMyEarnings(from ?? '', to ?? '')
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [period])

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

        {/* Account: what the shop still owes */}
        {account && (
          <div className="card px-5 py-4 grid grid-cols-2 gap-3">
            <div>
              <p className="section-label mb-1">Aldığım (cəmi)</p>
              <p className="text-lg font-bold text-ink font-mono">{formatCurrency(account.paid)}</p>
            </div>
            <div>
              <p className="section-label mb-1">Mənə borc</p>
              <p className={`text-lg font-bold font-mono ${account.balance > 0 ? 'text-accent' : 'text-ink'}`}>{formatCurrency(account.balance)}</p>
            </div>
            {account.this_month_salary > 0 && (
              <p className="col-span-2 text-xs text-ink-muted">Bu ayın maaşından bu günə qədər: {formatCurrency(account.this_month_salary)}</p>
            )}
          </div>
        )}

        {/* Period selector + daily breakdown */}
        <div className="card px-5 py-5">
          <PeriodFilter value={period} onChange={setPeriod} className="mb-4" />

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
                    <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} contentStyle={{ background: '#FFFFFF', border: '1px solid #CBD3C7', borderRadius: 10, fontSize: 12 }} />
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
