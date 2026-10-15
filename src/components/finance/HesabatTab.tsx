import { ReactNode, useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { FinanceReport } from '@/types'
import { getFinanceReport } from '@/services/finance.service'
import { formatCurrency } from '@/lib/utils'
import KpiCard from '@/components/ui/KpiCard'
import Money from '@/components/ui/Money'
import PageHeader from '@/components/ui/PageHeader'
import PeriodFilter from '@/components/ui/PeriodFilter'
import { Period, makePeriod, periodLabel as describePeriod, periodRange } from '@/lib/period'
import Spinner from '@/components/ui/Spinner'
import { EXPENSE_CATEGORY_LABELS, INCOME_CATEGORY_LABELS } from '@/lib/chartColors'

// Final tokens: success / danger for the two series (no gradients).
const SERIES_INCOME = '#0F7A5A'
const SERIES_EXPENSE = '#9B1C1C'

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
    <div className="flex flex-col gap-6">
      <PageHeader title="Maliyyə · Hesabat" subtitle={describePeriod(period)} />

      <PeriodFilter value={period} onChange={setPeriod} />

      {loading || !report ? (
        <Spinner />
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="font-display font-bold text-h3 text-ink">1. Mənfəət</h2>
              <p className="text-body text-text-3 mt-1 max-w-3xl">
                İş tamamlanan gün sayılır — müştəri ödəyib-ödəməməsindən asılı deyil. Mal alışı burada xərc deyil;
                malın maya dəyəri satılanda (sifariş tamamlananda) xərcə düşür.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <NumberBlock label="Gəlir">
                <Money value={report.total_income} meaning="income" sign="none" showWord={false} className="!justify-start text-[30px] leading-10" />
              </NumberBlock>
              <NumberBlock label="Xərc">
                <Money value={report.total_expense} meaning="expense" sign="none" showWord={false} className="!justify-start text-[30px] leading-10" />
              </NumberBlock>
              <NumberBlock label="Xalis">
                <span className="font-mono font-semibold tabular-nums text-[30px] leading-10 text-ink">
                  {report.net < 0 ? '−' : report.net > 0 ? '+' : ''}{formatCurrency(Math.abs(report.net))}
                </span>
              </NumberBlock>
            </div>

            <div className="card p-5">
              <h3 className="section-label mb-4">Gəlir / Xərc — gün üzrə</h3>
              {report.daily.length === 0 ? (
                <p className="text-body text-text-3">Bu dövrdə qeyd yoxdur.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={report.daily} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#E0E0E0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B6B6B' }} tickLine={false} axisLine={{ stroke: '#E0E0E0' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} tickLine={false} axisLine={false} width={60} />
                    <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} contentStyle={{ background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: 10, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="income" name="Gəlir" stroke={SERIES_INCOME} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="expense" name="Xərc" stroke={SERIES_EXPENSE} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Each category shows once: as exact lists (the old expense bar chart repeated the same rows). */}
            <div className="grid lg:grid-cols-2 gap-3">
              <BreakdownCard
                title="Gəlir — maddə üzrə"
                rows={report.income_by_category.map(c => ({ label: INCOME_CATEGORY_LABELS[c.category] || EXPENSE_CATEGORY_LABELS[c.category] || c.category, amount: Number(c.amount) }))}
                total={Number(report.total_income)}
              />
              <BreakdownCard
                title="Xərc — maddə üzrə"
                rows={report.expense_by_category.map(c => ({ label: EXPENSE_CATEGORY_LABELS[c.category] || c.category, amount: Number(c.amount) }))}
                total={Number(report.total_expense)}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display font-bold text-h3 text-ink">2. Dövr ərzində hərəkətlər</h2>
            <div className="card grid md:grid-cols-2 md:divide-x divide-border">
              <div className="divide-y divide-border">
                <MoveRow label="Nisyə alınan mal (kreditorlara borc əlavə olundu)" value={report.movements.purchases_credit} />
                <MoveRow label="Nağd alınan mal (kassadan)" value={report.movements.purchases_cash} />
                <MoveRow label="Kreditorlara ödənilən" value={report.movements.supplier_payments} />
              </div>
              <div className="divide-y divide-border border-t border-border md:border-t-0">
                <MoveRow label="Müştərilərdən yığılan (sifariş ödənişləri)" value={report.movements.customer_payments} />
                <MoveRow label="Kassaya daxil olan / çıxan" value={report.movements.cash_in} second={report.movements.cash_out} />
                <MoveRow label="Sahibkar qoydu / götürdü (mənfəətə təsir etmir)" value={report.movements.owner_deposits} second={report.movements.owner_draws} />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display font-bold text-h3 text-ink">3. Bu günə vəziyyət</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KpiCard label="Anbarın dəyəri" value={Number(report.balances.stock_value)} money note="Rəfdəki malın alış (maya) dəyəri" />
              <KpiCard label="Kreditorlara borc" value={Number(report.balances.creditors)} money meaning="payable" note="Ödəniləcək · Mağazalara ödənməli" />
              <KpiCard label="Debitorlardan alınacaq" value={Number(report.balances.debtors)} money meaning="receivable" note="Alınacaq · Müştərilərin borcu" />
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function NumberBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t-[3px] border-ink pt-3">
      <p className="font-sans text-label uppercase text-text-3 mb-1">{label}</p>
      {children}
    </div>
  )
}

function BreakdownCard({ title, rows, total }: { title: string; rows: { label: string; amount: number }[]; total: number }) {
  return (
    <div className="card overflow-hidden">
      <p className="section-label px-5 py-4">{title}</p>
      {rows.length === 0 ? <p className="px-5 pb-5 text-body text-text-3">Bu dövrdə yoxdur.</p> : (
        <div className="flex flex-col divide-y divide-border border-t border-border">
          {rows.map(r => (
            <div key={r.label} className="flex items-center justify-between px-5 py-3 text-body">
              <span className="text-text-2">{r.label}</span>
              <Money value={r.amount} />
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3 bg-surface-2 font-semibold">
            <span>Cəmi</span>
            <Money value={total} className="font-bold" />
          </div>
        </div>
      )}
    </div>
  )
}

function MoveRow({ label, value, second }: { label: string; value: number; second?: number }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 text-body">
      <span className="text-text-2">{label}</span>
      <span className="shrink-0 inline-flex items-baseline gap-2">
        {second === undefined ? (
          <Money value={value} />
        ) : (
          <>
            <Money value={value} meaning="income" />
            <span className="text-text-3">/</span>
            <Money value={second} meaning="expense" />
          </>
        )}
      </span>
    </div>
  )
}
