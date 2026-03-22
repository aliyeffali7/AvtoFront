import { useState, useEffect, useCallback } from 'react'
import { Product } from '@/types'
import { getProducts, createProduct, adjustStock } from '@/services/warehouse.service'
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getProducts()
      setProducts(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

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
          <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Məhsul əlavə et
          </button>
        </div>

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
                <div key={p.id} className={`bg-white rounded-2xl border px-4 py-4 ${p.stock_quantity < 3 ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                      {p.stock_quantity < 3 && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">Az qalıb</span>
                      )}
                    </div>
                    <span className={`text-lg font-bold ${p.stock_quantity < 3 ? 'text-amber-600' : 'text-gray-900'}`}>
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
                    <button
                      onClick={() => setAdjustProduct(p)}
                      className="text-xs font-semibold text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50"
                    >
                      Tənzimlə
                    </button>
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
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.stock_quantity < 3 ? 'bg-amber-50/60' : ''}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                          {p.stock_quantity < 3 && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Az qalıb</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-gray-600">{formatCurrency(p.purchase_price)}</td>
                      <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(p.sell_price)}</td>
                      <td className="px-5 py-4 text-right">
                        <span className={`text-sm font-semibold ${p.stock_quantity < 3 ? 'text-amber-600' : 'text-gray-900'}`}>
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setAdjustProduct(p)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Tənzimlə
                        </button>
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
