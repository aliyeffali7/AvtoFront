import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Purchase } from '@/types'
import { getPurchases } from '@/services/warehouse.service'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Money from '@/components/ui/Money'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import PeriodFilter from '@/components/ui/PeriodFilter'
import Segmented from '@/components/ui/Segmented'
import Spinner from '@/components/ui/Spinner'
import { Period, makePeriod, periodLabel as describePeriod, periodRange } from '@/lib/period'
import PurchaseForm from './PurchaseForm'
import { t } from '@/i18n'

export const SOURCE_LABEL: Record<Purchase['source'], string> = {
  manual: 'Əl ilə',
  excel: 'Excel',
  order: 'Sifariş üçün',
  migration: 'Köhnə qeyd',
}

type CreditFilter = 'all' | 'true' | 'false'

/** Stok · Alışlar. A row opens the purchase's own full page. */
export default function PurchasesTab() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const creating = params.get('new')
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [credit, setCredit] = useState<CreditFilter>('all')
  const [period, setPeriod] = useState<Period>(() => makePeriod('all'))
  const [totalAmount, setTotalAmount] = useState(0)
  const range = useMemo(() => periodRange(period), [period])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPurchases({
        page, search: search || undefined,
        ...(range.from ? { from: range.from } : {}),
        ...(range.to ? { to: range.to } : {}),
        ...(credit !== 'all' ? { on_credit: credit === 'true' } : {}),
      })
      setPurchases(res.data.results)
      setTotalPages(res.data.total_pages)
      setTotalCount(res.data.count)
      setTotalAmount(Number(res.data.total_amount ?? 0))
    } finally {
      setLoading(false)
    }
  }, [page, search, credit, range])

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])
  useEffect(() => { setPage(1) }, [search, credit, range])

  const startCreate = () => setParams({ new: '1' })
  const periodText = describePeriod(period)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('Stok · Alışlar')}
        subtitle={t('{n} alış', { n: totalCount })}
        actions={<Button icon={Plus} onClick={startCreate}>{t('Yeni alış')}</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={18} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('Mağaza, məhsul və ya qaimə № ...')}
            aria-label={t('Axtar')}
            className="input !pl-10"
          />
        </div>
        <PeriodFilter value={period} onChange={setPeriod} withAll />
        <Segmented
          label={t('Ödəniş')}
          value={credit}
          onChange={setCredit}
          options={[
            { key: 'all', label: t('Hamısı') },
            { key: 'true', label: t('Nisyə') },
            { key: 'false', label: t('Nağd') },
          ]}
        />
      </div>

      {loading && purchases.length === 0 ? <Spinner /> : purchases.length === 0 ? (
        <EmptyState
          title={t('Alış yoxdur')}
          subtitle={period.key === 'all' && !search && credit === 'all'
            ? t('Mağazadan mal gələndə "Yeni alış" düyməsini basın.')
            : t('Seçilmiş filtr üzrə alış tapılmadı. Dövrü və ya filtri dəyişin.')}
          action={<Button icon={Plus} onClick={startCreate}>{t('Yeni alış')}</Button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ledger-table min-w-[820px]">
              <thead>
                <tr>
                  <th className="ledger-th">{t('Qaimə №')}</th>
                  <th className="ledger-th">{t('Tarix')}</th>
                  <th className="ledger-th">{t('Tədarükçü')}</th>
                  <th className="ledger-th">{t('Ödəniş')}</th>
                  <th className="ledger-th">{t('Mənbə')}</th>
                  <th className="ledger-th text-right">{t('Məhsul')}</th>
                  <th className="ledger-th text-right">{t('Məbləğ')}</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/business/warehouse/purchases/${p.id}`)}
                    className={`ledger-row ${p.is_cancelled ? 'opacity-60' : ''}`}
                  >
                    <td className="ledger-td font-mono font-semibold">{p.invoice_no || <span className="text-text-3 font-normal" title={t('Qaimə nömrəsi daxil edilməyib')}>{t('Alış')} #{p.id}</span>}</td>
                    <td className="ledger-td font-mono text-text-2">{formatDate(p.date)}</td>
                    <td className="ledger-td whitespace-normal font-semibold">{p.store_name}</td>
                    <td className="ledger-td">
                      {p.is_cancelled
                        ? <Badge variant="danger">{t('Ləğv edilib')}</Badge>
                        : <Badge variant={p.on_credit ? 'warning' : 'success'}>{p.on_credit ? t('Nisyə') : t('Nağd')}</Badge>}
                    </td>
                    <td className="ledger-td">
                      <Badge variant="neutral">{t(SOURCE_LABEL[p.source])}</Badge>
                      {p.order_number ? <span className="ml-2 font-mono text-small text-text-3">#{p.order_number}</span> : null}
                    </td>
                    <td className="ledger-td text-right font-mono tabular-nums">{p.line_count ?? 0}</td>
                    <td className="ledger-td text-right"><Money value={p.total} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2">
                  <td className="ledger-td font-semibold" colSpan={6}>{period.key === 'all' ? t('Cəmi') : t('{period} üzrə cəmi', { period: periodText })} · {t('{n} alış', { n: totalCount })}</td>
                  <td className="ledger-td text-right"><Money value={totalAmount} className="font-bold" /></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      {creating && (
        <PurchaseForm
          startWithExcel={creating === 'excel'}
          onSaved={id => navigate(`/business/warehouse/purchases/${id}`, { replace: true })}
          onCancel={() => setParams({})}
        />
      )}
    </div>
  )
}
