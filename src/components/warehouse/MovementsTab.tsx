import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { StockMovement, StockMovementKind } from '@/types'
import { getMovements } from '@/services/warehouse.service'
import { formatCurrency, formatDate } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'
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

export default function MovementsTab() {
  const [params] = useSearchParams()
  const product = params.get('product') ? parseInt(params.get('product')!) : undefined
  const [rows, setRows] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
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
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        {!product && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Məhsul adı və ya kodu..." className="input max-w-xs" />
        )}
        <select value={kind} onChange={e => setKind(e.target.value)} className="input w-auto">
          {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">Başlanğıc
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-mono" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">Son
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-mono" />
        </label>
        {product && (
          <Link to="/business/warehouse/movements" className="text-sm text-accent hover:underline">Filtri sıfırla (bütün məhsullar)</Link>
        )}
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title="Hərəkət tapılmadı" subtitle="Seçilmiş filtr üzrə stok hərəkəti yoxdur." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="ledger-table min-w-[760px]">
            <thead>
              <tr>
                <th className="ledger-th w-28">Tarix</th>
                <th className="ledger-th">Məhsul</th>
                <th className="ledger-th">Növ</th>
                <th className="ledger-th text-right w-20">Say</th>
                <th className="ledger-th text-right w-28">Maya</th>
                <th className="ledger-th">Haradan / hara</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(m => (
                <tr key={m.id} className="ledger-row cursor-default">
                  <td className="ledger-td font-mono text-ink-muted">{formatDate(m.date)}</td>
                  <td className="ledger-td whitespace-normal">
                    <Link to={`/business/warehouse/products/${m.product}`} className="font-medium text-ink hover:text-accent">{m.product_name}</Link>
                  </td>
                  <td className="ledger-td"><MovementKindBadge kind={m.kind} label={m.kind_label} /></td>
                  <td className={`ledger-td text-right font-mono font-semibold ${m.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </td>
                  <td className="ledger-td text-right font-mono text-ink-soft">{formatCurrency(m.unit_cost)}</td>
                  <td className="ledger-td whitespace-normal text-sm">
                    {m.order ? (
                      <Link to={`/business/orders/${m.order}`} className="text-accent hover:underline">
                        Sifariş #{m.order_number}{m.customer_name ? ` · ${m.customer_name}` : m.plate_number ? ` · ${m.plate_number}` : ''}
                      </Link>
                    ) : m.purchase ? (
                      <Link to={`/business/warehouse/purchases/${m.purchase}`} className="text-accent hover:underline">{m.store_name ?? 'Alış'}</Link>
                    ) : (
                      <span className="text-ink-muted">{m.store_name ?? ''}</span>
                    )}
                    {m.note && <span className="block text-xs text-ink-muted">{m.note}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3"><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div>
        </div>
      )}
    </div>
  )
}
