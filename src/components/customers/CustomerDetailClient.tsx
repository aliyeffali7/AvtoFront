import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, MessageCircle, MoreVertical, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { CustomerDetail, Business, Order } from '@/types'
import { getCustomer, updateCustomer, deleteCustomer } from '@/services/customers.service'
import { getBusinessProfile } from '@/services/auth.service'
import { formatDate, formatPhone } from '@/lib/utils'
import { useGoBack } from '@/lib/useGoBack'
import { printCustomerPDF } from '@/lib/printOrderPDF'
import { printOrderPDF } from '@/lib/serviceActPdf'
import { hasWhatsAppNumber, whatsappLink } from '@/lib/whatsapp'
import StatusBadge from '@/components/orders/StatusBadge'
import UiStatusBadge from '@/components/ui/StatusBadge'
import BrandLogo from '@/components/ui/BrandLogo'
import Avatar from '@/components/ui/Avatar'
import Plate from '@/components/ui/Plate'
import Money from '@/components/ui/Money'
import KpiCard from '@/components/ui/KpiCard'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import CustomerForm from './CustomerForm'

const PAYMENT_WORD = { unpaid: 'Ödənilməyib', partial: 'Qismən ödənilib', paid: 'Ödənilib' } as const
const LINK_BTN = 'text-small font-semibold text-ink hover:underline underline-offset-2'

const plateKey = (p: string) => (p || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

interface CarCard {
  plate: string
  brand: string
  model: string
  year: string
  vin: string
  mileage: number | null
  unit: string
  lastVisit: string | null
}

/** Cars of this customer: the card on the customer record plus every plate seen on its orders. */
function buildCars(c: CustomerDetail): CarCard[] {
  const cars = new Map<string, CarCard>()
  const empty = (plate: string): CarCard => ({ plate, brand: '', model: '', year: '', vin: '', mileage: null, unit: 'km', lastVisit: null })

  if (c.car_plate || c.car_brand || c.car_model) {
    cars.set(plateKey(c.car_plate), {
      ...empty(c.car_plate), brand: c.car_brand, model: c.car_model, year: c.car_year, vin: c.vin_code ?? '',
    })
  }
  const sorted = [...c.orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  for (const o of sorted) {
    const k = plateKey(o.plate_number)
    const cur = cars.get(k) ?? empty(o.plate_number)
    cars.set(k, {
      ...cur,
      plate: cur.plate || o.plate_number,
      brand: cur.brand || o.car_brand,
      model: cur.model || o.car_model,
      year: cur.year || o.car_year || '',
      vin: cur.vin || o.vin_code || '',
      mileage: o.mileage != null ? o.mileage : cur.mileage,
      unit: o.mileage != null ? (o.mileage_unit ?? 'km') : cur.unit,
      lastVisit: o.created_at,
    })
  }
  for (const p of c.plates) {
    const k = plateKey(p)
    if (!cars.has(k)) cars.set(k, empty(p))
  }
  return [...cars.values()]
}

function orderWork(o: Order): string {
  const names = (o.services ?? []).map(s => s.name).filter(Boolean)
  if (names.length > 0) return names.join(', ')
  return o.description || '—'
}

/** Full-page customer: header, KPIs, cars, order history, mileage, notes. */
export default function CustomerDetailClient() {
  const navigate = useNavigate()
  const goBack = useGoBack('/business/customers')
  const { id } = useParams<{ id: string }>()

  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [business, setBusiness] = useState<Business | null>(null)
  const [editing, setEditing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [carFilter, setCarFilter] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [notesEditing, setNotesEditing] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const loadCustomer = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setLoadError(false)
    try {
      const res = await getCustomer(parseInt(id))
      setCustomer(res.data)
      setNotes(res.data.notes ?? '')
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadCustomer() }, [loadCustomer])
  useEffect(() => { getBusinessProfile().then(r => setBusiness(r.data)).catch(() => {}) }, [])

  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  async function handleDelete() {
    if (!customer) return
    await deleteCustomer(customer.id)
    setDeleteConfirm(false)
    navigate('/business/customers')
  }

  async function saveNotes() {
    if (!customer) return
    setNotesSaving(true)
    try {
      const res = await updateCustomer(customer.id, { notes })
      setCustomer(res.data)
      setNotesEditing(false)
    } finally {
      setNotesSaving(false)
    }
  }

  const backBtn = (
    <div>
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={goBack}>Geri — Müştərilər</Button>
    </div>
  )

  if (loading && !customer) return <div className="flex flex-col gap-4">{backBtn}<Spinner /></div>
  if (loadError || !customer) {
    return (
      <div className="flex flex-col gap-4">
        {backBtn}
        <EmptyState title="Müştəri tapılmadı" subtitle="Bu müştəri silinib və ya əlçatan deyil." />
      </div>
    )
  }

  const cars = buildCars(customer)
  const orders = carFilter == null ? customer.orders : customer.orders.filter(o => plateKey(o.plate_number) === carFilter)
  const mileageHistory = orders
    .filter(o => o.mileage != null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const ordersTotal = orders.reduce((s, o) => s + (o.total ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      {backBtn}

      {/* Header card */}
      <div className="card p-5 flex flex-wrap items-center gap-4">
        <Avatar name={customer.full_name} tone="ink" size={48} />
        <div className="flex-1 min-w-[200px]">
          <h1 className="page-title">{customer.full_name}</h1>
          {customer.phone && <p className="font-mono text-body text-text-3">{formatPhone(customer.phone)}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="btn-secondary"><Phone size={18} strokeWidth={1.75} />Zəng et</a>
          )}
          {hasWhatsAppNumber(customer.phone) && (
            <a href={whatsappLink(customer.phone)} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle size={18} strokeWidth={1.75} />WhatsApp</a>
          )}
          <Button icon={Plus} onClick={() => navigate('/business/orders/new')}>Yeni sifariş</Button>
          <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Düzəlt</Button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="Daha çox"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(v => !v)}
              className="btn-secondary !px-0 w-11"
            >
              <MoreVertical size={18} strokeWidth={1.75} />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border rounded-md shadow-md p-1 min-w-[200px]">
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => { setMenuOpen(false); setDeleteConfirm(true) }}
                  className="w-full h-11 px-3 flex items-center gap-2 rounded text-body text-danger hover:bg-surface-2 text-left"
                >
                  <Trash2 size={18} strokeWidth={1.75} />Müştərini sil
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Sifariş sayı" value={customer.order_count ?? customer.orders.length} note={customer.last_visit ? `Son ziyarət: ${formatDate(customer.last_visit)}` : undefined} />
        <KpiCard label="Cəmi" value={customer.total_paid + customer.total_debt} money />
        <KpiCard label="Ödənilib" value={customer.total_paid} money meaning="income" />
        <KpiCard label="Borc" value={customer.total_debt} money meaning={customer.total_debt > 0 ? 'receivable' : 'neutral'} accent={customer.total_debt > 0} note={customer.total_debt > 0 ? 'Alınacaq' : undefined} />
      </div>

      {/* Cars */}
      {cars.length > 0 && (
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3 mb-3 min-h-[20px]">
            <h2 className="section-label">Avtomobillər ({cars.length})</h2>
            {carFilter != null && <button type="button" className={LINK_BTN} onClick={() => setCarFilter(null)}>Filtri sıfırla</button>}
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
            {cars.map(car => {
              const k = plateKey(car.plate)
              const active = carFilter === k
              return (
                <button
                  key={k || car.model}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCarFilter(active ? null : k)}
                  className={`text-left rounded-md border p-4 flex flex-col gap-1.5 transition-colors duration-[120ms] ${
                    active ? 'border-ink bg-surface-2' : 'border-border bg-surface hover:bg-[#F9F9F9]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <BrandLogo brand={car.brand} className="w-8 h-8" />
                    <span className="flex-1 min-w-0 text-body-l font-semibold truncate">
                      {[car.brand, car.model, car.year].filter(Boolean).join(' ') || '—'}
                    </span>
                    {car.plate && <Plate value={car.plate} />}
                  </span>
                  {car.vin && <span className="font-mono text-small text-text-3">VIN: {car.vin}</span>}
                  {car.mileage != null && <span className="text-small text-text-3">Son yürüş: <span className="font-mono">{car.mileage.toLocaleString()} {car.unit}</span></span>}
                  {car.lastVisit && <span className="text-small text-text-3">Son ziyarət: <span className="font-mono">{formatDate(car.lastVisit)}</span></span>}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Order history */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <h2 className="section-label">Sifariş tarixçəsi ({orders.length})</h2>
          {customer.orders.length > 0 && (
            <button type="button" onClick={() => printCustomerPDF(customer, business)} className={`${LINK_BTN} inline-flex items-center gap-1.5`}>
              <Download size={16} strokeWidth={1.75} />Hamısını yüklə
            </button>
          )}
        </div>
        {orders.length === 0 ? (
          <p className="px-5 pb-5 text-body text-text-3">Sifariş yoxdur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th className="ledger-th">№</th>
                  <th className="ledger-th">Tarix</th>
                  <th className="ledger-th">Avtomobil</th>
                  <th className="ledger-th">Görülən işlər</th>
                  <th className="ledger-th">Status</th>
                  <th className="ledger-th">Ödəniş</th>
                  <th className="ledger-th text-right">Məbləğ</th>
                  <th className="ledger-th w-10"><span className="sr-only">PDF</span></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} onClick={() => navigate(`/business/orders/${o.id}`)} className="ledger-row">
                    <td className="ledger-td font-mono font-semibold">{o.number ?? o.id}</td>
                    <td className="ledger-td font-mono text-text-2">{formatDate(o.created_at)}</td>
                    <td className="ledger-td">
                      <span className="flex items-center gap-2">
                        <BrandLogo brand={o.car_brand} className="w-6 h-6" />
                        <Plate value={o.plate_number} />
                      </span>
                    </td>
                    <td className="ledger-td max-w-[320px] truncate">{orderWork(o)}</td>
                    <td className="ledger-td"><StatusBadge status={o.status} /></td>
                    <td className="ledger-td">{o.status === 'done' ? <UiStatusBadge status={PAYMENT_WORD[o.payment_status ?? 'unpaid']} /> : <span className="text-text-3">—</span>}</td>
                    <td className="ledger-td text-right">{o.total != null && o.total > 0 ? <Money value={o.total} /> : <span className="text-text-3">—</span>}</td>
                    <td className="ledger-td">
                      <button
                        type="button"
                        title="PDF"
                        aria-label="PDF yüklə"
                        onClick={e => { e.stopPropagation(); printOrderPDF(o, business) }}
                        className="w-9 h-9 -my-2 rounded flex items-center justify-center text-text-2 hover:bg-surface-2"
                      >
                        <Download size={18} strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2">
                  <td className="ledger-td font-semibold" colSpan={6}>Cəmi · {orders.length} sifariş</td>
                  <td className="ledger-td text-right"><Money value={ordersTotal} className="font-bold" /></td>
                  <td className="ledger-td" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Notes */}
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3 mb-3 min-h-[20px]">
            <h2 className="section-label">Qeydlər</h2>
            {!notesEditing && <button type="button" onClick={() => setNotesEditing(true)} className={LINK_BTN}>{notes ? 'Düzəlt' : 'Əlavə et'}</button>}
          </div>
          {notesEditing ? (
            <div className="flex flex-col gap-2">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} autoFocus placeholder="Müştəri haqqında qeydlər..." className="input resize-none" />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveNotes} loading={notesSaving}>{notesSaving ? 'Saxlanılır...' : 'Saxla'}</Button>
                <Button size="sm" variant="secondary" onClick={() => { setNotesEditing(false); setNotes(customer.notes ?? '') }}>Ləğv et</Button>
              </div>
            </div>
          ) : notes ? (
            <p className="text-body text-ink whitespace-pre-wrap">{notes}</p>
          ) : (
            <p className="text-body text-text-3 italic">Qeyd yoxdur.</p>
          )}
        </section>

        {/* Mileage history */}
        {mileageHistory.length > 0 && (
          <section className="card p-5">
            <h2 className="section-label mb-3">Yürüş tarixçəsi</h2>
            <div className="flex flex-col">
              {mileageHistory.map((o, i) => (
                <Link
                  key={o.id}
                  to={`/business/orders/${o.id}`}
                  className={`flex items-center justify-between gap-3 py-2 hover:bg-[#F9F9F9] ${i < mileageHistory.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-small text-text-3">{formatDate(o.created_at)}</span>
                    <Plate value={o.plate_number} size={12} />
                  </span>
                  <span className="font-mono font-semibold tabular-nums">{o.mileage!.toLocaleString()} {o.mileage_unit ?? 'km'}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {editing && (
        <CustomerForm
          customer={customer}
          onDone={() => { setEditing(false); loadCustomer() }}
          onCancel={() => setEditing(false)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm}
        title="Müştərini sil"
        message={`"${customer.full_name}" müştərisi silinsin? Bu əməliyyat geri qaytarıla bilməz.`}
        confirmLabel="Sil"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  )
}
