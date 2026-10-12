import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus, FileSpreadsheet, Copy } from 'lucide-react'
import { Product } from '@/types'
import { getDuplicates, getProducts, ProductTab } from '@/services/warehouse.service'
import { formatCurrency } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import MasterDetailShell from '@/components/ui/MasterDetailShell'
import Spinner from '@/components/ui/Spinner'
import ProductCardPanel from './ProductCardPanel'
import DuplicatesPanel from './DuplicatesPanel'

const TABS: { key: ProductTab; label: string; hint: string }[] = [
  { key: 'stock', label: 'Stokda', hint: 'Rəfdə olan məhsullar' },
  { key: 'out', label: 'Bitənlər', hint: 'Anbar məhsulu, stoku bitib — yenidən almaq lazımdır' },
  { key: 'order', label: 'Sifarişlik', hint: 'Anbarda saxlanmır, sifariş üçün alınır' },
  { key: 'archived', label: 'Arxiv', hint: 'Artıq işlənməyən məhsullar (tarixçə saxlanılır)' },
]

const TAB_KEY = 'avtoservis:stock:tab'

function isLow(p: Product) {
  return p.is_warehouse !== false && p.stock_quantity > 0 && p.stock_quantity < (p.low_stock_threshold ?? 3)
}

export default function ProductsTab() {
  const navigate = useNavigate()
  const { productId } = useParams<{ productId?: string }>()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<ProductTab>(() => {
    const fromLink = params.get('tab') as ProductTab | null
    if (fromLink && TABS.some(t => t.key === fromLink)) return fromLink
    try { return (localStorage.getItem(TAB_KEY) as ProductTab) || 'stock' } catch { return 'stock' }
  })
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [duplicateCount, setDuplicateCount] = useState(0)

  const loadDuplicateCount = useCallback(() => {
    getDuplicates().then(r => setDuplicateCount(r.data.length)).catch(() => {})
  }, [])
  useEffect(() => { loadDuplicateCount() }, [loadDuplicateCount])
  // A product opened by URL (link from elsewhere, browser back) replaces the duplicates panel.
  useEffect(() => { if (productId) setShowDuplicates(false) }, [productId])

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

  function changeTab(t: ProductTab) {
    setTab(t)
    try { localStorage.setItem(TAB_KEY, t) } catch { /* ignore */ }
  }

  const selectedId = productId ? parseInt(productId) : null
  const openProduct = (id: number) => {
    setShowDuplicates(false)
    navigate(`/business/warehouse/products/${id}`, { replace: selectedId !== null })
  }
  const closeProduct = () => {
    setShowDuplicates(false)
    navigate('/business/warehouse/products', { replace: true })
  }

  const stockValue = products.reduce((s, p) => s + Number(p.purchase_price ?? 0) * p.stock_quantity, 0)
  const sellValue = products.reduce((s, p) => s + Number(p.sell_price) * p.stock_quantity, 0)
  const lowCount = products.filter(isLow).length
  const activeTab = TABS.find(t => t.key === tab)!

  const list = (
    <>
      {loading ? (
        <Spinner />
      ) : error ? (
        <p className="p-6 text-sm text-danger">{error}</p>
      ) : products.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title={search ? 'Heç nə tapılmadı' : 'Bu bölmədə məhsul yoxdur'}
            subtitle={tab === 'stock' ? 'Məhsul əlavə etmək üçün "Yeni alış" düyməsini basın.' : activeTab.hint}
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="ledger-table min-w-[640px]">
            <thead>
              <tr>
                <th className="ledger-th w-24">Kodu</th>
                <th className="ledger-th">Adı</th>
                <th className="ledger-th text-center w-24">Stok</th>
                <th className="ledger-th text-right w-28">Son alış</th>
                <th className="ledger-th text-right w-28">Satış</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr
                  key={p.id}
                  onClick={() => openProduct(p.id)}
                  className={`ledger-row ${selectedId === p.id ? 'ledger-row-selected' : ''}`}
                >
                  <td className="ledger-td font-mono text-xs text-ink-muted">{p.code || '—'}</td>
                  <td className="ledger-td whitespace-normal">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-ink">{p.name}</span>
                      {isLow(p) && <Badge variant="warning">Az qalıb</Badge>}
                      {p.is_warehouse === false && tab !== 'order' && <Badge variant="neutral">Sifarişlik</Badge>}
                    </div>
                  </td>
                  <td className="ledger-td text-center font-mono">
                    <span className={p.stock_quantity === 0 ? 'text-ink-muted' : isLow(p) ? 'text-warning font-semibold' : 'text-ink font-semibold'}>
                      {p.stock_quantity}
                    </span>
                    <span className="text-xs text-ink-muted ml-1">{p.unit}</span>
                  </td>
                  <td className="ledger-td text-right font-mono text-ink-soft">{formatCurrency(p.purchase_price ?? 0)}</td>
                  <td className="ledger-td text-right font-mono font-semibold text-accent">{formatCurrency(p.sell_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-1 border border-rule rounded p-1 bg-surface-alt w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              title={t.hint}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === t.key ? 'bg-surface text-ink border border-rule' : 'text-ink-muted hover:text-ink'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Ad və ya kod ilə axtar..."
          className="input lg:max-w-xs"
        />
        <div className="flex gap-2 lg:ml-auto">
          {duplicateCount > 0 && (
            <Button variant="secondary" onClick={() => { navigate('/business/warehouse/products', { replace: true }); setShowDuplicates(true) }}>
              <Copy className="w-4 h-4" />
              Təkrarlar ({duplicateCount})
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/business/warehouse/purchases?new=excel')}>
            <FileSpreadsheet className="w-4 h-4" />
            Excel idxal
          </Button>
          <Button onClick={() => navigate('/business/warehouse/purchases?new=1')}>
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Yeni alış
          </Button>
        </div>
      </div>

      {tab === 'stock' && products.length > 0 && !search && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <div className="card px-4 py-3">
            <p className="section-label mb-1">Alış dəyəri (son qiymətlə)</p>
            <p className="text-lg font-bold font-mono text-ink">{formatCurrency(stockValue)}</p>
          </div>
          <div className="card px-4 py-3">
            <p className="section-label mb-1">Satış dəyəri</p>
            <p className="text-lg font-bold font-mono text-accent">{formatCurrency(sellValue)}</p>
          </div>
          <div className={`card px-4 py-3 ${lowCount ? 'bg-warning-bg border-warning' : ''}`}>
            <p className={`section-label mb-1 ${lowCount ? 'text-warning' : ''}`}>Az qalıb</p>
            <p className={`text-lg font-bold font-mono ${lowCount ? 'text-warning' : 'text-ink'}`}>{lowCount} məhsul</p>
          </div>
        </div>
      )}
      <p className="text-xs text-ink-muted mb-2">{activeTab.hint} · {products.length} məhsul</p>

      <MasterDetailShell
        list={list}
        detail={showDuplicates ? (
          <DuplicatesPanel onChanged={() => { load(search, tab); loadDuplicateCount() }} />
        ) : selectedId ? (
          <ProductCardPanel
            key={selectedId}
            productId={selectedId}
            onChanged={() => { load(search, tab); loadDuplicateCount() }}
            onClosed={closeProduct}
            onOpenProduct={openProduct}
          />
        ) : null}
        onClose={closeProduct}
      />
    </div>
  )
}
