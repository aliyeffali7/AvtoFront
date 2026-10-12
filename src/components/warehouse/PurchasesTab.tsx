import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Purchase } from '@/types'
import { getPurchases } from '@/services/warehouse.service'
import { formatCurrency, formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import MasterDetailShell from '@/components/ui/MasterDetailShell'
import Pagination from '@/components/ui/Pagination'
import Spinner from '@/components/ui/Spinner'
import PurchaseForm from './PurchaseForm'
import PurchaseDetail from './PurchaseDetail'

const SOURCE_LABEL: Record<Purchase['source'], string> = {
  manual: 'Əl ilə',
  excel: 'Excel',
  order: 'Sifariş üçün',
  migration: 'Köhnə qeyd',
}

export default function PurchasesTab() {
  const navigate = useNavigate()
  const { purchaseId } = useParams<{ purchaseId?: string }>()
  const [params, setParams] = useSearchParams()
  const creating = params.get('new')
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [credit, setCredit] = useState<'all' | 'true' | 'false'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPurchases({
        page, search: search || undefined,
        ...(credit !== 'all' ? { on_credit: credit === 'true' } : {}),
      })
      setPurchases(res.data.results)
      setTotalPages(res.data.total_pages)
    } finally {
      setLoading(false)
    }
  }, [page, search, credit])

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])
  useEffect(() => { setPage(1) }, [search, credit])

  const selectedId = purchaseId ? parseInt(purchaseId) : null
  const startCreate = () => setParams({ new: '1' })
  const close = () => navigate('/business/warehouse/purchases', { replace: true })

  const list = (
    <>
      {loading ? <Spinner /> : purchases.length === 0 ? (
        <div className="p-6"><EmptyState title="Alış yoxdur" subtitle='Mağazadan mal gələndə "Yeni alış" düyməsini basın.' /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="ledger-table min-w-[600px]">
            <thead>
              <tr>
                <th className="ledger-th w-28">Tarix</th>
                <th className="ledger-th">Mağaza</th>
                <th className="ledger-th">Ödəniş</th>
                <th className="ledger-th text-center">Məhsul</th>
                <th className="ledger-th text-right">Məbləğ</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map(p => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/business/warehouse/purchases/${p.id}`, { replace: selectedId !== null })}
                  className={`ledger-row ${selectedId === p.id ? 'ledger-row-selected' : ''} ${p.is_cancelled ? 'opacity-50' : ''}`}
                >
                  <td className="ledger-td font-mono text-ink-muted">{formatDate(p.date)}</td>
                  <td className="ledger-td whitespace-normal">
                    <span className="font-medium text-ink">{p.store_name}</span>
                    <span className="block text-xs text-ink-muted">
                      {SOURCE_LABEL[p.source]}{p.order_number ? ` · Sifariş #${p.order_number}` : ''}{p.invoice_no ? ` · №${p.invoice_no}` : ''}
                    </span>
                  </td>
                  <td className="ledger-td">
                    {p.is_cancelled ? <Badge variant="danger">Ləğv edilib</Badge>
                      : <Badge variant={p.on_credit ? 'warning' : 'success'}>{p.on_credit ? 'Nisyə' : 'Nağd'}</Badge>}
                  </td>
                  <td className="ledger-td text-center font-mono">{p.line_count}</td>
                  <td className="ledger-td text-right font-mono font-semibold">{formatCurrency(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3"><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div>
        </div>
      )}
    </>
  )

  let detail = null
  if (creating) {
    detail = (
      <PurchaseForm
        startWithExcel={creating === 'excel'}
        onSaved={id => { load(); navigate(`/business/warehouse/purchases/${id}`, { replace: true }) }}
        onCancel={() => setParams({})}
      />
    )
  } else if (selectedId) {
    detail = <PurchaseDetail key={selectedId} purchaseId={selectedId} onChanged={load} />
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Mağaza, məhsul və ya qaimə № ..." className="input sm:max-w-xs" />
        <div className="flex gap-1 border border-rule rounded p-1 bg-surface-alt w-fit">
          {([['all', 'Hamısı'], ['true', 'Nisyə'], ['false', 'Nağd']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setCredit(k)}
              className={`px-4 py-1.5 rounded text-sm font-medium ${credit === k ? 'bg-surface text-ink border border-rule' : 'text-ink-muted hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>
        <Button className="sm:ml-auto" onClick={startCreate}>
          <Plus className="w-4 h-4" strokeWidth={2.5} /> Yeni alış
        </Button>
      </div>
      <MasterDetailShell list={list} detail={detail} onClose={creating ? () => setParams({}) : close} />
    </div>
  )
}
