'use client'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, CheckCircle2 } from 'lucide-react'
import { Order } from '@/types'
import { getOrders, changeOrderStatus } from '@/services/orders.service'
import { formatDate } from '@/lib/utils'
import StatusBadge from './StatusBadge'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import Plate from '@/components/ui/Plate'
import BrandLogo from '@/components/ui/BrandLogo'
import MechanicHeader from '@/components/layout/MechanicHeader'

function OrderCard({ order, onStatusChange }: { order: Order; onStatusChange: () => void }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function handleAction(e: React.MouseEvent, status: 'in_progress' | 'done') {
    e.stopPropagation()
    setBusy(true)
    try {
      await changeOrderStatus(order.id, status)
      onStatusChange()
    } finally {
      setBusy(false)
    }
  }

  const customer = [order.customer_name, order.customer_surname].filter(Boolean).join(' ')

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/mechanic/orders/${order.id}`)}
      onKeyDown={e => { if (e.key === 'Enter') navigate(`/mechanic/orders/${order.id}`) }}
      className="bg-surface border border-border rounded-lg p-4 active:bg-surface-2 transition-colors duration-[120ms] cursor-pointer flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-small font-semibold text-text-3">№{order.number ?? order.id}</span>
        <StatusBadge status={order.status} />
      </div>

      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded bg-surface-2 border border-border flex items-center justify-center shrink-0">
          <BrandLogo brand={order.car_brand} className="w-7 h-7" />
        </span>
        <p className="font-display text-h3 text-ink truncate">{order.car_brand} {order.car_model}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Plate value={order.plate_number} size={15} />
        {customer && <span className="text-body text-text-2 truncate">{customer}</span>}
      </div>

      <p className="text-body-l text-text-2 line-clamp-2">{order.description}</p>
      <p className="font-mono text-small text-text-3">{formatDate(order.created_at)} · {order.estimated_days} gün</p>

      {order.status === 'pending' && (
        <Button size="lg" icon={Play} loading={busy} onClick={e => handleAction(e, 'in_progress')} className="w-full">
          {busy ? 'Yüklənir...' : 'Başla'}
        </Button>
      )}
      {order.status === 'in_progress' && (
        <Button size="lg" icon={CheckCircle2} loading={busy} onClick={e => handleAction(e, 'done')} className="w-full">
          {busy ? 'Yüklənir...' : 'Tamamlandı'}
        </Button>
      )}
      {order.status === 'done' && (
        <span className="text-body font-semibold text-success-strong inline-flex items-center gap-1.5">
          <CheckCircle2 size={18} strokeWidth={1.75} /> Bitdi
        </span>
      )}
    </div>
  )
}

type Filter = 'all' | 'pending' | 'in_progress' | 'done'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Hamısı' },
  { key: 'pending', label: 'Gözləyir' },
  { key: 'in_progress', label: 'İcrada' },
  { key: 'done', label: 'Tamamlandı' },
]

export default function MechanicOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getOrders()
      setOrders(Array.isArray(res.data) ? res.data : (res.data as { results: Order[] }).results ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const counts: Record<Filter, number> = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    done: orders.filter(o => o.status === 'done').length,
  }
  const open = counts.pending + counts.in_progress

  return (
    <div>
      <MechanicHeader title="Sifarişlərim" subtitle={`${open} açıq sifariş`} />

      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-1 border border-border rounded p-1 bg-surface" role="group" aria-label="Status filtri">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`min-h-[44px] px-1 rounded text-small font-semibold transition-colors duration-[120ms] flex flex-col items-center justify-center leading-tight ${
                filter === f.key ? 'bg-ink text-paper' : 'text-text-3 hover:text-ink'
              }`}
            >
              <span className="truncate max-w-full">{f.label}</span>
              <span className="font-mono text-label">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Sifariş yoxdur"
            subtitle={filter === 'all' ? 'Sizə hələ sifariş təyin edilməyib.' : 'Bu kateqoriyada sifariş yoxdur.'}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(order => (
              <OrderCard key={order.id} order={order} onStatusChange={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
