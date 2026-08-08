'use client'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Order } from '@/types'
import { getOrders, changeOrderStatus } from '@/services/orders.service'
import { formatDate } from '@/lib/utils'
import StatusBadge from './StatusBadge'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

const STRIP_COLOR: Record<Order['status'], string> = {
  pending: 'border-l-ink-muted',
  in_progress: 'border-l-warning',
  done: 'border-l-success',
}

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

  return (
    <div
      onClick={() => navigate(`/mechanic/orders/${order.id}`)}
      className={`bg-surface border border-rule border-l-[3px] ${STRIP_COLOR[order.status]} rounded active:bg-surface-alt transition-colors cursor-pointer`}
    >
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="text-xl font-bold text-ink font-mono tracking-wider">{order.plate_number}</span>
          <StatusBadge status={order.status} />
        </div>

        <p className="text-sm font-medium text-ink mb-0.5">{order.car_brand} {order.car_model}</p>
        <p className="text-sm text-ink-muted line-clamp-2 mb-3">{order.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-ink-muted">{formatDate(order.created_at)} · {order.estimated_days} gün</span>

          {order.status === 'pending' && (
            <button
              onClick={(e) => handleAction(e, 'in_progress')}
              disabled={busy}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover active:bg-accent-hover disabled:opacity-60 text-cream text-xs font-semibold px-3.5 py-2.5 rounded min-h-[44px] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              {busy ? 'Yüklənir...' : 'Başla'}
            </button>
          )}

          {order.status === 'in_progress' && (
            <button
              onClick={(e) => handleAction(e, 'done')}
              disabled={busy}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover active:bg-accent-hover disabled:opacity-60 text-cream text-xs font-semibold px-3.5 py-2.5 rounded min-h-[44px] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {busy ? 'Yüklənir...' : 'Tamamlandı'}
            </button>
          )}

          {order.status === 'done' && (
            <span className="text-xs font-mono font-semibold text-success">Bitdi</span>
          )}
        </div>
      </div>
    </div>
  )
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Hamısı' },
  { key: 'pending', label: 'Gözləyir' },
  { key: 'in_progress', label: 'İcrada' },
  { key: 'done', label: 'Tamamlandı' },
]

type Filter = 'all' | 'pending' | 'in_progress' | 'done'

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

  const counts = {
    pending: orders.filter(o => o.status === 'pending').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    done: orders.filter(o => o.status === 'done').length,
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-surface border-b border-rule px-5 pt-6 pb-4">
        <h1 className="page-title mb-1.5">Sifarişlərim</h1>
        <div className="flex items-center gap-3 text-xs font-mono text-ink-muted uppercase tracking-wide">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ink-muted inline-block" />
            {counts.pending} gözləyir
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning inline-block" />
            {counts.in_progress} icrada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            {counts.done} bitib
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pt-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${
              filter === f.key
                ? 'bg-sidebar text-cream border-sidebar'
                : 'bg-surface text-ink-muted border-rule hover:border-ink-muted'
            }`}
          >
            {f.label}
            {f.key !== 'all' && counts[f.key] > 0 && (
              <span className={`ml-1.5 text-xs font-mono ${filter === f.key ? 'opacity-80' : 'text-ink-muted'}`}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 pb-28 pt-2">
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
