import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Customer } from '@/types'
import { getCustomers } from '@/services/customers.service'
import { formatDate, formatPhone, autoFormatSearch } from '@/lib/utils'
import BrandLogo from '@/components/ui/BrandLogo'
import Avatar from '@/components/ui/Avatar'
import Plate from '@/components/ui/Plate'
import Money from '@/components/ui/Money'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import CustomerForm from './CustomerForm'

/** Customers list. A row opens the customer's own full page. */
export default function CustomersClient() {
  const navigate = useNavigate()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [creating, setCreating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const loadList = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const res = await getCustomers({ page: p, search: debouncedSearch || undefined })
      setCustomers(res.data.results)
      setTotalPages(res.data.total_pages)
      setTotalCount(res.data.count)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => { loadList(page) }, [page, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const pageOrders = customers.reduce((s, c) => s + (c.order_count ?? 0), 0)
  const pageDebt = customers.reduce((s, c) => s + (c.total_debt ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Müştərilər"
        subtitle={`${totalCount} müştəri`}
        actions={<Button icon={Plus} onClick={() => setCreating(true)}>Yeni Müştəri</Button>}
      />

      <div className="relative w-full sm:w-80">
        <Search size={18} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(autoFormatSearch(e.target.value))}
          placeholder="Ad, telefon və ya nişan ilə axtar..."
          aria-label="Axtar"
          className="input !pl-10"
        />
      </div>

      {loading && customers.length === 0 ? <Spinner /> : customers.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? 'Axtarışa uyğun müştəri tapılmadı' : 'Hələ müştəri yoxdur'}
          subtitle={!debouncedSearch ? 'Yeni müştəri əlavə etmək üçün “Yeni Müştəri” düyməsini basın.' : undefined}
          action={!debouncedSearch ? <Button icon={Plus} onClick={() => setCreating(true)}>Yeni Müştəri</Button> : undefined}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th className="ledger-th">Müştəri</th>
                  <th className="ledger-th">Telefon</th>
                  <th className="ledger-th">Avtomobil</th>
                  <th className="ledger-th">Nişan</th>
                  <th className="ledger-th text-right">Sifariş</th>
                  <th className="ledger-th">Son ziyarət</th>
                  <th className="ledger-th text-right">Cəmi ödəniş</th>
                  <th className="ledger-th text-right">Borc</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => {
                  const car = [c.car_brand, c.car_model].filter(Boolean).join(' ')
                  const plate = c.car_plate || c.plates[0]
                  return (
                    <tr key={c.id} onClick={() => navigate(`/business/customers/${c.id}`)} className="ledger-row">
                      <td className="ledger-td">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={c.full_name} size={32} />
                          <span className="font-semibold">{c.full_name}</span>
                        </span>
                      </td>
                      <td className="ledger-td font-mono text-text-2">{formatPhone(c.phone) || <span className="text-text-3">—</span>}</td>
                      <td className="ledger-td">
                        {car ? (
                          <span className="flex items-center gap-2"><BrandLogo brand={c.car_brand} className="w-6 h-6" />{car}</span>
                        ) : <span className="text-text-3">—</span>}
                      </td>
                      <td className="ledger-td">{plate ? <Plate value={plate} /> : <span className="text-text-3">—</span>}</td>
                      <td className="ledger-td text-right font-mono tabular-nums">{c.order_count ?? 0}</td>
                      <td className="ledger-td font-mono text-text-2">{c.last_visit ? formatDate(c.last_visit) : <span className="text-text-3">—</span>}</td>
                      <td className="ledger-td text-right"><Money value={c.total_paid} /></td>
                      <td className="ledger-td text-right">
                        {c.total_debt > 0 ? <Money value={c.total_debt} meaning="receivable" /> : <span className="text-text-3">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2">
                  <td className="ledger-td font-semibold" colSpan={4}>Bu səhifədə cəmi · {customers.length} müştəri</td>
                  <td className="ledger-td text-right font-mono font-bold tabular-nums">{pageOrders}</td>
                  <td className="ledger-td" colSpan={2} />
                  <td className="ledger-td text-right">
                    {pageDebt > 0 ? <Money value={pageDebt} meaning="receivable" className="font-bold" /> : <span className="text-text-3">—</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      {creating && (
        <CustomerForm
          onDone={id => { setCreating(false); navigate(`/business/customers/${id}`) }}
          onCancel={() => setCreating(false)}
        />
      )}
    </div>
  )
}
