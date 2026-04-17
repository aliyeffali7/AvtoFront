import { useState, useEffect, useCallback, useRef } from 'react'
import { Product } from '@/types'
import { getProducts, createProduct, adjustStock, deleteProduct, importProductsExcel } from '@/services/warehouse.service'
import { formatCurrency, mapApiError } from '@/lib/utils'

function AddProductDrawer({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: () => void
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [unit, setUnit] = useState('ədəd')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [discountPercent, setDiscountPercent] = useState('0')
  const [stock, setStock] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setName(''); setCode(''); setUnit('ədəd')
    setPurchasePrice(''); setSellPrice(''); setDiscountPercent('0'); setStock(''); setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await createProduct({
        name,
        code,
        unit,
        purchase_price: parseFloat(purchasePrice),
        sell_price: parseFloat(sellPrice),
        discount_percent: parseFloat(discountPercent) || 0,
        stock_quantity: parseInt(stock),
      })
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
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Yeni məhsul</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 px-6 py-6 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Məhsul adı <span className="text-red-500">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="Məs. Mühərrik yağı" className="input" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Kodu</label>
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="Məs. 53698" className="input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Ölçü vahidi</label>
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
            <label className="text-sm font-medium text-gray-700">Alış qiyməti (₼) <span className="text-red-500">*</span></label>
            <input value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} required type="number" step="0.01" min="0" placeholder="0.00" className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Güzəşt (%)</label>
            <input value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} type="number" step="0.01" min="0" max="100" placeholder="0" className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Satış qiyməti (₼) <span className="text-red-500">*</span></label>
            <input value={sellPrice} onChange={e => setSellPrice(e.target.value)} required type="number" step="0.01" min="0" placeholder="0.00" className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">İlkin stok <span className="text-red-500">*</span></label>
            <input value={stock} onChange={e => setStock(e.target.value)} required type="number" min="0" placeholder="0" className="input" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="mt-auto flex flex-col gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saxlanılır...' : 'Saxla'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Ləğv et</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AdjustStockDrawer({
  product,
  onClose,
  onUpdated,
}: {
  product: Product | null
  onClose: () => void
  onUpdated: () => void
}) {
  const [qty, setQty] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) setQty(String(product.stock_quantity))
  }, [product])

  if (!product) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await adjustStock(product!.id, parseInt(qty))
      onUpdated()
      onClose()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Stok tənzimlə</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-6">
          <p className="text-sm text-gray-600">Məhsul: <span className="font-medium text-gray-900">{product.name}</span></p>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Yeni stok miqdarı</label>
            <input value={qty} onChange={e => setQty(e.target.value)} required type="number" min="0" className="input" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saxlanılır...' : 'Yenilə'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Ləğv et</button>
        </form>
      </div>
    </div>
  )
}

function computedFields(p: Product) {
  const grossTotal = p.purchase_price * p.stock_quantity
  const discountedPrice = p.purchase_price * (1 - (p.discount_percent || 0) / 100)
  const discountedTotal = discountedPrice * p.stock_quantity
  const sellTotal = p.sell_price * p.stock_quantity
  return { grossTotal, discountedPrice, discountedTotal, sellTotal }
}

export default function WarehouseClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ detail: string; errors: string[] } | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await deleteProduct(id)
      setProducts(prev => prev.filter(p => p.id !== id))
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const load = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      const res = await getProducts(q)
      setProducts(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  async function handleExcelImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setImportResult(null)
    try {
      const res = await importProductsExcel(file)
      setImportResult({ detail: res.data.detail, errors: res.data.errors })
      load()
    } catch (err) {
      setImportResult({ detail: mapApiError(err), errors: [] })
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const timer = setTimeout(() => { load(search || undefined) }, 300)
    return () => clearTimeout(timer)
  }, [search, load])

  const totalStockValue = products.reduce((s, p) => s + p.purchase_price * p.stock_quantity, 0)
  const totalSellValue = products.reduce((s, p) => s + p.sell_price * p.stock_quantity, 0)
  const lowStockCount = products.filter(p => p.stock_quantity > 0 && p.stock_quantity < 3).length
  const outOfStockCount = products.filter(p => p.stock_quantity === 0).length

  return (
    <>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
          <div className="shrink-0">
            <h1 className="text-xl font-bold text-gray-900">Stok</h1>
            <p className="text-sm text-gray-500 mt-0.5">{products.length} məhsul</p>
          </div>
          <div className="flex items-center gap-2 flex-1 sm:justify-end">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelImport} />
            <button
              onClick={() => setImportModalOpen(true)}
              disabled={importing}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl border-2 border-green-600 text-green-700 text-sm font-semibold hover:bg-green-50 disabled:opacity-60 transition-colors min-h-[44px] shrink-0"
            >
              {importing ? (
                <div className="w-4 h-4 border-2 border-green-400 border-t-green-700 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
              <span className="hidden sm:inline">{importing ? 'Yüklənir...' : 'Excel idxal'}</span>
            </button>
            <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-2 shrink-0 min-h-[44px]">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Məhsul əlavə et</span>
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {products.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500 font-medium">Alış dəyəri</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(totalStockValue)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500 font-medium">Satış dəyəri</p>
              <p className="text-lg font-bold text-blue-600 mt-0.5">{formatCurrency(totalSellValue)}</p>
            </div>
            {lowStockCount > 0 && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 px-4 py-3">
                <p className="text-xs text-amber-600 font-medium">Az qalıb</p>
                <p className="text-lg font-bold text-amber-700 mt-0.5">{lowStockCount} məhsul</p>
              </div>
            )}
            {outOfStockCount > 0 && (
              <div className="bg-red-50 rounded-2xl border border-red-200 px-4 py-3">
                <p className="text-xs text-red-600 font-medium">Stokda yoxdur</p>
                <p className="text-lg font-bold text-red-700 mt-0.5">{outOfStockCount} məhsul</p>
              </div>
            )}
          </div>
        )}

        {/* Import result banner */}
        {importResult && (
          <div className={`mb-4 px-4 py-3 rounded-xl flex items-start justify-between gap-3 ${importResult.errors.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
            <div>
              <p className={`text-sm font-semibold ${importResult.errors.length > 0 ? 'text-amber-800' : 'text-green-800'}`}>{importResult.detail}</p>
              {importResult.errors.map((e, i) => (
                <p key={i} className="text-xs text-amber-700 mt-0.5">{e}</p>
              ))}
            </div>
            <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium">Stok boşdur</p>
            <p className="text-gray-500 text-sm mt-1">Məhsul əlavə etmək üçün yuxarıdakı düyməni basın.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 xl:hidden">
              {products.map((p, i) => {
                const { discountedPrice, discountedTotal } = computedFields(p)
                return (
                  <div key={p.id} className={`bg-white rounded-2xl border px-4 py-4 ${p.stock_quantity === 0 ? 'border-red-200 bg-red-50/30' : p.stock_quantity < 3 ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-gray-400 font-mono">#{i + 1}</span>
                          {p.code && <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{p.code}</span>}
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{p.unit}</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                        {p.stock_quantity === 0 ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">Stokda yoxdur</span>
                        ) : p.stock_quantity < 3 && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">Az qalıb</span>
                        )}
                      </div>
                      <span className={`text-lg font-bold shrink-0 ml-3 ${p.stock_quantity === 0 ? 'text-red-600' : p.stock_quantity < 3 ? 'text-amber-600' : 'text-gray-900'}`}>
                        {p.stock_quantity} <span className="text-xs font-normal text-gray-400">{p.unit}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-xs text-gray-400">Alış</p>
                        <p className="text-gray-600 font-medium">{formatCurrency(p.purchase_price)}</p>
                      </div>
                      {(p.discount_percent || 0) > 0 && (
                        <div>
                          <p className="text-xs text-gray-400">Güzəşt</p>
                          <p className="text-orange-600 font-medium">{p.discount_percent}%</p>
                          <p className="text-xs text-gray-500">{formatCurrency(discountedPrice)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-400">Satış</p>
                        <p className="text-gray-900 font-semibold">{formatCurrency(p.sell_price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Cəmi</p>
                        <p className="text-blue-600 font-semibold">{formatCurrency(discountedTotal)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <button onClick={() => setAdjustProduct(p)} className="text-xs font-semibold text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                        Stok tənzimlə
                      </button>
                      {confirmDeleteId === p.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="text-xs font-medium px-2 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                            {deletingId === p.id ? '...' : 'Bəli'}
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs font-medium px-2 py-1.5 rounded-lg border border-gray-300 text-gray-600">Xeyr</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(p.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
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
            <div className="hidden xl:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="bg-orange-50 border-b-2 border-orange-200">
                      <th className="text-center text-xs font-bold text-orange-700 uppercase tracking-wide px-3 py-3 w-10">Sıra</th>
                      <th className="text-left text-xs font-bold text-orange-700 uppercase tracking-wide px-3 py-3 w-24">Kodu</th>
                      <th className="text-left text-xs font-bold text-orange-700 uppercase tracking-wide px-3 py-3">Adı</th>
                      <th className="text-center text-xs font-bold text-orange-700 uppercase tracking-wide px-3 py-3 w-24">Ölçü vahidi</th>
                      <th className="text-center text-xs font-bold text-orange-700 uppercase tracking-wide px-3 py-3 w-16">Sayı</th>
                      <th className="text-right text-xs font-bold text-orange-700 uppercase tracking-wide px-3 py-3 w-28">Gross qiyməti</th>
                      <th className="text-right text-xs font-bold text-orange-700 uppercase tracking-wide px-3 py-3 w-28">Gross məbləği</th>
                      <th className="text-center text-xs font-bold text-orange-700 uppercase tracking-wide px-3 py-3 w-20">Güzəşt (%)</th>
                      <th className="text-right text-xs font-bold text-orange-700 uppercase tracking-wide px-3 py-3 w-28">Endirimli qiyməт</th>
                      <th className="text-right text-xs font-bold text-orange-700 uppercase tracking-wide px-3 py-3 w-28">Endirimli məbləği</th>
                      <th className="text-right text-xs font-bold text-orange-700 uppercase tracking-wide px-3 py-3 w-28">Satış qiyməti</th>
                      <th className="px-3 py-3 w-28" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((p, i) => {
                      const { grossTotal, discountedPrice, discountedTotal } = computedFields(p)
                      const isOut = p.stock_quantity === 0
                      const isLow = !isOut && p.stock_quantity < 3
                      return (
                        <tr key={p.id} className={`hover:bg-gray-50/80 transition-colors ${isOut ? 'bg-red-50/40' : isLow ? 'bg-amber-50/60' : ''}`}>
                          <td className="px-3 py-3 text-center">
                            <span className="text-xs text-gray-400 font-mono">{i + 1}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                              {p.code || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                              {isOut ? (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">Stokda yoxdur</span>
                              ) : isLow ? (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">Az qalıb</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{p.unit}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`text-sm font-bold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                              {p.stock_quantity}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-gray-700">
                            {formatCurrency(p.purchase_price)}
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-medium text-gray-700">
                            {formatCurrency(grossTotal)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {(p.discount_percent || 0) > 0 ? (
                              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                {p.discount_percent}%
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-gray-700">
                            {(p.discount_percent || 0) > 0 ? (
                              <span className="text-orange-700 font-medium">{formatCurrency(discountedPrice)}</span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-medium text-gray-700">
                            {(p.discount_percent || 0) > 0 ? (
                              <span className="text-orange-700">{formatCurrency(discountedTotal)}</span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-sm font-bold text-blue-700">{formatCurrency(p.sell_price)}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setAdjustProduct(p)} className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap">
                                Stok
                              </button>
                              {confirmDeleteId === p.id ? (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="text-xs font-medium px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                                    {deletingId === p.id ? '...' : 'Bəli'}
                                  </button>
                                  <button onClick={() => setConfirmDeleteId(null)} className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 text-gray-600">Xeyr</button>
                                </div>
                              ) : (
                                <button onClick={() => setConfirmDeleteId(p.id)} className="text-gray-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors">
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
                    <tr className="bg-orange-50/60 border-t-2 border-orange-200">
                      <td colSpan={5} className="px-3 py-3 text-xs font-bold text-orange-700 uppercase tracking-wide">Cəmi</td>
                      <td className="px-3 py-3 text-right text-sm font-bold text-gray-700">—</td>
                      <td className="px-3 py-3 text-right text-sm font-bold text-gray-700">
                        {formatCurrency(products.reduce((s, p) => s + p.purchase_price * p.stock_quantity, 0))}
                      </td>
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3 text-right text-sm font-bold text-orange-700">
                        {formatCurrency(products.reduce((s, p) => {
                          const dp = p.purchase_price * (1 - (p.discount_percent || 0) / 100)
                          return s + dp * p.stock_quantity
                        }, 0))}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-bold text-blue-700">
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

      <AddProductDrawer open={addOpen} onClose={() => setAddOpen(false)} onAdded={load} />
      <AdjustStockDrawer product={adjustProduct} onClose={() => setAdjustProduct(null)} onUpdated={load} />

      {/* Excel import info modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setImportModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-gray-900">Excel ilə idxal</h2>
              </div>
              <button onClick={() => setImportModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 flex flex-col gap-4">
              <p className="text-sm text-gray-600">
                Yükləyəcəyiniz Excel faylında aşağıdakı sütun başlıqları olmalıdır:
              </p>

              {/* Column table */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sütun</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Məlumat</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Məcburi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { col: 'Adı', desc: 'Məhsulun adı', required: true },
                      { col: 'Kodu', desc: 'Məhsul kodu / artikul', required: false },
                      { col: 'Ölçü vahidi', desc: 'ədəd, litr, kq...', required: false },
                      { col: 'Sayı', desc: 'Stok miqdarı', required: false },
                      { col: 'Gross qiyməti', desc: 'Satış qiyməti (₼)', required: false },
                      { col: 'Güzəşt (%)', desc: 'Endirim faizi', required: false },
                      { col: 'Endirimli qiymət', desc: 'Alış qiyməti (₼)', required: false },
                    ].map(row => (
                      <tr key={row.col} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{row.col}</code>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{row.desc}</td>
                        <td className="px-4 py-2.5 text-center">
                          {row.required
                            ? <span className="text-xs font-semibold text-red-600">✓ Bəli</span>
                            : <span className="text-xs text-gray-400">Xeyr</span>
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors group"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-700 group-hover:text-blue-800">Nümunə faylı yüklə</p>
                  <p className="text-xs text-blue-500">Nümunə Ambar.xlsx</p>
                </div>
              </a>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setImportModalOpen(false)}
                className="flex-1 btn-ghost"
              >
                Ləğv et
              </button>
              <button
                onClick={() => {
                  setImportModalOpen(false)
                  fileInputRef.current?.click()
                }}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Fayl seç
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
