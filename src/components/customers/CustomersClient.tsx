import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Customer } from '@/types'
import { getCustomers, createCustomer } from '@/services/customers.service'
import { formatCurrency, mapApiError } from '@/lib/utils'
import PlateInput from '@/components/ui/PlateInput'

function formatLastVisit(iso: string | null): string {
  if (!iso) return 'Ziyarət yoxdur'
  return new Date(iso).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function AddCustomerDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [carBrand, setCarBrand] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carYear, setCarYear] = useState('')
  const [carPlate, setCarPlate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setFullName(''); setPhone(''); setCarBrand(''); setCarModel(''); setCarYear(''); setCarPlate(''); setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await createCustomer({
        full_name: fullName,
        phone: phone || undefined,
        car_brand: carBrand || undefined,
        car_model: carModel || undefined,
        car_year: carYear || undefined,
        car_plate: carPlate || undefined,
      })
      reset()
      onCreated()
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Yeni müştəri</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 px-6 py-6 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Ad Soyad</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              autoFocus
              placeholder="Məs. Hüseyn Məmmədov"
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Əlaqə nömrəsi</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              type="tel"
              placeholder="+994 50 000 00 00"
              className="input"
            />
          </div>

          <div className="border-t border-gray-100 pt-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Avtomobil</p>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">Marka</label>
                  <input value={carBrand} onChange={e => setCarBrand(e.target.value)} placeholder="Toyota" className="input" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">Model</label>
                  <input value={carModel} onChange={e => setCarModel(e.target.value)} placeholder="Camry" className="input" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">İl</label>
                  <input value={carYear} onChange={e => setCarYear(e.target.value)} placeholder="2020" maxLength={4} className="input" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium text-gray-700">Dövlət nişanı</label>
                  <PlateInput value={carPlate} onChange={setCarPlate} className="input font-mono tracking-wider" />
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="mt-auto flex flex-col gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Əlavə edilir...' : 'Müştəri əlavə et'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Ləğv et</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const load = useCallback(async (p = page) => {
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

  useEffect(() => {
    load(page)
  }, [page, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Müştərilər</h1>
            <p className="text-sm text-gray-500 mt-0.5">{totalCount} müştəri</p>
          </div>
          <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Müştəri
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ad, telefon və ya nişan ilə axtar..."
            className="input pl-10"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium">
              {debouncedSearch ? 'Axtarışa uyğun müştəri tapılmadı' : 'Hələ müştəri yoxdur'}
            </p>
            {!debouncedSearch && (
              <p className="text-gray-500 text-sm mt-1">Yeni müştəri əlavə etmək üçün + düyməsini basın.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {customers.map(customer => (
              <Link
                key={customer.id}
                to={`/business/customers/${customer.id}`}
                className="bg-white rounded-2xl border border-gray-200 px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-gray-900 text-base">{customer.full_name}</span>
                    {customer.total_debt > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Borc: {formatCurrency(customer.total_debt)}
                      </span>
                    )}
                  </div>
                  {customer.phone && (
                    <p className="text-sm text-gray-500">{customer.phone}</p>
                  )}
                  {(customer.car_brand || customer.car_model) && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {[customer.car_brand, customer.car_model, customer.car_year].filter(Boolean).join(' ')}
                    </p>
                  )}
                  {(customer.car_plate || customer.plates.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {customer.car_plate ? (
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-xs font-mono text-gray-700 font-medium">
                          {customer.car_plate}
                        </span>
                      ) : customer.plates.map(plate => (
                        <span key={plate} className="px-2 py-0.5 rounded-lg bg-gray-100 text-xs font-mono text-gray-700 font-medium">
                          {plate}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(customer.total_paid)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{customer.order_count} sifariş</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatLastVisit(customer.last_visit)}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                  n === page
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <AddCustomerDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => load(1)}
      />
    </>
  )
}
