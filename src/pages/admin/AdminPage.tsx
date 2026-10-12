import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BusinessAdmin, AdminDashboardStats } from '@/types'
import {
  getBusinesses, getAdminDashboard, extendSubscription, toggleBusinessActive, resetOwnerPassword,
  impersonateBusiness, logout, setBusinessEndDate,
} from '@/services/auth.service'
import { leadFromBusiness } from '@/services/crm.service'
import { formatDate, formatCurrency, mapApiError, toLocalISODate } from '@/lib/utils'
import CrmTab from '@/components/admin/CrmTab'
import ReferrersTab from '@/components/admin/ReferrersTab'
import { useCurrentUser } from '@/App'
import Badge, { BadgeVariant } from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ChangePasswordSection from '@/components/settings/ChangePasswordSection'

const EXTEND_OPTIONS = [
  { days: 30, label: '+30 gün' },
  { days: 90, label: '+90 gün' },
  { days: 365, label: '+1 il' },
]

function subscriptionVariant(b: BusinessAdmin): BadgeVariant {
  if (b.access_state === 'suspended') return 'danger'
  return b.access_state === 'active' ? 'success' : 'warning'
}

function subscriptionLabel(b: BusinessAdmin): string {
  if (b.access_state === 'suspended') return 'Dayandırılıb'
  return b.access_state === 'active' ? 'Aktiv' : 'Müddəti bitib'
}

function daysLeft(iso: string | null) {
  if (!iso) return null
  const end = new Date(iso)
  const today = new Date(toLocalISODate())
  const endDay = new Date(toLocalISODate(end))
  return Math.round((endDay.getTime() - today.getTime()) / 86400000)
}

type AdminTab = 'businesses' | 'crm' | 'referrals'
const TAB_KEY = 'avtoservis:admin:tab'

export default function AdminPage() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [businesses, setBusinesses] = useState<BusinessAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [rowError, setRowError] = useState<Record<number, string>>({})
  const [rowMessage, setRowMessage] = useState<Record<number, string>>({})
  const [confirmAction, setConfirmAction] = useState<{ business: BusinessAdmin; kind: 'toggle' | 'reset-password' } | null>(null)
  const [rowAmount, setRowAmount] = useState<Record<number, string>>({})

  const [rowDate, setRowDate] = useState<Record<number, string>>({})
  const [tab, setTab] = useState<AdminTab>(() => {
    try { return (localStorage.getItem(TAB_KEY) as AdminTab) || 'businesses' } catch { return 'businesses' }
  })
  const [openLeadId, setOpenLeadId] = useState<number | null>(null)
  const clearOpenLead = useCallback(() => setOpenLeadId(null), [])

  function changeTab(t: AdminTab) {
    setTab(t)
    try { localStorage.setItem(TAB_KEY, t) } catch { /* ignore */ }
  }

  function openLead(leadId: number) {
    setOpenLeadId(leadId)
    changeTab('crm')
  }

  const [dashboard, setDashboard] = useState<AdminDashboardStats | null>(null)
  const [dashboardError, setDashboardError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getBusinesses()
      setBusinesses(res.data)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDashboard = useCallback(async () => {
    setDashboardError('')
    try {
      const res = await getAdminDashboard()
      setDashboard(res.data)
    } catch (err) {
      setDashboardError(mapApiError(err))
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadDashboard() }, [loadDashboard])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return businesses
    return businesses.filter(b =>
      b.name.toLowerCase().includes(q) || (b.owner_email ?? '').toLowerCase().includes(q)
    )
  }, [businesses, search])

  async function handleExtend(business: BusinessAdmin, days: number) {
    setBusyId(business.id)
    setRowError(prev => ({ ...prev, [business.id]: '' }))
    const amount = (rowAmount[business.id] ?? '').trim()
    try {
      const res = await extendSubscription(business.id, days, amount || undefined)
      setBusinesses(prev => prev.map(b => (b.id === business.id ? res.data : b)))
      setRowAmount(prev => ({ ...prev, [business.id]: '' }))
      setRowMessage(prev => ({
        ...prev,
        [business.id]: amount ? `${days} gün əlavə edildi, ${amount} ₼ qeyd edildi.` : `${days} gün əlavə edildi.`,
      }))
      setTimeout(() => setRowMessage(prev => ({ ...prev, [business.id]: '' })), 3000)
      if (amount) loadDashboard()
    } catch (err) {
      setRowError(prev => ({ ...prev, [business.id]: mapApiError(err) }))
    } finally {
      setBusyId(null)
    }
  }

  async function handleSetDate(business: BusinessAdmin) {
    const day = rowDate[business.id]
    if (!day) return
    setBusyId(business.id)
    setRowError(prev => ({ ...prev, [business.id]: '' }))
    const amount = (rowAmount[business.id] ?? '').trim()
    try {
      const res = await setBusinessEndDate(business.id, day, amount || undefined)
      setBusinesses(prev => prev.map(b => (b.id === business.id ? res.data : b)))
      setRowAmount(prev => ({ ...prev, [business.id]: '' }))
      setRowDate(prev => ({ ...prev, [business.id]: '' }))
      setRowMessage(prev => ({ ...prev, [business.id]: `Bitmə tarixi: ${formatDate(day)}${amount ? `, ${amount} ₼ qeyd edildi` : ''}.` }))
      setTimeout(() => setRowMessage(prev => ({ ...prev, [business.id]: '' })), 3000)
      loadDashboard()
    } catch (err) {
      setRowError(prev => ({ ...prev, [business.id]: mapApiError(err) }))
    } finally {
      setBusyId(null)
    }
  }

  async function handleOpenCrm(business: BusinessAdmin) {
    try {
      const res = await leadFromBusiness(business.id)
      setBusinesses(prev => prev.map(b => (b.id === business.id ? { ...b, crm_lead_id: res.data.id } : b)))
      openLead(res.data.id)
    } catch (err) {
      setRowError(prev => ({ ...prev, [business.id]: mapApiError(err) }))
    }
  }

  async function handleToggleActive(business: BusinessAdmin) {
    setBusyId(business.id)
    setConfirmAction(null)
    try {
      const res = await toggleBusinessActive(business.id)
      setBusinesses(prev => prev.map(b => (b.id === business.id ? res.data : b)))
    } catch (err) {
      setRowError(prev => ({ ...prev, [business.id]: mapApiError(err) }))
    } finally {
      setBusyId(null)
    }
  }

  async function handleResetPassword(business: BusinessAdmin) {
    setBusyId(business.id)
    setConfirmAction(null)
    try {
      const res = await resetOwnerPassword(business.id)
      setRowMessage(prev => ({ ...prev, [business.id]: res.data.detail }))
    } catch (err) {
      setRowError(prev => ({ ...prev, [business.id]: mapApiError(err) }))
    } finally {
      setBusyId(null)
    }
  }

  async function handleView(business: BusinessAdmin) {
    setBusyId(business.id)
    setRowError(prev => ({ ...prev, [business.id]: '' }))
    try {
      await impersonateBusiness(business.id)
      // Full navigation, not client-side routing: AuthGate only fetches
      // /me once on mount, so switching identity via a plain navigate()
      // would leave RoleGuard checking the stale (SUPER_ADMIN) role from
      // before impersonation and bounce back to /admin.
      window.location.href = '/business/dashboard'
    } catch (err) {
      setRowError(prev => ({ ...prev, [business.id]: mapApiError(err) }))
      setBusyId(null)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="page-title">SuperAdmin Paneli</h1>
          <p className="text-sm text-ink-muted mt-0.5">{businesses.length} biznes qeydiyyatdan keçib</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Biznes və ya email üzrə axtar..."
            className="input max-w-xs"
          />
          <button
            onClick={() => setShowChangePassword(v => !v)}
            className="text-sm font-medium text-ink-muted hover:text-ink px-3 py-2.5 rounded border border-rule hover:bg-surface-alt transition-colors whitespace-nowrap"
          >
            Şifrəni dəyiş
          </button>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-ink-muted hover:text-ink px-3 py-2.5 rounded border border-rule hover:bg-surface-alt transition-colors whitespace-nowrap"
          >
            Çıxış
          </button>
        </div>
      </div>

      {showChangePassword && currentUser?.email && (
        <div className="mb-6 max-w-md">
          <ChangePasswordSection email={currentUser.email} />
        </div>
      )}

      <div className="flex gap-1 border border-rule rounded p-1 bg-surface-alt w-fit mb-6">
        {([['businesses', 'Bizneslər'], ['crm', 'CRM'], ['referrals', 'Referallar']] as const).map(([key, label]) => (
          <button key={key} onClick={() => changeTab(key)}
            className={`px-5 py-2 rounded text-sm font-medium ${tab === key ? 'bg-surface text-ink border border-rule' : 'text-ink-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'crm' && <CrmTab businesses={businesses} openLeadId={openLeadId} onOpened={clearOpenLead} />}
      {tab === 'referrals' && <ReferrersTab onOpenLead={openLead} />}

      {tab === 'businesses' && (<>
      {dashboardError ? (
        <p className="text-sm text-danger bg-danger-bg rounded px-4 py-3 mb-6">{dashboardError}</p>
      ) : dashboard && (
        <div className="mb-8 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg border border-rule bg-surface px-4 py-3">
              <p className="text-xs text-ink-muted">Ümumi gəlir</p>
              <p className="text-lg font-semibold font-mono mt-1">{formatCurrency(dashboard.total_revenue)}</p>
            </div>
            <div className="rounded-lg border border-rule bg-surface px-4 py-3">
              <p className="text-xs text-ink-muted">Bu ay gəlir</p>
              <p className="text-lg font-semibold font-mono mt-1">{formatCurrency(dashboard.revenue_this_month)}</p>
            </div>
            <div className="rounded-lg border border-rule bg-surface px-4 py-3">
              <p className="text-xs text-ink-muted">Aktiv bizneslər</p>
              <p className="text-lg font-semibold font-mono mt-1">{dashboard.active_businesses} / {dashboard.total_businesses}</p>
            </div>
            <div className="rounded-lg border border-rule bg-surface px-4 py-3">
              <p className="text-xs text-ink-muted">Müddəti bitməyə az qalıb</p>
              <p className="text-lg font-semibold font-mono mt-1">{dashboard.expiring_soon.length}</p>
            </div>
          </div>

          {dashboard.expiring_soon.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-ink mb-2">Müddəti bitməyə az qalanlar</h2>
              <div className="overflow-x-auto rounded-lg border border-rule">
                <table className="ledger-table min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="ledger-th">Biznes</th>
                      <th className="ledger-th">Sahib</th>
                      <th className="ledger-th text-right">Qalan gün</th>
                      <th className="ledger-th">Bitmə tarixi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.expiring_soon.map(b => (
                      <tr key={b.id} className="ledger-row">
                        <td className="ledger-td font-medium">{b.name}</td>
                        <td className="ledger-td text-ink-soft">{b.owner_email ?? '—'}</td>
                        <td className="ledger-td text-right font-mono">
                          <Badge variant={b.days_left <= 2 ? 'danger' : 'warning'}>{b.days_left} gün</Badge>
                        </td>
                        <td className="ledger-td text-ink-muted text-xs">{formatDate(b.expires_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {dashboard.recent_payments.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-ink mb-2">Son ödənişlər</h2>
              <div className="overflow-x-auto rounded-lg border border-rule">
                <table className="ledger-table min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="ledger-th">Biznes</th>
                      <th className="ledger-th text-right">Məbləğ</th>
                      <th className="ledger-th text-right">Gün</th>
                      <th className="ledger-th">Qeyd</th>
                      <th className="ledger-th">Tarix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recent_payments.map(p => (
                      <tr key={p.id} className="ledger-row">
                        <td className="ledger-td font-medium">{p.business_name}</td>
                        <td className="ledger-td text-right font-mono">{formatCurrency(p.amount)}</td>
                        <td className="ledger-td text-right font-mono">{p.days_extended}</td>
                        <td className="ledger-td text-ink-muted text-xs">{p.note || '—'}</td>
                        <td className="ledger-td text-ink-muted text-xs">{formatDate(p.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <p className="text-sm text-danger bg-danger-bg rounded px-4 py-3">{error}</p>
      ) : filtered.length === 0 ? (
        <EmptyState title="Heç bir biznes tapılmadı" subtitle="Axtarış şərtinə uyğun nəticə yoxdur." />
      ) : (
        <div className="overflow-x-auto">
          <table className="ledger-table min-w-[1000px]">
            <thead>
              <tr>
                <th className="ledger-th">Biznes</th>
                <th className="ledger-th">Sahib</th>
                <th className="ledger-th">Status</th>
                <th className="ledger-th text-right">Üzvlər</th>
                <th className="ledger-th text-right">Sifarişlər</th>
                <th className="ledger-th">Yaradılıb</th>
                <th className="ledger-th">Əməliyyatlar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="ledger-row">
                  <td className="ledger-td font-medium">
                    {b.name}
                    <p className="text-xs text-ink-muted font-mono mt-0.5">kod: {b.login_code ?? '—'}</p>
                  </td>
                  <td className="ledger-td text-ink-soft">{b.owner_email ?? '—'}</td>
                  <td className="ledger-td">
                    <Badge variant={subscriptionVariant(b)}>{subscriptionLabel(b)}</Badge>
                    {b.access_ends_at && (() => {
                      const left = daysLeft(b.access_ends_at)
                      return (
                        <p className={`text-xs mt-1 font-mono ${left !== null && left <= 3 ? 'text-danger font-semibold' : 'text-ink-muted'}`}>
                          bitir: {formatDate(b.access_ends_at)}
                          {left !== null && (left >= 0 ? ` · ${left} gün` : ` · ${-left} gün əvvəl`)}
                        </p>
                      )
                    })()}
                    <p className="text-xs text-ink-muted mt-0.5">{b.subscription_ends_at ? 'ödənişli' : b.trial_ends_at ? 'sınaq' : ''}</p>
                  </td>
                  <td className="ledger-td text-right font-mono">
                    {b.member_count}
                    <span className="text-ink-muted"> ({b.mechanic_count} usta)</span>
                  </td>
                  <td className="ledger-td text-right font-mono">{b.order_count}</td>
                  <td className="ledger-td text-ink-muted text-xs">{formatDate(b.created_at)}</td>
                  <td className="ledger-td">
                    <div className="flex flex-col gap-2 min-w-[220px]">
                      <button
                        onClick={() => handleView(b)}
                        disabled={busyId === b.id || !b.owner_active || !b.owner_email}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded bg-accent text-cream hover:bg-accent-hover disabled:opacity-40 w-fit"
                      >
                        {busyId === b.id ? '...' : 'Bax (bu biznes kimi)'}
                      </button>
                      <input
                        value={rowAmount[b.id] ?? ''}
                        onChange={e => setRowAmount(prev => ({ ...prev, [b.id]: e.target.value }))}
                        placeholder="Məbləğ ₼ (istəyə görə)"
                        inputMode="decimal"
                        className="input text-xs py-1.5 px-2 h-auto w-full"
                      />
                      <div className="flex gap-1.5 flex-wrap">
                        {EXTEND_OPTIONS.map(opt => (
                          <button
                            key={opt.days}
                            onClick={() => handleExtend(b, opt.days)}
                            disabled={busyId === b.id}
                            className="text-xs font-mono font-semibold px-2 py-1.5 rounded border border-rule text-ink-muted hover:bg-surface-alt disabled:opacity-40"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="date"
                          value={rowDate[b.id] ?? ''}
                          onChange={e => setRowDate(prev => ({ ...prev, [b.id]: e.target.value }))}
                          className="input-mono text-xs py-1.5 px-2 h-auto flex-1"
                          aria-label="Bitmə tarixi"
                        />
                        <button
                          onClick={() => handleSetDate(b)}
                          disabled={busyId === b.id || !rowDate[b.id]}
                          className="text-xs font-semibold px-2 py-1.5 rounded border border-rule text-ink-muted hover:bg-surface-alt disabled:opacity-40 whitespace-nowrap"
                        >
                          Tarixi təyin et
                        </button>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => setConfirmAction({ business: b, kind: 'toggle' })}
                          disabled={busyId === b.id}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded disabled:opacity-40 ${
                            b.is_suspended ? 'bg-success-bg text-success hover:opacity-80' : 'bg-danger-bg text-danger hover:opacity-80'
                          }`}
                        >
                          {b.is_suspended ? 'Davam etdir' : 'Dayandır'}
                        </button>
                        <button
                          onClick={() => handleOpenCrm(b)}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded border border-rule text-ink-muted hover:bg-surface-alt"
                        >
                          {b.crm_lead_id ? 'CRM kartı' : 'CRM kartı yarat'}
                        </button>
                        <button
                          onClick={() => setConfirmAction({ business: b, kind: 'reset-password' })}
                          disabled={busyId === b.id}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded border border-rule text-ink-muted hover:bg-surface-alt disabled:opacity-40"
                        >
                          Şifrəni sıfırla
                        </button>
                      </div>
                      {rowError[b.id] && <p className="text-xs text-danger">{rowError[b.id]}</p>}
                      {rowMessage[b.id] && <p className="text-xs text-success">{rowMessage[b.id]}</p>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </>)}

      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction?.kind === 'toggle'
            ? confirmAction.business.is_suspended
              ? 'Biznesin işini davam etdir?'
              : 'Biznesi dayandır?'
            : 'Şifrəni sıfırla?'
        }
        message={
          confirmAction?.kind === 'toggle'
            ? confirmAction.business.is_suspended
              ? `"${confirmAction.business.name}" yenidən normal işləyəcək: yazmaq və dəyişmək mümkün olacaq.`
              : `"${confirmAction.business.name}" sahibi və ustaları daxil olub baxa biləcək, amma heç nəyi dəyişə bilməyəcək. Yuxarıda "hesab admin tərəfindən dayandırılıb" bildirişi görünəcək.`
            : `"${confirmAction?.business.name}" biznesinin sahibinə yeni, təsadüfi şifrə göndəriləcək (${confirmAction?.business.owner_email}).`
        }
        confirmLabel="Bəli"
        danger={!!(confirmAction?.kind === 'toggle' && !confirmAction.business.is_suspended)}
        onConfirm={() => {
          if (!confirmAction) return
          if (confirmAction.kind === 'toggle') handleToggleActive(confirmAction.business)
          else handleResetPassword(confirmAction.business)
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
