import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { StockMovement, StockMovementKind } from '@/types'
import { getMovements } from '@/services/warehouse.service'
import { formatDate } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'
import Money from '@/components/ui/Money'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import Spinner from '@/components/ui/Spinner'
import MovementKindBadge from './MovementKindBadge'

const KINDS: { value: '' | StockMovementKind; label: string }[] = [
  { value: '', label: 'Bütün növlər' },
  { value: 'purchase', label: 'Alış' },
  { value: 'order_out', label: 'Sifarişə çıxış' },
  { value: 'order_return', label: 'Sifarişdən qaytarma' },
  { value: 'supplier_return', label: 'Mağazaya qaytarma' },
  { value: 'write_off', label: 'Silinmə / itki' },
  { value: 'count_adjust', label: 'Sayım düzəlişi' },
  { value: 'purchase_cancel', label: 'Alışın ləğvi' },
  { value: 'opening', label: 'İlkin qalıq' },
]

const LINK = 'font-semibold text-ink hover:underline underline-offset-2'

/** Stok · Hərəkətlər: the full stock ledger with kind / product / date filters. */
export default function MovementsTab() {
  const [params] = useSearchParams()
  const product = params.get('product') ? parseInt(params.get('product')!) : undefined
  const [rows, setRows] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getMovements({
        page, product, kind: kind || undefined, from: from || undefined, to: to || undefined,
        search: search || undefined,
      })
      setRows(res.data.results)
      setTotalPages(res.data.total_pages)
      setTotalCount(res.data.count)
    } finally {
      setLoading(false)
    }
  }, [page, product, kind, from, to, search])

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])
  useEffect(() => { setPage(1) }, [kind, from, to, search, product])

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Stok · Hərəkətlər" subtitle={`${totalCount} hərəkət`} />

      <div className="flex flex-wrap items-end gap-3">
        {!product && (
          <div className="relative w-full sm:w-72">
            <Search size={18} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Məhsul adı və ya kodu..." aria-label="Axtar" className="input !pl-10" />
          </div>
        )}
        <select value={kind} onChange={e => setKind(e.target.value)} className="input w-auto" aria-label="Növ">
          {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <label className="block">
          <span className="label">Başlanğıc</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-mono w-auto" />
        </label>
        <label className="block">
          <span className="label">Son</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-mono w-auto" />
        </label>
        {product && (
          <Link to="/business/warehouse/movements" className="h-11 flex items-center text-small font-semibold text-ink hover:underline underline-offset-2">
            Filtri sıfırla (bütün məhsullar)
          </Link>
        )}
      </div>

      {loading && rows.length === 0 ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title="Hərəkət tapılmadı" subtitle="Seçilmiş filtr üzrə stok hərəkəti yoxdur." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ledger-table min-w-[820px]">
              <thead>
                <tr>
                  <th className="ledger-th w-32">Tarix</th>
                  <th className="ledger-th">Məhsul</th>
                  <th className="ledger-th">Növ</th>
                  <th className="ledger-th text-right">Say</th>
                  <th className="ledger-th text-right">Maya</th>
                  <th className="ledger-th">Haradan / hara</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(m => (
                  <tr key={m.id} className="ledger-row cursor-default">
                    <td className="ledger-td font-mono text-text-2">{formatDate(m.date)}</td>
                    <td className="ledger-td whitespace-normal">
                      <Link to={`/business/warehouse/products/${m.product}`} className={LINK}>{m.product_name}</Link>
                    </td>
                    <td className="ledger-td"><MovementKindBadge kind={m.kind} label={m.kind_label} /></td>
                    <td className="ledger-td text-right font-mono font-semibold tabular-nums">
                      {m.quantity > 0 ? '+' : '−'}{Math.abs(m.quantity)}
                    </td>
                    <td className="ledger-td text-right"><Money value={m.unit_cost} /></td>
                    <td className="ledger-td whitespace-normal">
                      {m.order ? (
                        <Link to={`/business/orders/${m.order}`} className={LINK}>
                          Sifariş #{m.order_number}{m.customer_name ? ` · ${m.customer_name}` : m.plate_number ? ` · ${m.plate_number}` : ''}
                        </Link>
                      ) : m.purchase ? (
                        <Link to={`/business/warehouse/purchases/${m.purchase}`} className={LINK}>{m.store_name ?? 'Alış'}</Link>
                      ) : (
                        <span className="text-text-3">{m.store_name ?? ''}</span>
                      )}
                      {m.note && <span className="block text-small text-text-3">{m.note}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  )
}
