'use client'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Order } from '@/types'
import { getOrders, changeOrderStatus } from '@/services/orders.service'
import { formatDate } from '@/lib/utils'
import StatusBadge from './StatusBadge'

type Filter = 'all' | 'pending' | 'in_progress' | 'done'

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
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden active:scale-[0.99] hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
    >
      {/* Color strip by status */}
      <div className={`h-1 w-full ${order.status === 'pending' ? 'bg-yellow-400' : order.status === 'in_progress' ? 'bg-blue-500' : 'bg-green-500'}`} />

      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="text-xl font-bold text-gray-900 font-mono tracking-wider">{order.plate_number}</span>
          <StatusBadge status={order.status} />
        </div>

        <p className="text-sm font-medium text-gray-700 mb-0.5">{order.car_brand} {order.car_model}</p>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{order.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{formatDate(order.created_at)} · {order.estimated_days} gün</span>

          {order.status === 'pending' && (
            <button
              onClick={(e) => handleAction(e, 'in_progress')}
              disabled={busy}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-xl min-h-[36px] transition-colors"
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
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-xl min-h-[36px] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {busy ? 'Yüklənir...' : 'Tamamlandı'}
            </button>
          )}

          {order.status === 'done' && (
            <span className="text-xs text-green-600 font-medium">Bitdi</span>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Sifarişlərim</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
            {counts.pending} gözləyir
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            {counts.in_progress} icrada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
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
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {f.label}
            {f.key !== 'all' && counts[f.key] > 0 && (
              <span className={`ml-1.5 text-xs ${filter === f.key ? 'opacity-80' : 'text-gray-400'}`}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 pb-28 pt-2">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold text-lg">Sifariş yoxdur</p>
            <p className="text-gray-400 text-sm mt-1">
              {filter === 'all' ? 'Sizə hələ sifariş təyin edilməyib.' : 'Bu kateqoriyada sifariş yoxdur.'}
            </p>
          </div>
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
