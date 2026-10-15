import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Zap } from 'lucide-react'
import { Order, Mechanic, Product, ServiceTemplate } from '@/types'
import { getOrders, createOrder, getServiceTemplates } from '@/services/orders.service'
import ServiceTemplatePicker from '@/components/orders/ServiceTemplatePicker'
import { getMechanics } from '@/services/mechanics.service'
import { getProducts } from '@/services/warehouse.service'
import { formatCurrency, mapApiError } from '@/lib/utils'
import BrandLogo from '@/components/ui/BrandLogo'
import StatusBadge from './StatusBadge'
import UiStatusBadge from '@/components/ui/StatusBadge'
import Plate from '@/components/ui/Plate'
import Money from '@/components/ui/Money'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import PeriodFilter from '@/components/ui/PeriodFilter'
import { Period, makePeriod, periodRange } from '@/lib/period'

const PAYMENT_WORD = { unpaid: 'Ödənilməyib', partial: 'Qismən ödənilib', paid: 'Ödənilib' } as const

function nextQuickLabel(): string {
  const n = parseInt(localStorage.getItem('_qo_seq') ?? '0') + 1
  localStorage.setItem('_qo_seq', String(n))
  return `Sürətli sifariş ${n}`
}

function QuickOrderModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warehouseItems, setWarehouseItems] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [selectedMechanicId, setSelectedMechanicId] = useState('')
  const [mechanicAmount, setMechanicAmount] = useState('')
  const [templates, setTemplates] = useState<ServiceTemplate[]>([])
  const [templateId, setTemplateId] = useState<number | null>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (open && !loadedRef.current) {
      loadedRef.current = true
      getProducts().then(r => setWarehouseItems(r.data)).catch(() => {})
      getMechanics().then(r => setMechanics(r.data)).catch(() => {})
      getServiceTemplates().then(r => setTemplates(r.data)).catch(() => {})
    }
    if (!open) loadedRef.current = false
  }, [open])

  useEffect(() => {
    if (templateId !== null) return
    if (!selectedMechanicId) { setMechanicAmount(''); return }
    const mech = mechanics.find(m => m.id === parseInt(selectedMechanicId))
    if (templateId === null && mech && mech.work_percent > 0 && price) {
      setMechanicAmount(((parseFloat(price) || 0) * mech.work_percent / 100).toFixed(2))
    }
  }, [selectedMechanicId, price, mechanics, templateId])

  const filteredProducts = warehouseItems.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))

  function selectProduct(p: Product) {
    setTemplateId(null)
    setName(p.name)
    setPrice(String(p.sell_price))
    setProductSearch(p.name)
    setShowProductDropdown(false)
  }

  function selectTemplate(t: ServiceTemplate) {
    setName(t.name)
    setPrice(String(t.price))
    setMechanicAmount(String(t.mechanic_amount))
    setTemplateId(t.id)
    setProductSearch('')
    setShowProductDropdown(false)
  }

  function reset() {
    setTemplateId(null)
    setName(''); setPrice(''); setError('')
    setProductSearch(''); setShowProductDropdown(false)
    setSelectedMechanicId(''); setMechanicAmount('')
  }
  function handleClose() { reset(); onClose() }

  const parsedPrice = parseFloat(price) || 0
  const parsedMechanicAmt = parseFloat(mechanicAmount) || 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const mechId = selectedMechanicId ? parseInt(selectedMechanicId) : null
      await createOrder({
        plate_number: nextQuickLabel(),
        description: name.trim(),
        status: 'pending' as const,
        services: [{
          name: name.trim(),
          price: parsedPrice,
          mechanic: mechId,
          mechanic_amount: templateId !== null ? parsedMechanicAmt : (mechId && parsedMechanicAmt > 0) ? parsedMechanicAmt : null,
          template: templateId,
        }],
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


  return (
    <Modal
      open={open}
      title="Sürətli sifariş"
      onClose={handleClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>Ləğv et</Button>
          <Button type="submit" form="quick-order-form" loading={loading}>{loading ? 'Saxlanılır...' : 'Saxla'}</Button>
        </>
      }
    >
      <form id="quick-order-form" onSubmit={handleSubmit} className="flex flex-col gap-3 pb-2">
        <ServiceTemplatePicker templates={templates} onPick={selectTemplate} />
        <div className="relative">
          <input
            value={productSearch}
            onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true) }}
            onFocus={() => setShowProductDropdown(true)}
            placeholder="Anbarda axtar..."
            className="input"
            autoComplete="off"
            autoFocus
          />
          {showProductDropdown && productSearch.trim() && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-surface border border-border rounded shadow-md max-h-48 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="px-3 py-2.5 text-body text-text-3">Məhsul tapılmadı</p>
              ) : filteredProducts.map(p => (
                <button key={p.id} type="button" onClick={() => selectProduct(p)} className="w-full px-3 py-2.5 text-left hover:bg-surface-2 border-b border-border last:border-0 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-body font-medium text-text-1">{p.name}</p>
                    <p className="text-small text-text-3">Stok: {p.stock_quantity}</p>
                  </div>
                  <span className="text-body font-mono font-semibold text-text-1 shrink-0">{formatCurrency(p.sell_price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <input value={name} onChange={e => setName(e.target.value)} required placeholder="Məhsul / Xidmət adı" className="input" />
        <input value={price} onChange={e => setPrice(e.target.value)} required type="number" min="0.01" step="0.01" placeholder="Qiymət ₼" className="input-mono" />
        <select value={selectedMechanicId} onChange={e => setSelectedMechanicId(e.target.value)} className="input">
          <option value="">— Usta yoxdur —</option>
          {mechanics.filter(m => m.is_active).map(m => (
            <option key={m.id} value={m.id}>{m.full_name || '—'}{m.work_percent > 0 ? ` (${m.work_percent}%)` : ''}</option>
          ))}
        </select>
        {(selectedMechanicId || templateId !== null) && (
          <input value={mechanicAmount} onChange={e => setMechanicAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="Usta payı ₼" className="input-mono" />
        )}
        {error && <p className="text-body text-danger bg-danger-subtle rounded px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'done'

export default function OrdersClient() {
  const navigate = useNavigate()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [quickOpen, setQuickOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [period, setPeriod] = useState<Period>(() => makePeriod('all'))
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const loadList = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const { from: start, to: end } = periodRange(period)
      const res = await getOrders({
        page: p,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        date_from: start ?? undefined,
        date_to: end ?? undefined,
        search: debouncedSearch || undefined,
      })
      setOrders(res.data.results)
      setTotalPages(res.data.total_pages)
      setTotalCount(res.data.count)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, period, debouncedSearch])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])
  useEffect(() => { setPage(1) }, [statusFilter, period, debouncedSearch])
  useEffect(() => { loadList(page) }, [page, statusFilter, period, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const pageTotal = orders.reduce((s, o) => s + (o.total ?? 0), 0)
  const filtered = statusFilter !== 'all' || debouncedSearch !== '' || period.key !== 'all'

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Sifarişlər"
        subtitle={`${totalCount} sifariş${filtered ? ' (filtrlə)' : ''}`}
        actions={
          <>
            <Button variant="secondary" icon={Zap} onClick={() => setQuickOpen(true)}>Sürətli sifariş</Button>
            <Button icon={Plus} onClick={() => navigate('/business/orders/new')}>Yeni sifariş</Button>
          </>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={18} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nişan, müştəri, marka..."
              aria-label="Axtar"
              className="input !pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-1 border border-border rounded p-1 bg-surface-2" role="group" aria-label="Vəziyyət">
            {([
              { key: 'all', label: 'Hamısı' },
              { key: 'pending', label: 'Gözləyir' },
              { key: 'in_progress', label: 'İcrada' },
              { key: 'done', label: 'Tamamlandı' },
            ] as const).map(f => (
              <button
                key={f.key}
                type="button"
                aria-pressed={statusFilter === f.key}
                onClick={() => { setStatusFilter(f.key); setPage(1) }}
                className={`px-3 py-1.5 rounded text-small font-semibold transition-colors ${
                  statusFilter === f.key ? 'bg-surface text-ink border border-border' : 'text-text-3 hover:text-ink border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <PeriodFilter value={period} onChange={p => { setPeriod(p); setPage(1) }} withAll />
      </div>

      {loading && orders.length === 0 ? <Spinner /> : orders.length === 0 ? (
        <EmptyState
          title="Hələ sifariş yoxdur"
          subtitle="Yeni sifariş yaratmaq üçün “Yeni sifariş” düyməsini basın."
          action={<Button icon={Plus} onClick={() => navigate('/business/orders/new')}>Yeni sifariş</Button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th className="ledger-th">№</th>
                  <th className="ledger-th">Tarix</th>
                  <th className="ledger-th">Müştəri</th>
                  <th className="ledger-th">Avtomobil</th>
                  <th className="ledger-th">Nişan</th>
                  <th className="ledger-th">Usta</th>
                  <th className="ledger-th">Vəziyyət</th>
                  <th className="ledger-th">Ödəniş</th>
                  <th className="ledger-th text-right">Məbləğ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const customer = [o.customer_name, o.customer_surname].filter(Boolean).join(' ')
                  const mechanic = o.mechanic_name ?? o.mechanic_email
                  return (
                    <tr key={o.id} onClick={() => navigate(`/business/orders/${o.id}`)} className="ledger-row">
                      <td className="ledger-td font-mono font-semibold">{o.number ?? o.id}</td>
                      <td className="ledger-td font-mono text-text-2">{o.created_at ? o.created_at.slice(0, 10).split('-').reverse().join('.') : '—'}</td>
                      <td className="ledger-td">
                        {customer ? (
                          <span className="flex items-center gap-2">
                            <Avatar name={customer} size={28} />
                            {o.customer ? (
                              <Link to={`/business/customers/${o.customer}`} onClick={e => e.stopPropagation()} className="hover:underline underline-offset-2">{customer}</Link>
                            ) : customer}
                          </span>
                        ) : <span className="text-text-3">—</span>}
                      </td>
                      <td className="ledger-td">
                        <span className="flex items-center gap-2">
                          <BrandLogo brand={o.car_brand} className="w-6 h-6" />
                          {[o.car_brand, o.car_model].filter(Boolean).join(' ') || <span className="text-text-3">—</span>}
                        </span>
                      </td>
                      <td className="ledger-td"><Plate value={o.plate_number} /></td>
                      <td className="ledger-td">
                        {mechanic ? (
                          <span className="flex items-center gap-2"><Avatar name={mechanic} tone="ink" size={28} />{mechanic}</span>
                        ) : <span className="text-text-3">—</span>}
                      </td>
                      <td className="ledger-td"><StatusBadge status={o.status} /></td>
                      <td className="ledger-td">{o.status === 'done' ? <UiStatusBadge status={PAYMENT_WORD[o.payment_status ?? 'unpaid']} /> : <span className="text-text-3">—</span>}</td>
                      <td className="ledger-td text-right">
                        {o.total != null && o.total > 0 ? <Money value={o.total} /> : <span className="text-text-3">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2">
                  <td className="ledger-td font-semibold" colSpan={8}>Bu səhifədə cəmi · {orders.length} sifariş</td>
                  <td className="ledger-td text-right"><Money value={pageTotal} className="font-bold" /></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      <QuickOrderModal open={quickOpen} onClose={() => setQuickOpen(false)} onCreated={() => { setPage(1); loadList(1) }} />
    </div>
  )
}
