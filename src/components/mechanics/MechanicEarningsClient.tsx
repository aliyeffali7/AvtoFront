import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MechanicAccount, MechanicEarnings } from '@/types'
import { getMyAccount, getMyEarnings } from '@/services/mechanics.service'
import { formatCurrency } from '@/lib/utils'
import PeriodFilter from '@/components/ui/PeriodFilter'
import { Period, makePeriod, periodRange } from '@/lib/period'
import { CHART_SEQUENTIAL } from '@/lib/chartColors'
import Spinner from '@/components/ui/Spinner'
import KpiCard from '@/components/ui/KpiCard'
import Money from '@/components/ui/Money'
import MechanicHeader from '@/components/layout/MechanicHeader'

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
    <div>
      <MechanicHeader title="Qazancım" subtitle="Tamamladığınız işlərdən qazandığınız məbləğ" />

      <div className="p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Bugün" value={data?.today ?? 0} money />
          <KpiCard label="Bu ay" value={data?.this_month ?? 0} money />
        </div>

        {/* Account: what the shop still owes */}
        {account && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Aldığım (cəmi)" value={account.paid} money />
              <KpiCard label="Mənə borc" value={account.balance} money />
            </div>
            {account.this_month_salary > 0 && (
              <p className="text-body text-text-3 px-1">Bu ayın maaşından bu günə qədər: <span className="font-mono font-semibold text-text-2">{formatCurrency(account.this_month_salary)}</span></p>
            )}
          </>
        )}

        {/* Period selector + daily breakdown */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <PeriodFilter value={period} onChange={setPeriod} className="mb-4" />

          {loading ? (
            <Spinner />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="font-sans text-label uppercase text-text-3">Seçilmiş dövr üçün cəmi</p>
                <Money value={data?.total ?? 0} className="text-money" />
              </div>
              {!data || data.daily.length === 0 ? (
                <p className="text-body text-text-3">Bu dövrdə qazanc qeydi yoxdur.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#E0E0E0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B6B6B' }} tickLine={false} axisLine={{ stroke: '#E0E0E0' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} tickLine={false} axisLine={false} width={56} />
                    <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} contentStyle={{ background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: 10, fontSize: 12 }} />
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
