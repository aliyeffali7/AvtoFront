import { useState, useEffect, useCallback } from 'react'
import Pagination from '@/components/ui/Pagination'
import { useNavigate, useParams } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowLeft, Pencil, Phone, UserCheck, UserX } from 'lucide-react'
import { Mechanic, Order, MechanicEarnings } from '@/types'
import { getMechanics, deactivateMechanic, activateMechanic, getMechanicOrders, getMechanicEarnings } from '@/services/mechanics.service'
import MechanicPayPanel from './MechanicPayPanel'
import { EditMechanicModal, MechanicAvatar } from './MechanicForms'
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils'
import { useGoBack } from '@/lib/useGoBack'
import { CHART_SEQUENTIAL } from '@/lib/chartColors'
import { Period, makePeriod, periodRange } from '@/lib/period'
import StatusBadge from '@/components/orders/StatusBadge'
import UiStatusBadge from '@/components/ui/StatusBadge'
import BrandLogo from '@/components/ui/BrandLogo'
import Plate from '@/components/ui/Plate'
import Money from '@/components/ui/Money'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import PeriodFilter from '@/components/ui/PeriodFilter'
import Spinner from '@/components/ui/Spinner'

/** Full-page mechanic: header, "Usta hesabı", pay terms, period earnings, orders. */
// Orders are loaded in full (the totals row sums all of them); only the visible rows are paged.
const ORDERS_PAGE_SIZE = 20

export default function MechanicDetailClient() {
  const navigate = useNavigate()
  const goBack = useGoBack('/business/mechanics')
  const { id } = useParams<{ id: string }>()
  const mechanicId = id ? parseInt(id) : NaN

  const [mechanic, setMechanic] = useState<Mechanic | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [confirmToggle, setConfirmToggle] = useState(false)
  const [toggling, setToggling] = useState(false)

  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersPage, setOrdersPage] = useState(1)
  const [earningsPeriod, setEarningsPeriod] = useState<Period>(() => makePeriod('30'))
  const [earnings, setEarnings] = useState<MechanicEarnings | null>(null)
  const [earningsLoading, setEarningsLoading] = useState(true)

  // There is no single-mechanic endpoint: the list carries pay terms and balance.
  const load = useCallback(async () => {
    try {
      const res = await getMechanics()
      setMechanic(res.data.find(m => m.id === mechanicId) ?? null)
    } finally {
      setLoading(false)
    }
  }, [mechanicId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (isNaN(mechanicId)) return
    setOrdersLoading(true)
    getMechanicOrders(mechanicId).then(r => { setOrders(r.data); setOrdersPage(1) }).finally(() => setOrdersLoading(false))
  }, [mechanicId])

  useEffect(() => {
    if (isNaN(mechanicId)) return
    setEarningsLoading(true)
    const { from, to } = periodRange(earningsPeriod)
    getMechanicEarnings(mechanicId, from ?? '', to ?? '').then(r => setEarnings(r.data)).finally(() => setEarningsLoading(false))
  }, [mechanicId, earningsPeriod])

  async function toggleActive() {
    if (!mechanic) return
    setConfirmToggle(false)
    setToggling(true)
    try {
      if (mechanic.is_active) await deactivateMechanic(mechanic.id)
      else await activateMechanic(mechanic.id)
      await load()
    } finally {
      setToggling(false)
    }
  }

  const backBtn = (
    <div>
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={goBack}>Geri — Ustalar</Button>
    </div>
  )

  if (loading && !mechanic) return <div className="flex flex-col gap-4">{backBtn}<Spinner /></div>
  if (!mechanic) {
    return (
      <div className="flex flex-col gap-4">
        {backBtn}
        <EmptyState title="Usta tapılmadı" subtitle="Bu usta silinib və ya əlçatan deyil." />
      </div>
    )
  }

  const ordersTotal = orders.reduce((s, o) => s + (o.total ?? 0), 0)
  const PAYMENT_WORD = { unpaid: 'Ödənilməyib', partial: 'Qismən ödənilib', paid: 'Ödənilib' } as const

  const earningsCard = (
    <section className="card p-5">
      <h2 className="section-label mb-3">Dövr üzrə qazanc</h2>
      <PeriodFilter value={earningsPeriod} onChange={setEarningsPeriod} className="mb-4" />
      {earningsLoading || !earnings ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-3">
            <p className="section-label mb-1">Seçilmiş dövrdə qazanc</p>
            <Money value={earnings.total} className="!justify-start text-[26px] leading-9" />
          </div>
          {earnings.daily.length === 0 ? (
            <p className="text-body text-text-3">Bu dövrdə qazanc qeydi yoxdur.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={earnings.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E0E0E0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B6B6B' }} tickLine={false} axisLine={{ stroke: '#E0E0E0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} tickLine={false} axisLine={false} width={56} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} contentStyle={{ background: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="amount" name="Qazanc" fill={CHART_SEQUENTIAL} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </>
      )}
    </section>
  )

  return (
    <div className="flex flex-col gap-4">
      {backBtn}

      {/* Header card */}
      <div className="card p-5 flex flex-wrap items-center gap-4">
        <MechanicAvatar mechanic={mechanic} size={48} />
        <div className="flex-1 min-w-[200px]">
          <h1 className="page-title">{mechanic.full_name ?? '—'}</h1>
          {mechanic.phone && <p className="font-mono text-body text-text-3">{formatPhone(mechanic.phone)}</p>}
        </div>
        <UiStatusBadge status={mechanic.is_active ? 'Aktiv' : 'Deaktiv'} tone={mechanic.is_active ? 'success' : 'danger'} icon={mechanic.is_active ? UserCheck : UserX} />
        <div className="flex flex-wrap items-center gap-2">
          {mechanic.phone && (
            <a href={`tel:${mechanic.phone}`} className="btn-secondary"><Phone size={18} strokeWidth={1.75} />Zəng et</a>
          )}
          <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Düzəlt</Button>
          {mechanic.is_active ? (
            <Button variant="secondary" icon={UserX} loading={toggling} onClick={() => setConfirmToggle(true)}>Deaktiv et</Button>
          ) : (
            <Button variant="secondary" icon={UserCheck} loading={toggling} onClick={() => setConfirmToggle(true)}>Aktiv et</Button>
          )}
        </div>
      </div>

      <MechanicPayPanel mechanic={mechanic} onChanged={load} middle={earningsCard} />

      {/* Orders */}
      <section className="card overflow-hidden">
        <h2 className="section-label px-5 pt-5 pb-3">Təyin edilmiş sifarişlər ({orders.length})</h2>
        {ordersLoading ? (
          <div className="pb-5"><Spinner /></div>
        ) : orders.length === 0 ? (
          <p className="px-5 pb-5 text-body text-text-3">Bu ustaya hələ sifariş təyin edilməyib.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th className="ledger-th">№</th>
                  <th className="ledger-th">Tarix</th>
                  <th className="ledger-th">Avtomobil</th>
                  <th className="ledger-th">Nişan</th>
                  <th className="ledger-th">Status</th>
                  <th className="ledger-th">Ödəniş</th>
                  <th className="ledger-th text-right">Məbləğ</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice((ordersPage - 1) * ORDERS_PAGE_SIZE, ordersPage * ORDERS_PAGE_SIZE).map(o => (
                  <tr key={o.id} onClick={() => navigate(`/business/orders/${o.id}`)} className="ledger-row">
                    <td className="ledger-td font-mono font-semibold">{o.number ?? o.id}</td>
                    <td className="ledger-td font-mono text-text-2">{formatDate(o.created_at)}</td>
                    <td className="ledger-td">
                      <span className="flex items-center gap-2">
                        <BrandLogo brand={o.car_brand} className="w-6 h-6" />
                        {[o.car_brand, o.car_model].filter(Boolean).join(' ') || <span className="text-text-3">—</span>}
                      </span>
                    </td>
                    <td className="ledger-td"><Plate value={o.plate_number} /></td>
                    <td className="ledger-td"><StatusBadge status={o.status} /></td>
                    <td className="ledger-td">{o.status === 'done' ? <UiStatusBadge status={PAYMENT_WORD[o.payment_status ?? 'unpaid']} /> : <span className="text-text-3">—</span>}</td>
                    <td className="ledger-td text-right">{o.total != null && o.total > 0 ? <Money value={o.total} /> : <span className="text-text-3">—</span>}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2">
                  <td className="ledger-td font-semibold" colSpan={6}>Cəmi · {orders.length} sifariş</td>
                  <td className="ledger-td text-right"><Money value={ordersTotal} className="font-bold" /></td>
                </tr>
              </tfoot>
            </table>
            {orders.length > ORDERS_PAGE_SIZE && (
            <div className="px-5 py-3 border-t border-border">
              <Pagination
                page={ordersPage}
                totalPages={Math.ceil(orders.length / ORDERS_PAGE_SIZE)}
                onChange={setOrdersPage}
              />
            </div>
            )}
          </div>
        )}
      </section>

      {editing && (
        <EditMechanicModal mechanic={mechanic} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); load() }} />
      )}

      <ConfirmDialog
        open={confirmToggle}
        title={mechanic.is_active ? 'Ustanı deaktiv et' : 'Ustanı aktiv et'}
        message={mechanic.is_active
          ? `${mechanic.full_name ?? 'Bu usta'} deaktiv edilsin? Ona yeni sifariş təyin edilə bilməyəcək.`
          : `${mechanic.full_name ?? 'Bu usta'} yenidən aktiv edilsin?`}
        confirmLabel={mechanic.is_active ? 'Deaktiv et' : 'Aktiv et'}
        onConfirm={toggleActive}
        onCancel={() => setConfirmToggle(false)}
      />
    </div>
  )
}
