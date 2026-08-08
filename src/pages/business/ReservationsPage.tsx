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
import Badge, { BadgeVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

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

const STATUS_BADGE: Record<string, BadgeVariant> = {
  gozlenilir: 'warning',
  sifarise_cevrildi: 'success',
  gelmedi: 'danger',
  legv_edildi: 'neutral',
}

// ─── Create Panel (inline, expands above the list) ──────────────────────────

function CreateReservationPanel({
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
    <Card className="px-6 py-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="card-title">Yeni rezervasiya</h2>
        <button onClick={handleClose} className="p-2 rounded text-ink-muted hover:bg-surface-alt hover:text-ink transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Date + Time — most important, at top */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">Tarix <span className="text-danger">*</span></label>
            <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} required className="input-mono" />
          </div>
          <div className="flex-1">
            <label className="label">Vaxt <span className="text-danger">*</span></label>
            <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} required className="input-mono" />
          </div>
        </div>

        <div className="border-t border-rule" />

        <div>
          <label className="label">Müştəri adı</label>
          <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Hüseyn Məmmədov" className="input" autoFocus />
        </div>
        <div>
          <label className="label">Telefon</label>
          <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel" placeholder="+994 50 000 00 00" className="input-mono" />
        </div>

        <div className="border-t border-rule" />

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">Marka</label>
            <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Toyota" className="input" />
          </div>
          <div className="flex-1">
            <label className="label">Model</label>
            <input value={model} onChange={e => setModel(e.target.value)} placeholder="Prado" className="input" />
          </div>
        </div>
        <div>
          <label className="label">İş təsviri</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Məs. Yağ dəyişimi, əyləc yoxlaması" className="input resize-none" />
        </div>
        <div>
          <label className="label">Usta</label>
          <select value={mechanic} onChange={e => setMechanic(e.target.value)} className="input">
            <option value="">Seçilməyib</option>
            {mechanics.filter(m => m.is_active).map(m => (
              <option key={m.id} value={m.id}>{m.full_name ?? m.phone}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} loading={loading} className="flex-1">
            {loading ? 'Saxlanılır...' : 'Rezervasiya yarat'}
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">Ləğv et</Button>
        </div>
      </form>
    </Card>
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
    <Card className="px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          {(res.car_brand || res.car_model) && (
            <p className="text-sm font-semibold text-ink mb-1">{res.car_brand} {res.car_model}</p>
          )}
          {res.customer_name && (
            <p className="text-sm text-ink-soft font-medium">{res.customer_name}</p>
          )}
          {res.customer_phone && (
            <a href={`tel:${res.customer_phone}`} className="text-sm font-mono text-accent hover:underline">{res.customer_phone}</a>
          )}
          {res.description && (
            <p className="text-xs text-ink-muted mt-1">{res.description}</p>
          )}
          {res.mechanic_name && (
            <p className="text-xs text-accent mt-0.5">Usta: {res.mechanic_name}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-mono font-semibold text-ink">{formatScheduled(res.scheduled_at)}</p>
          {res.status !== 'gozlenilir' && (
            <div className="mt-1">
              <Badge variant={STATUS_BADGE[res.status]}>{STATUS_LABELS[res.status]}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Actions — only for pending */}
      {isDue && (
        <div className="pt-3 border-t border-rule flex flex-wrap gap-2">
          <Button
            onClick={() => handle(() => convertReservation(res.id).then(r => navigate(`/business/orders/${r.data.order_id}`)))}
            disabled={actioning}
            className="flex-1 min-w-0 !py-2 !text-sm"
          >
            Sifarişə çevir
          </Button>
          <Button
            variant="danger"
            onClick={() => handle(() => updateReservationStatus(res.id, 'gelmedi'))}
            disabled={actioning}
            className="flex-1 min-w-0 !py-2 !text-sm"
          >
            Gəlmədi
          </Button>
          <Button
            variant="secondary"
            onClick={() => handle(() => updateReservationStatus(res.id, 'legv_edildi'))}
            disabled={actioning}
            className="flex-1 min-w-0 !py-2 !text-sm"
          >
            Ləğv et
          </Button>
        </div>
      )}

      {/* Converted — link to order */}
      {res.status === 'sifarise_cevrildi' && res.order && (
        <div className="pt-3 border-t border-rule flex items-center justify-between">
          <button
            onClick={() => navigate(`/business/orders/${res.order}`)}
            className="text-sm text-accent hover:underline font-medium"
          >
            Sifarişə bax →
          </button>
          <button onClick={() => setConfirmDelete(true)} className="text-xs text-ink-muted hover:text-danger transition-colors">Sil</button>
        </div>
      )}

      {/* Cancelled / no-show — convert still allowed + delete */}
      {(res.status === 'legv_edildi' || res.status === 'gelmedi') && (
        <div className="pt-3 border-t border-rule flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={() => handle(() => convertReservation(res.id).then(r => navigate(`/business/orders/${r.data.order_id}`)))}
            disabled={actioning}
            className="text-xs font-mono font-semibold uppercase tracking-wide text-accent bg-surface-alt hover:bg-rule px-3 py-2 rounded transition-colors"
          >
            Sifarişə çevir
          </button>
          <button onClick={() => setConfirmDelete(true)} className="text-xs text-ink-muted hover:text-danger transition-colors">Sil</button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Rezervasiyanı sil"
        message="Bu rezervasiya silinsin? Bu əməliyyat geri qaytarıla bilməz."
        confirmLabel="Bəli, sil"
        danger
        onConfirm={() => { handle(() => deleteReservation(res.id)); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Card>
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
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Rezervasiyalar</h1>
          <p className="text-sm text-ink-muted mt-0.5">Müştəri görüşlərini idarə edin</p>
        </div>
        {!createOpen && (
          <Button onClick={() => setCreateOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni rezervasiya
          </Button>
        )}
      </div>

      <CreateReservationPanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <Card className="px-4 py-4 text-center">
            <p className="text-2xl font-mono font-semibold text-ink">{stats.total}</p>
            <p className="section-label mt-0.5">Ümumi</p>
          </Card>
          <Card className="px-4 py-4 text-center">
            <p className="text-2xl font-mono font-semibold text-success">{stats.converted}</p>
            <p className="section-label mt-0.5">Sifarişə çevrildi</p>
            {stats.conversion_rate !== null && (
              <p className="text-xs font-mono font-semibold text-success mt-0.5">{stats.conversion_rate}%</p>
            )}
          </Card>
          <Card className="px-4 py-4 text-center">
            <p className="text-2xl font-mono font-semibold text-danger">{stats.no_show}</p>
            <p className="section-label mt-0.5">Gəlmədi</p>
          </Card>
          <Card className="px-4 py-4 text-center">
            <p className="text-2xl font-mono font-semibold text-ink-muted">{stats.cancelled}</p>
            <p className="section-label mt-0.5">Ləğv edildi</p>
          </Card>
          <Card className="px-4 py-4 text-center">
            <p className="text-2xl font-mono font-semibold text-warning">{stats.pending}</p>
            <p className="section-label mt-0.5">Gözlənilir</p>
          </Card>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-6">

          {/* Due now */}
          {due.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 bg-danger rounded-full animate-pulse" />
                <h2 className="section-label text-danger">Vaxtı çatıb — {due.length} rezervasiya</h2>
              </div>
              <div className="flex flex-col gap-3">
                {due.map(r => <ReservationCard key={r.id} res={r} onAction={load} />)}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 ? (
            <div>
              <h2 className="section-label mb-3">Gələcək rezervasiyalar</h2>
              <div className="flex flex-col gap-5">
                {Object.entries(upcomingGroups).map(([dateKey, group]) => (
                  <div key={dateKey}>
                    <p className="text-xs font-mono font-semibold text-ink-muted uppercase tracking-wide mb-2">
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
            <EmptyState
              title="Gözləyən rezervasiya yoxdur"
              subtitle="Yeni rezervasiya əlavə etmək üçün + düyməsini basın."
            />
          )}

          {/* History toggle */}
          {history.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory(v => !v)}
                className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink font-medium transition-colors mb-3"
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
  )
}
