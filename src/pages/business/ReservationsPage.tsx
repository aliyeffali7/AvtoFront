import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Reservation, ReservationStats, Mechanic } from '@/types'
import {
  getReservations, getReservationStats,
  createReservation, updateReservationStatus,
  convertReservation, deleteReservation,
} from '@/services/reservations.service'
import { getMechanics } from '@/services/mechanics.service'
import { mapApiError } from '@/lib/utils'

// ─── helpers ────────────────────────────────────────────────────────────────

function formatScheduled(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('az-AZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateGroup(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'Bugün'
  if (d.toDateString() === tomorrow.toDateString()) return 'Sabah'
  return d.toLocaleDateString('az-AZ', { weekday: 'long', day: 'numeric', month: 'long' })
}

const STATUS_LABELS: Record<string, string> = {
  gozlenilir: 'Gözlənilir',
  sifarise_cevrildi: 'Sifarişə çevrildi',
  gelmedi: 'Gəlmədi',
  legv_edildi: 'Ləğv edildi',
}

// ─── Create Drawer ───────────────────────────────────────────────────────────

function CreateReservationDrawer({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [description, setDescription] = useState('')
  const [mechanic, setMechanic] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const loadedRef = useRef(false)

  useEffect(() => {
    if (open && !loadedRef.current) {
      loadedRef.current = true
      getMechanics().then(r => setMechanics(r.data)).catch(() => {})
    }
  }, [open])

  function reset() {
    setCustomerName(''); setCustomerPhone('')
    setBrand(''); setModel(''); setDescription('')
    setMechanic(''); setScheduledDate(''); setScheduledTime('')
    setError('')
    loadedRef.current = false
  }

  function handleClose() { reset(); onClose() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!scheduledDate || !scheduledTime) {
      setError('Tarix və vaxt daxil edin.')
      return
    }
    const scheduled_at = `${scheduledDate}T${scheduledTime}:00`
    setLoading(true)
    try {
      await createReservation({
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        car_brand: brand || undefined,
        car_model: model || undefined,
        description: description || undefined,
        mechanic: mechanic ? parseInt(mechanic) : null,
        scheduled_at,
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
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Yeni rezervasiya</h2>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
          {/* Date + Time — most important, at top */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-medium text-gray-700">Tarix <span className="text-red-500">*</span></label>
              <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} required className="input" />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-medium text-gray-700">Vaxt <span className="text-red-500">*</span></label>
              <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} required className="input" />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Müştəri adı</label>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Hüseyn Məmmədov" className="input" autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Telefon</label>
            <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel" placeholder="+994 50 000 00 00" className="input" />
          </div>

          <div className="border-t border-gray-100" />

          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-medium text-gray-700">Marka</label>
              <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Toyota" className="input" />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-medium text-gray-700">Model</label>
              <input value={model} onChange={e => setModel(e.target.value)} placeholder="Prado" className="input" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">İş təsviri</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Məs. Yağ dəyişimi, əyləc yoxlaması" className="input resize-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Usta</label>
            <select value={mechanic} onChange={e => setMechanic(e.target.value)} className="input">
              <option value="">Seçilməyib</option>
              {mechanics.filter(m => m.is_active).map(m => (
                <option key={m.id} value={m.id}>{m.full_name ?? m.phone}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex flex-col gap-3 mt-auto pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saxlanılır...' : 'Rezervasiya yarat'}
            </button>
            <button type="button" onClick={handleClose} className="btn-ghost">Ləğv et</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Reservation Card ────────────────────────────────────────────────────────

function ReservationCard({
  res, onAction,
}: { res: Reservation; onAction: () => void }) {
  const navigate = useNavigate()
  const [actioning, setActioning] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isDue = res.status === 'gozlenilir'

  async function handle(fn: () => Promise<unknown>) {
    setActioning(true)
    try { await fn(); onAction() } finally { setActioning(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          {(res.car_brand || res.car_model) && (
            <p className="text-sm font-semibold text-gray-800 mb-1">{res.car_brand} {res.car_model}</p>
          )}
          {res.customer_name && (
            <p className="text-sm text-gray-700 font-medium">{res.customer_name}</p>
          )}
          {res.customer_phone && (
            <a href={`tel:${res.customer_phone}`} className="text-sm text-blue-600 hover:underline">{res.customer_phone}</a>
          )}
          {res.description && (
            <p className="text-xs text-gray-500 mt-1">{res.description}</p>
          )}
          {res.mechanic_name && (
            <p className="text-xs text-blue-500 mt-0.5">Usta: {res.mechanic_name}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-900">{formatScheduled(res.scheduled_at)}</p>
          {res.status !== 'gozlenilir' && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${
              res.status === 'sifarise_cevrildi' ? 'bg-green-100 text-green-700' :
              res.status === 'gelmedi' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {STATUS_LABELS[res.status]}
            </span>
          )}
        </div>
      </div>

      {/* Actions — only for pending */}
      {isDue && (
        <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2">
          <button
            onClick={() => handle(() => convertReservation(res.id).then(r => navigate(`/business/orders/${r.data.order_id}`)))}
            disabled={actioning}
            className="flex-1 min-w-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            Sifarişə çevir
          </button>
          <button
            onClick={() => handle(() => updateReservationStatus(res.id, 'gelmedi'))}
            disabled={actioning}
            className="flex-1 min-w-0 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold px-3 py-2 rounded-xl transition-colors border border-red-200"
          >
            Gəlmədi
          </button>
          <button
            onClick={() => handle(() => updateReservationStatus(res.id, 'legv_edildi'))}
            disabled={actioning}
            className="flex-1 min-w-0 bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm font-semibold px-3 py-2 rounded-xl transition-colors border border-gray-200"
          >
            Ləğv et
          </button>
        </div>
      )}

      {/* Converted — link to order */}
      {res.status === 'sifarise_cevrildi' && res.order && (
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => navigate(`/business/orders/${res.order}`)}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Sifarişə bax →
          </button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <button onClick={() => handle(() => deleteReservation(res.id))} className="text-xs bg-red-600 text-white px-2.5 py-1.5 rounded-xl">Bəli</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-xl">Xeyr</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Sil</button>
          )}
        </div>
      )}

      {/* Cancelled / no-show — convert still allowed + delete */}
      {(res.status === 'legv_edildi' || res.status === 'gelmedi') && (
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={() => handle(() => convertReservation(res.id).then(r => navigate(`/business/orders/${r.data.order_id}`)))}
            disabled={actioning}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors border border-blue-200"
          >
            Sifarişə çevir
          </button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <button onClick={() => handle(() => deleteReservation(res.id))} className="text-xs bg-red-600 text-white px-2.5 py-1.5 rounded-xl">Bəli, sil</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-xl">Xeyr</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Sil</button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [stats, setStats] = useState<ReservationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const load = useCallback(async () => {
    try {
      const [resR, statsR] = await Promise.all([getReservations(), getReservationStats()])
      setReservations(resR.data)
      setStats(statsR.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 60s so due reservations pop up automatically
  useEffect(() => {
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  const now = new Date()

  // Due = pending AND scheduled_at <= now
  const due = reservations.filter(r => r.status === 'gozlenilir' && new Date(r.scheduled_at) <= now)
  // Upcoming = pending AND scheduled_at > now
  const upcoming = reservations.filter(r => r.status === 'gozlenilir' && new Date(r.scheduled_at) > now)
  // History = non-pending
  const history = reservations.filter(r => r.status !== 'gozlenilir')

  // Group upcoming by date
  const upcomingGroups: Record<string, Reservation[]> = {}
  for (const r of upcoming) {
    const key = new Date(r.scheduled_at).toDateString()
    if (!upcomingGroups[key]) upcomingGroups[key] = []
    upcomingGroups[key].push(r)
  }

  return (
    <>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Rezervasiyalar</h1>
            <p className="text-sm text-gray-500 mt-0.5">Müştəri görüşlərini idarə edin</p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni rezervasiya
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-2xl border border-gray-200 px-4 py-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-0.5">Ümumi</p>
            </div>
            <div className="bg-green-50 rounded-2xl border border-green-200 px-4 py-4 text-center">
              <p className="text-2xl font-bold text-green-700">{stats.converted}</p>
              <p className="text-xs text-green-600 mt-0.5">Sifarişə çevrildi</p>
              {stats.conversion_rate !== null && (
                <p className="text-xs font-semibold text-green-500 mt-0.5">{stats.conversion_rate}%</p>
              )}
            </div>
            <div className="bg-red-50 rounded-2xl border border-red-200 px-4 py-4 text-center">
              <p className="text-2xl font-bold text-red-700">{stats.no_show}</p>
              <p className="text-xs text-red-600 mt-0.5">Gəlmədi</p>
            </div>
            <div className="bg-gray-50 rounded-2xl border border-gray-200 px-4 py-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p>
              <p className="text-xs text-gray-500 mt-0.5">Ləğv edildi</p>
            </div>
            <div className="bg-blue-50 rounded-2xl border border-blue-200 px-4 py-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{stats.pending}</p>
              <p className="text-xs text-blue-600 mt-0.5">Gözlənilir</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* Due now */}
            {due.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <h2 className="text-sm font-bold text-red-700 uppercase tracking-wide">Vaxtı çatıb — {due.length} rezervasiya</h2>
                </div>
                <div className="flex flex-col gap-3">
                  {due.map(r => <ReservationCard key={r.id} res={r} onAction={load} />)}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 ? (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Gələcək rezervasiyalar</h2>
                <div className="flex flex-col gap-5">
                  {Object.entries(upcomingGroups).map(([dateKey, group]) => (
                    <div key={dateKey}>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                        {formatDateGroup(group[0].scheduled_at)}
                      </p>
                      <div className="flex flex-col gap-3">
                        {group.map(r => <ReservationCard key={r.id} res={r} onAction={load} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : due.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium">Gözləyən rezervasiya yoxdur</p>
                <p className="text-gray-500 text-sm mt-1">Yeni rezervasiya əlavə etmək üçün + düyməsini basın.</p>
              </div>
            )}

            {/* History toggle */}
            {history.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHistory(v => !v)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors mb-3"
                >
                  <svg className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  Tarixçə ({history.length})
                </button>
                {showHistory && (
                  <div className="flex flex-col gap-3">
                    {history.map(r => <ReservationCard key={r.id} res={r} onAction={load} />)}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      <CreateReservationDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
    </>
  )
}
