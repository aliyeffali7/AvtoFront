import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, CalendarClock, CheckCircle2, Clock, Plus, UserX } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Reservation, ReservationStats, Mechanic } from '@/types'
import {
  getReservations, getReservationStats,
  createReservation, updateReservationStatus,
  convertReservation, deleteReservation,
} from '@/services/reservations.service'
import { getMechanics } from '@/services/mechanics.service'
import { mapApiError } from '@/lib/utils'
import BrandLogo from '@/components/ui/BrandLogo'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import KpiCard from '@/components/ui/KpiCard'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Spinner from '@/components/ui/Spinner'
import UiStatusBadge, { StatusTone } from '@/components/ui/StatusBadge'

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
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

const STATUS_BADGE: Record<string, { tone: StatusTone; icon: LucideIcon }> = {
  gozlenilir: { tone: 'info', icon: Clock },
  sifarise_cevrildi: { tone: 'success', icon: CheckCircle2 },
  gelmedi: { tone: 'warning', icon: UserX },
  legv_edildi: { tone: 'danger', icon: Ban },
}

// ─── Create modal ───────────────────────────────────────────────────────────

function CreateReservationModal({
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

  return (
    <Modal
      open={open}
      title="Yeni rezervasiya"
      onClose={handleClose}
      width="max-w-[560px]"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>Ləğv et</Button>
          <Button type="submit" form="reservation-form" loading={loading}>{loading ? 'Saxlanılır...' : 'Rezervasiya yarat'}</Button>
        </>
      }
    >
      <form id="reservation-form" onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
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

        <div className="border-t border-border" />

        <div>
          <label className="label">Müştəri adı</label>
          <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Hüseyn Məmmədov" className="input" autoFocus />
        </div>
        <div>
          <label className="label">Telefon</label>
          <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel" placeholder="+994 50 000 00 00" className="input-mono" />
        </div>

        <div className="border-t border-border" />

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

        {error && <p className="text-body text-danger bg-danger-subtle rounded px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}

// ─── Reservation table ──────────────────────────────────────────────────────

function ReservationTable({
  rows, onAction, onDelete, showDate = false,
}: { rows: Reservation[]; onAction: () => void; onDelete: (r: Reservation) => void; showDate?: boolean }) {
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<number | null>(null)

  async function handle(id: number, fn: () => Promise<unknown>) {
    setBusyId(id)
    try { await fn(); onAction() } finally { setBusyId(null) }
  }

  const convert = (r: Reservation) =>
    handle(r.id, () => convertReservation(r.id).then(res => navigate(`/business/orders/${res.data.order_id}`)))

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="ledger-table">
          <thead>
            <tr>
              {showDate && <th className="ledger-th">Tarix</th>}
              <th className="ledger-th">Saat</th>
              <th className="ledger-th">Müştəri</th>
              <th className="ledger-th">Avtomobil</th>
              <th className="ledger-th">İş təsviri</th>
              <th className="ledger-th">Usta</th>
              <th className="ledger-th">Status</th>
              <th className="ledger-th text-right">Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const badge = STATUS_BADGE[r.status]
              const busy = busyId === r.id
              const car = [r.car_brand, r.car_model].filter(Boolean).join(' ')
              return (
                <tr key={r.id}>
                  {showDate && <td className="ledger-td font-mono text-text-2">{formatDay(r.scheduled_at)}</td>}
                  <td className="ledger-td font-mono font-semibold">{formatTime(r.scheduled_at)}</td>
                  <td className="ledger-td">
                    {r.customer_name ? <span className="font-semibold">{r.customer_name}</span> : <span className="text-text-3">—</span>}
                    {r.customer_phone && (
                      <a href={`tel:${r.customer_phone}`} className="block font-mono text-small text-text-3 hover:underline underline-offset-2">{r.customer_phone}</a>
                    )}
                  </td>
                  <td className="ledger-td">
                    {car ? <span className="flex items-center gap-2"><BrandLogo brand={r.car_brand} className="w-6 h-6" />{car}</span> : <span className="text-text-3">—</span>}
                  </td>
                  <td className="ledger-td max-w-[260px] truncate" title={r.description}>{r.description || <span className="text-text-3">—</span>}</td>
                  <td className="ledger-td">{r.mechanic_name || <span className="text-text-3">—</span>}</td>
                  <td className="ledger-td"><UiStatusBadge status={STATUS_LABELS[r.status]} tone={badge.tone} icon={badge.icon} /></td>
                  <td className="ledger-td">
                    <div className="flex items-center justify-end gap-2">
                      {r.status === 'gozlenilir' && (
                        <>
                          <Button size="sm" onClick={() => convert(r)} disabled={busy}>Sifarişə çevir</Button>
                          <Button size="sm" variant="danger" onClick={() => handle(r.id, () => updateReservationStatus(r.id, 'gelmedi'))} disabled={busy}>Gəlmədi</Button>
                          <Button size="sm" variant="secondary" onClick={() => handle(r.id, () => updateReservationStatus(r.id, 'legv_edildi'))} disabled={busy}>Ləğv et</Button>
                        </>
                      )}
                      {r.status === 'sifarise_cevrildi' && r.order && (
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/business/orders/${r.order}`)}>Sifarişə bax →</Button>
                      )}
                      {(r.status === 'legv_edildi' || r.status === 'gelmedi') && (
                        <Button size="sm" variant="secondary" onClick={() => convert(r)} disabled={busy}>Sifarişə çevir</Button>
                      )}
                      {r.status !== 'gozlenilir' && (
                        <Button size="sm" variant="ghost" onClick={() => onDelete(r)} disabled={busy} className="!text-danger">Sil</Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
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
  const [deleteTarget, setDeleteTarget] = useState<Reservation | null>(null)

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

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleteTarget(null)
    await deleteReservation(id)
    load()
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Rezervasiyalar"
        subtitle="Müştəri görüşlərini idarə edin"
        actions={<Button icon={Plus} onClick={() => setCreateOpen(true)}>Yeni rezervasiya</Button>}
      />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Ümumi" value={stats.total} />
          <KpiCard label="Gözlənilir" value={stats.pending} />
          <KpiCard label="Sifarişə çevrildi" value={stats.converted} note={stats.conversion_rate !== null ? `${stats.conversion_rate}%` : undefined} />
          <KpiCard label="Gəlmədi" value={stats.no_show} />
          <KpiCard label="Ləğv edildi" value={stats.cancelled} />
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-6">

          {/* Due now */}
          {due.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="section-label !text-danger-strong flex items-center gap-2">
                <CalendarClock size={16} strokeWidth={1.75} />
                Vaxtı çatıb — {due.length} rezervasiya
              </h2>
              <ReservationTable rows={due} showDate onAction={load} onDelete={setDeleteTarget} />
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 ? (
            <div className="flex flex-col gap-4">
              <h2 className="section-label">Gələcək rezervasiyalar</h2>
              {Object.entries(upcomingGroups).map(([dateKey, group]) => (
                <div key={dateKey} className="flex flex-col gap-2">
                  <p className="font-display font-semibold text-h3 text-ink">
                    {formatDateGroup(group[0].scheduled_at)}
                    <span className="ml-2 font-mono text-small font-normal text-text-3">{formatDay(group[0].scheduled_at)}</span>
                  </p>
                  <ReservationTable rows={group} onAction={load} onDelete={setDeleteTarget} />
                </div>
              ))}
            </div>
          ) : due.length === 0 && (
            <EmptyState
              title="Gözləyən rezervasiya yoxdur"
              subtitle="Yeni rezervasiya əlavə etmək üçün “Yeni rezervasiya” düyməsini basın."
              action={<Button icon={Plus} onClick={() => setCreateOpen(true)}>Yeni rezervasiya</Button>}
            />
          )}

          {/* History toggle */}
          {history.length > 0 && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowHistory(v => !v)}
                aria-expanded={showHistory}
                className="flex items-center gap-2 text-body text-text-3 hover:text-ink font-semibold transition-colors w-fit"
              >
                <svg className={`w-4 h-4 transition-transform duration-[160ms] ${showHistory ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Tarixçə ({history.length})
              </button>
              {showHistory && <ReservationTable rows={history} showDate onAction={load} onDelete={setDeleteTarget} />}
            </div>
          )}

        </div>
      )}

      <CreateReservationModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Rezervasiyanı sil"
        message="Bu rezervasiya silinsin? Bu əməliyyat geri qaytarıla bilməz."
        confirmLabel="Bəli, sil"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
