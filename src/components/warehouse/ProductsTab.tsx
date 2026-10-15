import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, FileSpreadsheet, Copy, Search } from 'lucide-react'
import { Product } from '@/types'
import { getDuplicates, getProducts, ProductTab } from '@/services/warehouse.service'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import KpiCard from '@/components/ui/KpiCard'
import Money from '@/components/ui/Money'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import Segmented from '@/components/ui/Segmented'
import Spinner from '@/components/ui/Spinner'
import StatusBadge from '@/components/ui/StatusBadge'
import DuplicatesPanel from './DuplicatesPanel'

const TABS: { key: ProductTab; label: string; title: string }[] = [
  { key: 'stock', label: 'Stokda', title: 'Rəfdə olan məhsullar' },
  { key: 'out', label: 'Bitənlər', title: 'Anbar məhsulu, stoku bitib — yenidən almaq lazımdır' },
  { key: 'order', label: 'Sifarişlik', title: 'Anbarda saxlanmır, sifariş üçün alınır' },
  { key: 'archived', label: 'Arxiv', title: 'Artıq işlənməyən məhsullar (tarixçə saxlanılır)' },
]

const TAB_KEY = 'avtoservis:stock:tab'
const PAGE_SIZE = 50

function isLow(p: Product) {
  return p.is_warehouse !== false && p.stock_quantity > 0 && p.stock_quantity < (p.low_stock_threshold ?? 3)
}
function isOut(p: Product) {
  return p.is_warehouse !== false && p.stock_quantity <= 0
}

/** Stok · Məhsullar. A row opens the product's own full page. */
export default function ProductsTab() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<ProductTab>(() => {
    const fromLink = params.get('tab') as ProductTab | null
    if (fromLink && TABS.some(t => t.key === fromLink)) return fromLink
    try {
      const saved = localStorage.getItem(TAB_KEY) as ProductTab
      if (TABS.some(t => t.key === saved)) return saved
    } catch { /* ignore */ }
    return 'stock'
  })
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [duplicateCount, setDuplicateCount] = useState(0)
  // KPI sources are independent of the active tab / search.
  const [kpiStock, setKpiStock] = useState<Product[]>([])
  const [outCount, setOutCount] = useState(0)

  const loadSide = useCallback(() => {
    getDuplicates().then(r => setDuplicateCount(r.data.length)).catch(() => {})
    getProducts(undefined, 'stock').then(r => setKpiStock(r.data)).catch(() => {})
    getProducts(undefined, 'out').then(r => setOutCount(r.data.length)).catch(() => {})
  }, [])
  useEffect(() => { loadSide() }, [loadSide])

  const load = useCallback(async (q: string, t: ProductTab) => {
    setLoading(true)
    setError('')
    try {
      setProducts((await getProducts(q || undefined, t)).data)
    } catch {
      setError('Məhsullar yüklənmədi. Yenidən cəhd edin.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => load(search, tab), search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [search, tab, load])
  useEffect(() => { setPage(1) }, [search, tab])

  function changeTab(t: ProductTab) {
    setTab(t)
    try { localStorage.setItem(TAB_KEY, t) } catch { /* ignore */ }
  }

  const stockValue = useMemo(() => kpiStock.reduce((s, p) => s + Number(p.purchase_price ?? 0) * p.stock_quantity, 0), [kpiStock])
  const lowCount = useMemo(() => kpiStock.filter(isLow).length, [kpiStock])

  // Totals cover every row of the active list, not just the visible page.
  const costTotal = products.reduce((s, p) => s + Number(p.purchase_price ?? 0) * p.stock_quantity, 0)
  const sellTotal = products.reduce((s, p) => s + Number(p.sell_price) * p.stock_quantity, 0)
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE))
  const pageRows = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const activeTab = TABS.find(t => t.key === tab)!

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Stok · Məhsullar"
        subtitle={`${activeTab.title} · ${products.length} məhsul`}
        actions={
          <>
            {duplicateCount > 0 && (
              <Button variant="secondary" icon={Copy} onClick={() => setShowDuplicates(true)}>
                Təkrar məhsullar ({duplicateCount})
              </Button>
            )}
            <Button variant="secondary" icon={FileSpreadsheet} onClick={() => navigate('/business/warehouse/purchases?new=excel')}>Excel idxal</Button>
            <Button icon={Plus} onClick={() => navigate('/business/warehouse/purchases?new=1')}>Yeni alış</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Anbarın dəyəri" value={stockValue} money note="Son alış qiyməti ilə" />
        <KpiCard label="Az qalıb" value={lowCount} note={lowCount ? 'Tezliklə bitəcək məhsullar' : 'Hamısı kifayət qədərdir'} />
        <KpiCard label="Bitib" value={outCount} note={outCount ? 'Yenidən almaq lazımdır' : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={18} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ad və ya kod ilə axtar..."
            aria-label="Axtar"
            className="input !pl-10"
          />
        </div>
        <Segmented label="Bölmə" options={TABS} value={tab} onChange={changeTab} />
      </div>

      {loading && products.length === 0 ? (
        <Spinner />
      ) : error ? (
        <p className="text-body text-danger">{error}</p>
      ) : products.length === 0 ? (
        <EmptyState
          title={search ? 'Heç nə tapılmadı' : 'Bu bölmədə məhsul yoxdur'}
          subtitle={tab === 'stock' ? 'Məhsul əlavə etmək üçün "Yeni alış" düyməsini basın.' : activeTab.title}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ledger-table min-w-[720px]">
              <thead>
                <tr>
                  <th className="ledger-th w-28">Kodu</th>
                  <th className="ledger-th">Adı</th>
                  <th className="ledger-th">Stok</th>
                  <th className="ledger-th text-right">Son alış</th>
                  <th className="ledger-th text-right">Satış</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(p => (
                  <tr key={p.id} onClick={() => navigate(`/business/warehouse/products/${p.id}`)} className="ledger-row">
                    <td className="ledger-td font-mono text-small text-text-3">{p.code || '—'}</td>
                    <td className="ledger-td whitespace-normal font-semibold">{p.name}</td>
                    <td className="ledger-td">
                      <span className="flex items-center gap-2">
                        <span className="font-mono tabular-nums font-semibold min-w-[3ch] text-right">{p.stock_quantity}</span>
                        <span className="text-small text-text-3">{p.unit}</span>
                        {isOut(p) && <StatusBadge status="Bitib" />}
                        {isLow(p) && <StatusBadge status="Az qalıb" />}
                        {p.is_warehouse === false && <Badge variant="neutral">Sifarişlik</Badge>}
                        {p.is_archived && <Badge variant="danger">Arxivdə</Badge>}
                      </span>
                    </td>
                    <td className="ledger-td text-right"><Money value={p.purchase_price ?? 0} /></td>
                    <td className="ledger-td text-right"><Money value={p.sell_price} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2">
                  <td className="ledger-td font-semibold" colSpan={3}>Cəmi · {products.length} məhsul</td>
                  <td className="ledger-td text-right">
                    <span className="block font-sans text-label uppercase text-text-3">Alış dəyəri</span>
                    <Money value={costTotal} className="font-bold" />
                  </td>
                  <td className="ledger-td text-right">
                    <span className="block font-sans text-label uppercase text-text-3">Satış dəyəri</span>
                    <Money value={sellTotal} className="font-bold" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      <DuplicatesPanel
        open={showDuplicates}
        onClose={() => setShowDuplicates(false)}
        onChanged={() => { load(search, tab); loadSide() }}
      />
    </div>
  )
}
