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
  const [purchasePrice, setPurchasePrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [stock, setStock] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setName(''); setPurchasePrice(''); setSellPrice(''); setStock(''); setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await createProduct({
        name,
        purchase_price: parseFloat(purchasePrice),
        sell_price: parseFloat(sellPrice),
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
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 px-6 py-6 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Məhsul adı</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="Məs. Mühərrik yağı" className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Alış qiyməti (₼)</label>
            <input value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} required type="number" step="0.01" min="0" placeholder="0.00" className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Satış qiyməti (₼)</label>
            <input value={sellPrice} onChange={e => setSellPrice(e.target.value)} required type="number" step="0.01" min="0" placeholder="0.00" className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">İlkin stok</label>
            <input value={stock} onChange={e => setStock(e.target.value)} required type="number" min="0" placeholder="0" className="input" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="mt-auto flex flex-col gap-3">
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

export default function WarehouseClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ detail: string; errors: string[] } | null>(null)
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getProducts()
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

  return (
    <>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Anbar</h1>
            <p className="text-sm text-gray-500 mt-0.5">{products.length} məhsul</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelImport} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-green-600 text-green-700 text-sm font-semibold hover:bg-green-50 disabled:opacity-60 transition-colors min-h-[44px]"
            >
              {importing ? (
                <div className="w-4 h-4 border-2 border-green-400 border-t-green-700 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
              {importing ? 'Yüklənir...' : 'Excel ilə idxal et'}
            </button>
            <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Məhsul əlavə et
            </button>
          </div>
        </div>

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

        {/* Table */}
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
            <p className="text-gray-900 font-medium">Anbar boşdur</p>
            <p className="text-gray-500 text-sm mt-1">Məhsul əlavə etmək üçün yuxarıdakı düyməni basın.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 sm:hidden">
              {products.map((p) => (
                <div key={p.id} className={`bg-white rounded-2xl border px-4 py-4 ${p.stock_quantity === 0 ? 'border-red-200 bg-red-50/30' : p.stock_quantity < 3 ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                      {p.stock_quantity === 0 ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">Stokda yoxdur</span>
                      ) : p.stock_quantity < 3 && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">Az qalıb</span>
                      )}
                    </div>
                    <span className={`text-lg font-bold ${p.stock_quantity === 0 ? 'text-red-600' : p.stock_quantity < 3 ? 'text-amber-600' : 'text-gray-900'}`}>
                      {p.stock_quantity} <span className="text-xs font-normal text-gray-400">stok</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs text-gray-400">Alış</p>
                        <p className="text-gray-600 font-medium">{formatCurrency(p.purchase_price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Satış</p>
                        <p className="text-gray-900 font-semibold">{formatCurrency(p.sell_price)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAdjustProduct(p)} className="text-xs font-semibold text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                        Tənzimlə
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
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Məhsul</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Alış</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Satış</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Stok</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p) => (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.stock_quantity === 0 ? 'bg-red-50/40' : p.stock_quantity < 3 ? 'bg-amber-50/60' : ''}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                          {p.stock_quantity === 0 ? (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Stokda yoxdur</span>
                          ) : p.stock_quantity < 3 && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Az qalıb</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-gray-600">{formatCurrency(p.purchase_price)}</td>
                      <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(p.sell_price)}</td>
                      <td className="px-5 py-4 text-right">
                        <span className={`text-sm font-semibold ${p.stock_quantity === 0 ? 'text-red-600' : p.stock_quantity < 3 ? 'text-amber-600' : 'text-gray-900'}`}>
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => setAdjustProduct(p)} className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline">
                            Tənzimlə
                          </button>
                          {confirmDeleteId === p.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-500">Silinsin?</span>
                              <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="text-xs font-medium px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                                {deletingId === p.id ? '...' : 'Bəli'}
                              </button>
                              <button onClick={() => setConfirmDeleteId(null)} className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">Xeyr</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(p.id)} className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors" title="Sil">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <AddProductDrawer open={addOpen} onClose={() => setAddOpen(false)} onAdded={load} />
      <AdjustStockDrawer product={adjustProduct} onClose={() => setAdjustProduct(null)} onUpdated={load} />
    </>
  )
}
