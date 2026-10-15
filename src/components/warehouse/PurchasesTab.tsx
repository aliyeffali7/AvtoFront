import { useCallback, useEffect, useState } from 'react'
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
import Segmented from '@/components/ui/Segmented'
import Spinner from '@/components/ui/Spinner'
import PurchaseForm from './PurchaseForm'

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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPurchases({
        page, search: search || undefined,
        ...(credit !== 'all' ? { on_credit: credit === 'true' } : {}),
      })
      setPurchases(res.data.results)
      setTotalPages(res.data.total_pages)
      setTotalCount(res.data.count)
    } finally {
      setLoading(false)
    }
  }, [page, search, credit])

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])
  useEffect(() => { setPage(1) }, [search, credit])

  const startCreate = () => setParams({ new: '1' })
  const pageTotal = purchases.filter(p => !p.is_cancelled).reduce((s, p) => s + Number(p.total), 0)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Stok · Alışlar"
        subtitle={`${totalCount} alış`}
        actions={<Button icon={Plus} onClick={startCreate}>Yeni alış</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={18} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Mağaza, məhsul və ya qaimə № ..."
            aria-label="Axtar"
            className="input !pl-10"
          />
        </div>
        <Segmented
          label="Ödəniş"
          value={credit}
          onChange={setCredit}
          options={[
            { key: 'all', label: 'Hamısı' },
            { key: 'true', label: 'Nisyə' },
            { key: 'false', label: 'Nağd' },
          ]}
        />
      </div>

      {loading && purchases.length === 0 ? <Spinner /> : purchases.length === 0 ? (
        <EmptyState
          title="Alış yoxdur"
          subtitle='Mağazadan mal gələndə "Yeni alış" düyməsini basın.'
          action={<Button icon={Plus} onClick={startCreate}>Yeni alış</Button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ledger-table min-w-[820px]">
              <thead>
                <tr>
                  <th className="ledger-th">Qaimə №</th>
                  <th className="ledger-th">Tarix</th>
                  <th className="ledger-th">Tədarükçü</th>
                  <th className="ledger-th">Ödəniş</th>
                  <th className="ledger-th">Mənbə</th>
                  <th className="ledger-th text-right">Məhsul</th>
                  <th className="ledger-th text-right">Məbləğ</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/business/warehouse/purchases/${p.id}`)}
                    className={`ledger-row ${p.is_cancelled ? 'opacity-60' : ''}`}
                  >
                    <td className="ledger-td font-mono font-semibold">{p.invoice_no || <span className="text-text-3 font-normal" title="Qaimə nömrəsi daxil edilməyib">Alış #{p.id}</span>}</td>
                    <td className="ledger-td font-mono text-text-2">{formatDate(p.date)}</td>
                    <td className="ledger-td whitespace-normal font-semibold">{p.store_name}</td>
                    <td className="ledger-td">
                      {p.is_cancelled
                        ? <Badge variant="danger">Ləğv edilib</Badge>
                        : <Badge variant={p.on_credit ? 'warning' : 'success'}>{p.on_credit ? 'Nisyə' : 'Nağd'}</Badge>}
                    </td>
                    <td className="ledger-td">
                      <Badge variant="neutral">{SOURCE_LABEL[p.source]}</Badge>
                      {p.order_number ? <span className="ml-2 font-mono text-small text-text-3">#{p.order_number}</span> : null}
                    </td>
                    <td className="ledger-td text-right font-mono tabular-nums">{p.line_count ?? 0}</td>
                    <td className="ledger-td text-right"><Money value={p.total} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2">
                  <td className="ledger-td font-semibold" colSpan={6}>Bu səhifədə cəmi · {purchases.length} alış</td>
                  <td className="ledger-td text-right"><Money value={pageTotal} className="font-bold" /></td>
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
