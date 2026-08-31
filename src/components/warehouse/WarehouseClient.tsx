import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Product, Store } from '@/types'
import { getProducts, createProduct, adjustStock, deleteProduct, bulkDeleteProducts, importProductsExcel, getProductUsage, getProductBatches, getSupplierDebts, ProductUsage, ProductBatch } from '@/services/warehouse.service'
import { getStores } from '@/services/stores.service'
import { resolveStoreId, mergeStoreNames } from '@/lib/resolveStore'
import { formatCurrency, mapApiError } from '@/lib/utils'
import ComboboxInput from '@/components/ui/ComboboxInput'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import StatusBadge from '@/components/orders/StatusBadge'

function ProductUsageModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const navigate = useNavigate()
  const [usages, setUsages] = useState<ProductUsage[]>([])
  const [batches, setBatches] = useState<ProductBatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getProductUsage(product.id).catch(() => ({ data: [] as ProductUsage[] })),
      getProductBatches(product.id).catch(() => ({ data: [] as ProductBatch[] })),
    ])
      .then(([usageRes, batchRes]) => {
        setUsages(usageRes.data)
        setBatches(batchRes.data)
      })
      .finally(() => setLoading(false))
  }, [product.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/45">
      <div className="bg-surface border border-rule rounded w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-rule shrink-0">
          <div>
            <h2 className="font-serif font-semibold text-lg text-ink">{product.name}</h2>
            <p className="text-xs text-ink-muted mt-0.5">İstifadə tarixçəsi</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-surface-alt text-ink-muted">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {!loading && batches.length > 0 && (
            <div className="px-6 py-4 border-b border-rule bg-surface-alt/50">
              <p className="section-label mb-2">Qalan partiyalar (FIFO)</p>
              <div className="flex flex-col gap-1.5">
                {batches.map(b => (
                  <div key={b.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted font-mono text-xs">{b.date}</span>
                    <span className="font-mono text-ink">{b.remaining_quantity} ədəd × {formatCurrency(Number(b.purchase_price))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {loading ? (
            <Spinner className="w-7 h-7" />
          ) : usages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-ink-muted font-medium">Bu məhsul heç bir sifarişdə istifadə edilməyib.</p>
            </div>
          ) : (
            <div className="divide-y divide-rule">
              {usages.map((u, i) => (
                <button
                  key={i}
                  onClick={() => { onClose(); navigate(`/business/orders/${u.order_id}`) }}
                  className="w-full text-left px-6 py-4 hover:bg-surface-alt transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono font-bold text-ink text-sm">{u.plate || `#${u.order_id}`}</span>
                      {u.car && <span className="text-xs text-ink-muted">{u.car}</span>}
                      <StatusBadge status={u.status} />
                    </div>
                    <p className="text-xs text-ink-muted font-mono">{u.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-ink font-mono">{u.quantity} ədəd</p>
                    <p className="text-xs text-ink-muted font-mono">{formatCurrency(Number(u.sell_price))} / ədəd</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-rule shrink-0 flex items-center justify-between">
          <p className="text-xs text-ink-muted">{usages.length} sifariş</p>
          <button onClick={onClose} className="btn-secondary text-sm py-2 px-4 min-h-0">Bağla</button>
        </div>
      </div>
    </div>
  )
}

function AddProductPanel({
  open,
  onClose,
  onAdded,
  stores = [],
  storeOptions = [],
}: {
  open: boolean
  onClose: () => void
  onAdded: () => void
  stores?: Store[]
  storeOptions?: string[]
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [unit, setUnit] = useState('ədəd')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [discountPercent, setDiscountPercent] = useState('0')
  const [stock, setStock] = useState('')
  const [onCredit, setOnCredit] = useState(true)
  const [supplierName, setSupplierName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const stockQty = parseInt(stock) || 0

  function reset() {
    setName(''); setCode(''); setUnit('ədəd')
    setPurchasePrice(''); setSellPrice(''); setDiscountPercent('0'); setStock('')
    setOnCredit(true); setSupplierName(''); setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (stockQty > 0 && !supplierName.trim()) {
      setError('Mağaza seçin, ya da adını yazıb yenisini yaradın.')
      return
    }
    setLoading(true)
    try {
      const storeId = stockQty > 0 ? await resolveStoreId(stores, supplierName) : undefined
      await createProduct({
        name,
        code,
        unit,
        purchase_price: parseFloat(purchasePrice),
        sell_price: parseFloat(sellPrice),
        discount_percent: parseFloat(discountPercent) || 0,
        stock_quantity: stockQty,
        on_credit: onCredit,
        store_id: storeId,
      } as Parameters<typeof createProduct>[0])
      reset()
      onAdded()
      onClose()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="card px-6 py-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif font-semibold text-lg text-ink">Yeni məhsul</h2>
        <button onClick={onClose} className="p-2 rounded hover:bg-surface-alt text-ink-muted">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-xl">
        <div className="flex flex-col gap-1.5">
          <label className="label">Məhsul adı <span className="text-danger">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Məs. Mühərrik yağı" className="input" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="label">Kodu</label>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Məs. 53698" className="input-mono" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label">Ölçü vahidi</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} className="input">
              <option value="ədəd">ədəd</option>
              <option value="litr">litr</option>
              <option value="kq">kq</option>
              <option value="metr">metr</option>
              <option value="dəst">dəst</option>
              <option value="paket">paket</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label">Alış qiyməti (₼) <span className="text-danger">*</span></label>
          <input value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} required type="number" step="0.01" min="0" placeholder="0.00" className="input-mono" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label">Güzəşt (%)</label>
          <input value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} type="number" step="0.01" min="0" max="100" placeholder="0" className="input-mono" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label">Satış qiyməti (₼) <span className="text-danger">*</span></label>
          <input value={sellPrice} onChange={e => setSellPrice(e.target.value)} required type="number" step="0.01" min="0" placeholder="0.00" className="input-mono" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label">İlkin stok <span className="text-danger">*</span></label>
          <input value={stock} onChange={e => setStock(e.target.value)} required type="number" min="0" placeholder="0" className="input-mono" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label">Ödəniş</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOnCredit(true)}
              className={`flex-1 text-sm font-medium py-2 rounded border transition-colors ${onCredit ? 'bg-accent text-cream border-accent' : 'border-rule text-ink-muted hover:bg-surface-alt'}`}
            >
              Kreditlə
            </button>
            <button
              type="button"
              onClick={() => setOnCredit(false)}
              className={`flex-1 text-sm font-medium py-2 rounded border transition-colors ${!onCredit ? 'bg-accent text-cream border-accent' : 'border-rule text-ink-muted hover:bg-surface-alt'}`}
            >
              Nağd ödənilib
            </button>
          </div>
          <ComboboxInput
            value={supplierName}
            onChange={setSupplierName}
            options={storeOptions}
            placeholder="Məs. Avtoehtiyat MMC"
          />
          {stockQty > 0 ? (
            onCredit ? (
              <p className="text-xs text-ink-muted">Bu məbləğ avtomatik olaraq kreditorlara əlavə ediləcək</p>
            ) : (
              <p className="text-xs text-ink-muted">Bu məbləğ dərhal xərc kimi qeyd ediləcək</p>
            )
          ) : (
            <p className="text-xs text-ink-muted">İlkin stok daxil etsəniz məcburi olacaq</p>
          )}
        </div>
        {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{error}</p>}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={loading}>
            {loading ? 'Saxlanılır...' : 'Saxla'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>Ləğv et</Button>
        </div>
      </form>
    </div>
  )
}

function computedFields(p: Product) {
  const grossTotal = (p.purchase_price ?? 0) * p.stock_quantity
  const discountedPrice = (p.purchase_price ?? 0) * (1 - (p.discount_percent || 0) / 100)
  const discountedTotal = discountedPrice * p.stock_quantity
  const sellTotal = p.sell_price * p.stock_quantity
  return { grossTotal, discountedPrice, discountedTotal, sellTotal }
}

export default function WarehouseClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [supplierDebtNames, setSupplierDebtNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editingStockId, setEditingStockId] = useState<number | null>(null)
  const [stockDraft, setStockDraft] = useState('')
  const [stockSaving, setStockSaving] = useState(false)
  const [stockError, setStockError] = useState('')
  const [stockCreditStep, setStockCreditStep] = useState(false)
  const [stockOnCredit, setStockOnCredit] = useState(true)
  const [stockSupplier, setStockSupplier] = useState('')
  const [usageProduct, setUsageProduct] = useState<Product | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteErrorId, setDeleteErrorId] = useState<number | null>(null)
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ detail: string; errors: string[] } | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importOnCredit, setImportOnCredit] = useState(true)
  const [importSupplier, setImportSupplier] = useState('')
  const [importStoreId, setImportStoreId] = useState<number | undefined>(undefined)
  const [importChoiceError, setImportChoiceError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteError, setBulkDeleteError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allSelected = products.length > 0 && products.every(p => selectedIds.has(p.id))
  const someSelected = selectedIds.size > 0

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(products.map(p => p.id)))
    }
  }

  function closeConfirmDelete() {
    setConfirmDeleteId(null)
    setDeleteErrorId(null)
    setDeleteErrorMsg('')
  }

  function startEditStock(p: Product) {
    setEditingStockId(p.id)
    setStockDraft(String(p.stock_quantity))
    setStockError('')
    setStockCreditStep(false)
    setStockOnCredit(true)
    setStockSupplier('')
  }

  function cancelEditStock() {
    setEditingStockId(null)
    setStockError('')
    setStockCreditStep(false)
  }

  function handleStockConfirmClick(p: Product) {
    const newQty = parseInt(stockDraft)
    if (Number.isNaN(newQty) || newQty < 0) {
      setStockError('Düzgün miqdar daxil edin.')
      return
    }
    // Stock is increasing → ask on-credit vs. paid before committing.
    if (!stockCreditStep && newQty > p.stock_quantity) {
      setStockCreditStep(true)
      return
    }
    saveStock(p.id, newQty)
  }

  async function saveStock(id: number, newQty: number) {
    if (stockCreditStep && !stockSupplier.trim()) {
      setStockError('Mağaza seçin, ya da adını yazıb yenisini yaradın.')
      return
    }
    setStockSaving(true)
    setStockError('')
    try {
      const storeId = stockCreditStep ? await resolveStoreId(stores, stockSupplier) : undefined
      await adjustStock(
        id,
        newQty,
        stockCreditStep ? { on_credit: stockOnCredit, store_id: storeId } : undefined
      )
      load()
      setEditingStockId(null)
      setStockCreditStep(false)
    } catch (err) {
      setStockError(mapApiError(err))
    } finally {
      setStockSaving(false)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    setDeleteErrorId(null)
    setDeleteErrorMsg('')
    try {
      await deleteProduct(id)
      setProducts(prev => prev.filter(p => p.id !== id))
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
      setConfirmDeleteId(null)
    } catch (err) {
      setDeleteErrorId(id)
      setDeleteErrorMsg(mapApiError(err))
    } finally {
      setDeletingId(null)
    }
  }

  async function handleBulkDelete() {
    if (!someSelected) return
    setBulkDeleting(true)
    setBulkDeleteError('')
    try {
      const res = await bulkDeleteProducts(Array.from(selectedIds))
      if (res.data.protected.length > 0) {
        setBulkDeleteError(`Bəzi məhsullar silinə bilmədi (sifarişdə istifadə olunub): ${res.data.protected.join(', ')}`)
      }
      setSelectedIds(new Set())
      load()
    } catch (err) {
      setBulkDeleteError(mapApiError(err))
    } finally {
      setBulkDeleting(false)
    }
  }

  const load = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      const [productsRes, storesRes, debtsRes] = await Promise.all([
        getProducts(q),
        getStores().catch(() => ({ data: [] as Store[] })),
        // Include paid-off debts too — Kreditorlar's own combobox does the
        // same, since a supplier stays "known" even after being paid off.
        getSupplierDebts(true).catch(() => ({ data: [] as { supplier_name: string }[] })),
      ])
      setProducts(productsRes.data)
      setStores(storesRes.data)
      setSupplierDebtNames([...new Set(debtsRes.data.map(d => d.supplier_name))])
    } finally {
      setLoading(false)
    }
  }, [])

  // "Mağaza" options for every store/supplier picker below: Store records
  // alone miss suppliers entered by hand on the Kreditorlar page (no Store
  // gets created there), so merge in Kreditorlar's own supplier names too.
  // resolveStoreId still only matches against real Store records — a name
  // that exists only in Kreditorlar falls through to createStore(), which is
  // the intended "add it there too" behavior.
  const storeOptions = useMemo(
    () => mergeStoreNames(stores, supplierDebtNames),
    [stores, supplierDebtNames]
  )

  async function handleExcelImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setImportResult(null)
    try {
      const res = await importProductsExcel(file, {
        on_credit: importOnCredit,
        store_id: importStoreId,
      })
      setImportResult({ detail: res.data.detail, errors: res.data.errors })
      load()
    } catch (err) {
      setImportResult({ detail: mapApiError(err), errors: [] })
    } finally {
      setImporting(false)
    }
  }

  function openImportModal() {
    setImportOnCredit(true)
    setImportSupplier('')
    setImportStoreId(undefined)
    setImportChoiceError('')
    setImportModalOpen(true)
  }

  async function handleImportFileSelectClick() {
    if (!importSupplier.trim()) {
      setImportChoiceError('Mağaza seçin, ya da adını yazıb yenisini yaradın.')
      return
    }
    const storeId = await resolveStoreId(stores, importSupplier)
    setImportStoreId(storeId)
    setImportModalOpen(false)
    fileInputRef.current?.click()
  }

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const timer = setTimeout(() => { load(search || undefined) }, 300)
    return () => clearTimeout(timer)
  }, [search, load])

  const totalStockValue = products.reduce((s, p) => s + (p.purchase_price ?? 0) * p.stock_quantity, 0)
  const totalSellValue = products.reduce((s, p) => s + p.sell_price * p.stock_quantity, 0)
  const lowStockCount = products.filter(p => p.stock_quantity > 0 && p.stock_quantity < 3).length
  const outOfStockCount = products.filter(p => p.stock_quantity === 0).length

  return (
    <>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
          <p className="text-sm text-ink-muted font-medium shrink-0">{products.length} məhsul</p>
          <div className="flex items-center gap-2 flex-1 sm:justify-end">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Axtar..."
                className="input pl-9 pr-8 text-sm w-full"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelImport} />
            <button
              onClick={openImportModal}
              disabled={importing}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded border border-ink text-ink text-sm font-semibold hover:bg-surface-alt disabled:opacity-60 transition-colors min-h-[44px] shrink-0"
            >
              {importing ? (
                <div className="w-4 h-4 border-2 border-rule border-t-ink rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
              <span className="hidden sm:inline">{importing ? 'Yüklənir...' : 'Excel idxal'}</span>
            </button>
            <button onClick={() => setAddOpen(o => !o)} className="btn-primary shrink-0">
              <svg className={`w-4 h-4 shrink-0 transition-transform ${addOpen ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Məhsul əlavə et</span>
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {products.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="card px-4 py-4">
              <p className="section-label mb-2">Alış dəyəri</p>
              <p className="text-xl font-bold font-mono text-ink">{formatCurrency(totalStockValue)}</p>
            </div>
            <div className="card px-4 py-4">
              <p className="section-label mb-2">Satış dəyəri</p>
              <p className="text-xl font-bold font-mono text-accent">{formatCurrency(totalSellValue)}</p>
            </div>
            {lowStockCount > 0 && (
              <div className="card bg-warning-bg border-warning px-4 py-4">
                <p className="section-label text-warning mb-2">Az qalıb</p>
                <p className="text-xl font-bold font-mono text-warning">{lowStockCount} məhsul</p>
              </div>
            )}
            {outOfStockCount > 0 && (
              <div className="card bg-danger-bg border-danger px-4 py-4">
                <p className="section-label text-danger mb-2">Stokda yoxdur</p>
                <p className="text-xl font-bold font-mono text-danger">{outOfStockCount} məhsul</p>
              </div>
            )}
          </div>
        )}

        {/* Bulk action bar */}
        {someSelected && (
          <div className="mb-4 flex items-center justify-between gap-3 bg-surface-alt border border-accent px-4 py-3 rounded">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-rule text-accent cursor-pointer"
              />
              <span className="text-sm font-semibold text-accent">{selectedIds.size} məhsul seçilib</span>
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-accent hover:text-accent-hover underline">Seçimi sıfırla</button>
            </div>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="btn-danger py-2 px-4 min-h-0"
            >
              {bulkDeleting ? (
                <div className="w-4 h-4 border-2 border-danger/40 border-t-danger rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
              {bulkDeleting ? 'Silinir...' : `${selectedIds.size} məhsulu sil`}
            </button>
          </div>
        )}
        {bulkDeleteError && (
          <div className="mb-4 px-4 py-3 rounded bg-danger-bg border border-danger flex items-start justify-between gap-3">
            <p className="text-sm text-danger">{bulkDeleteError}</p>
            <button onClick={() => setBulkDeleteError('')} className="text-danger/70 hover:text-danger shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Import result banner */}
        {importResult && (
          <div className={`mb-4 px-4 py-3 rounded flex items-start justify-between gap-3 ${importResult.errors.length > 0 ? 'bg-warning-bg border border-warning' : 'bg-success-bg border border-success'}`}>
            <div>
              <p className={`text-sm font-semibold ${importResult.errors.length > 0 ? 'text-warning' : 'text-success'}`}>{importResult.detail}</p>
              {importResult.errors.map((e, i) => (
                <p key={i} className="text-xs text-warning mt-0.5">{e}</p>
              ))}
            </div>
            <button onClick={() => setImportResult(null)} className="text-ink-muted hover:text-ink shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Inline add-product panel */}
        <AddProductPanel open={addOpen} onClose={() => setAddOpen(false)} onAdded={load} stores={stores} storeOptions={storeOptions} />

        {/* Content */}
        {loading ? (
          <div className="card p-12">
            <Spinner />
          </div>
        ) : products.length === 0 ? (
          <EmptyState title="Stok boşdur" subtitle="Məhsul əlavə etmək üçün yuxarıdakı düyməni basın." />
        ) : (
          <>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 xl:hidden">
              {products.map((p, i) => {
                const { discountedPrice, discountedTotal } = computedFields(p)
                const isOut = p.stock_quantity === 0
                const isLow = !isOut && p.stock_quantity < 3
                return (
                  <div key={p.id} className={`card px-4 py-4 ${selectedIds.has(p.id) ? 'bg-surface-alt border-accent' : isOut ? 'bg-danger-bg border-danger' : isLow ? 'bg-warning-bg border-warning' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="mt-0.5 w-4 h-4 rounded border-rule text-accent cursor-pointer shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs text-ink-muted font-mono">#{i + 1}</span>
                            {p.code && <span className="text-xs font-mono bg-surface-alt text-ink-muted px-1.5 py-0.5 rounded">{p.code}</span>}
                            <Badge variant="neutral">{p.unit}</Badge>
                          </div>
                          <p className="font-semibold text-ink text-sm">{p.name}</p>
                          {isOut ? (
                            <div className="mt-1"><Badge variant="danger">Stokda yoxdur</Badge></div>
                          ) : isLow ? (
                            <div className="mt-1"><Badge variant="warning">Az qalıb</Badge></div>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 ml-3 text-right">
                        {editingStockId === p.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              value={stockDraft}
                              onChange={e => setStockDraft(e.target.value)}
                              className="input-mono w-16 py-1 px-2 text-center text-sm"
                              autoFocus
                            />
                            <button onClick={() => handleStockConfirmClick(p)} disabled={stockSaving} className="text-accent hover:text-accent-hover p-1.5 rounded hover:bg-surface-alt" title="Saxla">
                              {stockSaving ? (
                                <span className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                            <button onClick={cancelEditStock} className="text-ink-muted hover:text-ink p-1.5 rounded hover:bg-surface-alt" title="Ləğv et">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEditStock(p)} className={`text-lg font-bold font-mono ${isOut ? 'text-danger' : isLow ? 'text-warning' : 'text-ink'}`}>
                            {p.stock_quantity} <span className="text-xs font-normal text-ink-muted">{p.unit}</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {editingStockId === p.id && stockCreditStep && (
                      <div className="mb-3 -mt-1 flex flex-col gap-1.5">
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => setStockOnCredit(true)} className={`flex-1 text-xs font-medium py-1.5 rounded border transition-colors ${stockOnCredit ? 'bg-accent text-cream border-accent' : 'border-rule text-ink-muted'}`}>Kreditlə</button>
                          <button type="button" onClick={() => setStockOnCredit(false)} className={`flex-1 text-xs font-medium py-1.5 rounded border transition-colors ${!stockOnCredit ? 'bg-accent text-cream border-accent' : 'border-rule text-ink-muted'}`}>Nağd</button>
                        </div>
                        <ComboboxInput value={stockSupplier} onChange={setStockSupplier} options={storeOptions} placeholder="Mağaza adı" className="text-xs" />
                      </div>
                    )}
                    {editingStockId === p.id && stockError && (
                      <p className="text-xs text-danger -mt-2 mb-2 text-right">{stockError}</p>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-xs text-ink-muted">Alış</p>
                        <p className="text-ink-soft font-medium font-mono">{formatCurrency(p.purchase_price ?? 0)}</p>
                      </div>
                      {(p.discount_percent || 0) > 0 && (
                        <div>
                          <p className="text-xs text-ink-muted">Güzəşt</p>
                          <p className="text-warning font-medium font-mono">{p.discount_percent}%</p>
                          <p className="text-xs text-ink-muted font-mono">{formatCurrency(discountedPrice)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-ink-muted">Satış</p>
                        <p className="text-ink font-semibold font-mono">{formatCurrency(p.sell_price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-muted">Cəmi</p>
                        <p className="text-accent font-semibold font-mono">{formatCurrency(discountedTotal)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-rule">
                      <button onClick={() => setUsageProduct(p)} className="text-xs font-semibold text-ink-muted border border-rule px-3 py-1.5 rounded hover:bg-surface-alt">
                        Tarixçə
                      </button>
                      {confirmDeleteId === p.id ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex gap-1">
                            <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="text-xs font-medium px-2 py-1.5 rounded bg-danger text-cream hover:bg-danger/90 disabled:opacity-50">
                              {deletingId === p.id ? '...' : 'Bəli, sil'}
                            </button>
                            <button onClick={closeConfirmDelete} className="text-xs font-medium px-2 py-1.5 rounded border border-rule text-ink-muted">Xeyr</button>
                          </div>
                          {deleteErrorId === p.id && (
                            <p className="text-xs text-danger text-right max-w-[180px]">{deleteErrorMsg}</p>
                          )}
                        </div>
                      ) : (
                        <button onClick={() => { setConfirmDeleteId(p.id); setDeleteErrorId(null) }} className="text-ink-muted hover:text-danger p-1.5 rounded hover:bg-danger-bg transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden xl:block card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="ledger-table min-w-[1000px]">
                  <thead>
                    <tr>
                      <th className="ledger-th w-10">
                        <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4 rounded border-rule text-accent cursor-pointer" />
                      </th>
                      <th className="ledger-th text-center w-10">Sıra</th>
                      <th className="ledger-th w-24">Kodu</th>
                      <th className="ledger-th">Adı</th>
                      <th className="ledger-th text-center w-24">Ölçü vahidi</th>
                      <th className="ledger-th text-center w-16">Sayı</th>
                      <th className="ledger-th text-right w-28">Gross qiyməti</th>
                      <th className="ledger-th text-right w-28">Gross məbləği</th>
                      <th className="ledger-th text-center w-20">Güzəşt (%)</th>
                      <th className="ledger-th text-right w-28">Endirimli qiyməт</th>
                      <th className="ledger-th text-right w-28">Endirimli məbləği</th>
                      <th className="ledger-th text-right w-28">Satış qiyməti</th>
                      <th className="ledger-th w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => {
                      const { grossTotal, discountedPrice, discountedTotal } = computedFields(p)
                      const isOut = p.stock_quantity === 0
                      const isLow = !isOut && p.stock_quantity < 3
                      return (
                        <tr key={p.id} className={`hover:bg-surface-alt transition-colors ${selectedIds.has(p.id) ? 'bg-surface-alt' : isOut ? 'bg-danger-bg/50' : isLow ? 'bg-warning-bg/50' : ''}`}>
                          <td className="ledger-td text-center">
                            <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 rounded border-rule text-accent cursor-pointer" />
                          </td>
                          <td className="ledger-td text-center">
                            <span className="text-xs text-ink-muted font-mono">{i + 1}</span>
                          </td>
                          <td className="ledger-td">
                            <span className="text-xs font-mono text-ink-muted bg-surface-alt px-2 py-0.5 rounded">
                              {p.code || '—'}
                            </span>
                          </td>
                          <td className="ledger-td whitespace-normal">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-ink text-sm">{p.name}</p>
                              {isOut ? (
                                <Badge variant="danger">Stokda yoxdur</Badge>
                              ) : isLow ? (
                                <Badge variant="warning">Az qalıb</Badge>
                              ) : null}
                            </div>
                          </td>
                          <td className="ledger-td text-center">
                            <Badge variant="neutral">{p.unit}</Badge>
                          </td>
                          <td className="ledger-td text-center font-mono">
                            {editingStockId === p.id ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  value={stockDraft}
                                  onChange={e => setStockDraft(e.target.value)}
                                  className="input-mono w-16 py-1 px-2 text-center"
                                  autoFocus
                                />
                                <button onClick={() => handleStockConfirmClick(p)} disabled={stockSaving} className="text-accent hover:text-accent-hover p-1 rounded hover:bg-surface" title="Saxla">
                                  {stockSaving ? (
                                    <span className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                                <button onClick={cancelEditStock} className="text-ink-muted hover:text-ink p-1 rounded hover:bg-surface" title="Ləğv et">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => startEditStock(p)} className={`text-sm font-bold hover:underline ${isOut ? 'text-danger' : isLow ? 'text-warning' : 'text-ink'}`}>
                                {p.stock_quantity}
                              </button>
                            )}
                            {editingStockId === p.id && stockCreditStep && (
                              <div className="mt-2 flex flex-col gap-1.5 text-left">
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={() => setStockOnCredit(true)} className={`flex-1 text-xs font-medium py-1 rounded border transition-colors ${stockOnCredit ? 'bg-accent text-cream border-accent' : 'border-rule text-ink-muted'}`}>Kreditlə</button>
                                  <button type="button" onClick={() => setStockOnCredit(false)} className={`flex-1 text-xs font-medium py-1 rounded border transition-colors ${!stockOnCredit ? 'bg-accent text-cream border-accent' : 'border-rule text-ink-muted'}`}>Nağd</button>
                                </div>
                                <ComboboxInput value={stockSupplier} onChange={setStockSupplier} options={storeOptions} placeholder="Mağaza adı" className="text-xs" />
                              </div>
                            )}
                            {editingStockId === p.id && stockError && (
                              <p className="text-xs text-danger mt-1 whitespace-normal">{stockError}</p>
                            )}
                          </td>
                          <td className="ledger-td text-right font-mono text-ink-soft">
                            {formatCurrency(p.purchase_price ?? 0)}
                          </td>
                          <td className="ledger-td text-right font-mono font-medium text-ink-soft">
                            {formatCurrency(grossTotal)}
                          </td>
                          <td className="ledger-td text-center">
                            {(p.discount_percent || 0) > 0 ? (
                              <Badge variant="warning">{p.discount_percent}%</Badge>
                            ) : (
                              <span className="text-xs text-ink-muted">—</span>
                            )}
                          </td>
                          <td className="ledger-td text-right font-mono">
                            {(p.discount_percent || 0) > 0 ? (
                              <span className="text-warning font-medium">{formatCurrency(discountedPrice)}</span>
                            ) : (
                              <span className="text-ink-muted text-xs">—</span>
                            )}
                          </td>
                          <td className="ledger-td text-right font-mono font-medium">
                            {(p.discount_percent || 0) > 0 ? (
                              <span className="text-warning">{formatCurrency(discountedTotal)}</span>
                            ) : (
                              <span className="text-ink-muted text-xs">—</span>
                            )}
                          </td>
                          <td className="ledger-td text-right">
                            <span className="text-sm font-bold font-mono text-accent">{formatCurrency(p.sell_price)}</span>
                          </td>
                          <td className="ledger-td text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setUsageProduct(p)} className="text-xs font-medium text-ink-muted hover:text-ink hover:underline whitespace-nowrap">
                                Tarixçə
                              </button>
                              {confirmDeleteId === p.id ? (
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="text-xs font-medium px-2 py-1 rounded bg-danger text-cream hover:bg-danger/90 disabled:opacity-50">
                                      {deletingId === p.id ? '...' : 'Bəli, sil'}
                                    </button>
                                    <button onClick={closeConfirmDelete} className="text-xs font-medium px-2 py-1 rounded border border-rule text-ink-muted">Xeyr</button>
                                  </div>
                                  {deleteErrorId === p.id && (
                                    <p className="text-xs text-danger text-right max-w-[200px] leading-tight whitespace-normal">{deleteErrorMsg}</p>
                                  )}
                                </div>
                              ) : (
                                <button onClick={() => { setConfirmDeleteId(p.id); setDeleteErrorId(null) }} className="text-ink-muted/60 hover:text-danger p-1 rounded hover:bg-danger-bg transition-colors">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* Totals row */}
                  <tfoot>
                    <tr className="border-t-2 border-ink">
                      <td colSpan={6} className="px-3 py-3 font-mono font-bold text-[10px] uppercase tracking-[.06em] text-ink-muted">Cəmi</td>
                      <td className="px-3 py-3 text-right text-sm font-mono font-bold text-ink-soft">—</td>
                      <td className="px-3 py-3 text-right text-sm font-mono font-bold text-ink-soft">
                        {formatCurrency(products.reduce((s, p) => s + (p.purchase_price ?? 0) * p.stock_quantity, 0))}
                      </td>
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3 text-right text-sm font-mono font-bold text-warning">
                        {formatCurrency(products.reduce((s, p) => {
                          const dp = (p.purchase_price ?? 0) * (1 - (p.discount_percent || 0) / 100)
                          return s + dp * p.stock_quantity
                        }, 0))}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-mono font-bold text-accent">
                        {formatCurrency(products.reduce((s, p) => s + p.sell_price * p.stock_quantity, 0))}
                      </td>
                      <td className="px-3 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {usageProduct && <ProductUsageModal product={usageProduct} onClose={() => setUsageProduct(null)} />}

      {/* Excel import info modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setImportModalOpen(false)} />
          <div className="relative bg-surface border border-rule rounded w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-success-bg rounded flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="font-serif font-semibold text-lg text-ink">Excel ilə idxal</h2>
              </div>
              <button onClick={() => setImportModalOpen(false)} className="p-2 rounded hover:bg-surface-alt text-ink-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="label">Bu məhsulları necə əldə etmisiniz?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setImportOnCredit(true)}
                    className={`flex-1 text-sm font-medium py-2 rounded border transition-colors ${importOnCredit ? 'bg-accent text-cream border-accent' : 'border-rule text-ink-muted hover:bg-surface-alt'}`}
                  >
                    Kreditlə
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportOnCredit(false)}
                    className={`flex-1 text-sm font-medium py-2 rounded border transition-colors ${!importOnCredit ? 'bg-accent text-cream border-accent' : 'border-rule text-ink-muted hover:bg-surface-alt'}`}
                  >
                    Nağd ödənilib
                  </button>
                </div>
                <ComboboxInput
                  value={importSupplier}
                  onChange={setImportSupplier}
                  options={storeOptions}
                  placeholder="Mağaza adı (Məs. Avtoehtiyat MMC)"
                />
                {importOnCredit ? (
                  <p className="text-xs text-ink-muted">Bütün idxal edilən məhsullar bu kreditora əlavə ediləcək</p>
                ) : (
                  <p className="text-xs text-ink-muted">Ümumi məbləğ dərhal xərc kimi qeyd ediləcək</p>
                )}
                {importChoiceError && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{importChoiceError}</p>}
              </div>
              <p className="text-sm text-ink-muted">
                Yükləyəcəyiniz Excel faylında aşağıdakı sütun başlıqları olmalıdır:
              </p>

              {/* Column table */}
              <div className="rounded border border-rule overflow-hidden">
                <table className="ledger-table text-sm">
                  <thead>
                    <tr>
                      <th className="ledger-th">Sütun</th>
                      <th className="ledger-th">Məlumat</th>
                      <th className="ledger-th text-center">Məcburi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { col: 'Adı', desc: 'Məhsulun adı', required: true },
                      { col: 'Kodu', desc: 'Məhsul kodu / artikul', required: false },
                      { col: 'Ölçü vahidi', desc: 'ədəd, litr, kq...', required: false },
                      { col: 'Sayı', desc: 'Stok miqdarı', required: false },
                      { col: 'Gross qiyməti', desc: 'Satış qiyməti (₼)', required: false },
                      { col: 'Güzəşt (%)', desc: 'Endirim faizi', required: false },
                      { col: 'Endirimli qiymət', desc: 'Alış qiyməti (₼)', required: false },
                    ].map(row => (
                      <tr key={row.col} className="hover:bg-surface-alt">
                        <td className="ledger-td">
                          <code className="text-xs bg-surface-alt text-ink-soft px-2 py-0.5 rounded font-mono">{row.col}</code>
                        </td>
                        <td className="ledger-td text-ink-muted text-xs whitespace-normal">{row.desc}</td>
                        <td className="ledger-td text-center">
                          {row.required
                            ? <span className="text-xs font-semibold text-danger">✓ Bəli</span>
                            : <span className="text-xs text-ink-muted">Xeyr</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Download sample */}
              <a
                href="/numune-ambar.xlsx"
                download="Nümunə Ambar.xlsx"
                className="flex items-center gap-3 px-4 py-3 rounded border border-dashed border-accent bg-surface-alt hover:bg-rule/30 transition-colors group"
              >
                <div className="w-8 h-8 bg-accent rounded flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-cream" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-accent">Nümunə faylı yüklə</p>
                  <p className="text-xs text-ink-muted">Nümunə Ambar.xlsx</p>
                </div>
              </a>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setImportModalOpen(false)}>
                Ləğv et
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleImportFileSelectClick}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Fayl seç
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
