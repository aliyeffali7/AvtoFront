import { useState, useEffect, useCallback } from 'react'
import { Mechanic } from '@/types'
import { getMechanics, createMechanic, updateMechanic, deactivateMechanic, activateMechanic } from '@/services/mechanics.service'
import { mapApiError } from '@/lib/utils'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

function AddMechanicDrawer({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [workPercent, setWorkPercent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Şifrələr uyğun gəlmir.')
      return
    }
    const percent = Number(workPercent)
    if (isNaN(percent) || percent < 0 || percent > 100) {
      setError('İş faizi 0 ilə 100 arasında olmalıdır.')
      return
    }
    setLoading(true)
    try {
      await createMechanic({ full_name: fullName, phone, password, password_confirm: confirmPassword, work_percent: percent })
      setFullName(''); setPhone(''); setPassword(''); setConfirmPassword(''); setWorkPercent('')
      onAdded()
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
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Yeni usta</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-6 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Ad Soyad</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus placeholder="Rauf Əliyev" className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Əlaqə nömrəsi</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} required type="tel" placeholder="+994 50 000 00 00" className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">İş faizi (%)</label>
            <input
              value={workPercent}
              onChange={e => setWorkPercent(e.target.value)}
              required
              type="number"
              min={0}
              max={100}
              placeholder="Məs: 40"
              className="input"
            />
            <p className="text-xs text-gray-400">Ödəniş qəbul ediləndə ustanın payı avtomatik xərc kimi qeyd ediləcək.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Şifrə</label>
            <input value={password} onChange={e => setPassword(e.target.value)} required type="password" placeholder="Minimum 8 simvol" minLength={8} className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Şifrəni təsdiqlə</label>
            <input
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              type="password"
              placeholder="Şifrəni təkrar daxil edin"
              className={`input ${confirmPassword && confirmPassword !== password ? 'border-red-400 focus:ring-red-400' : ''}`}
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-500">Şifrələr uyğun gəlmir</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? 'Əlavə edilir...' : 'Usta əlavə et'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Ləğv et</button>
        </form>
      </div>
    </div>
  )
}

function EditMechanicDrawer({
  mechanic,
  onClose,
  onSaved,
}: {
  mechanic: Mechanic | null
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [workPercent, setWorkPercent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (mechanic) {
      setFullName(mechanic.full_name ?? '')
      setPhone(mechanic.phone ?? '')
      setWorkPercent(String(mechanic.work_percent))
      setError('')
    }
  }, [mechanic])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const percent = Number(workPercent)
    if (isNaN(percent) || percent < 0 || percent > 100) {
      setError('İş faizi 0 ilə 100 arasında olmalıdır.')
      return
    }
    setLoading(true)
    try {
      await updateMechanic(mechanic!.id, { full_name: fullName, phone, work_percent: percent })
      onSaved()
      onClose()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (!mechanic) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Ustanı düzəlt</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-6 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Ad Soyad</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus placeholder="Rauf Əliyev" className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Əlaqə nömrəsi</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} required type="tel" placeholder="+994 50 000 00 00" className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">İş faizi (%)</label>
            <input
              value={workPercent}
              onChange={e => setWorkPercent(e.target.value)}
              required
              type="number"
              min={0}
              max={100}
              placeholder="Məs: 40"
              className="input"
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? 'Saxlanılır...' : 'Saxla'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Ləğv et</button>
        </form>
      </div>
    </div>
  )
}

export default function MechanicsClient() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editMechanic, setEditMechanic] = useState<Mechanic | null>(null)
  const [deactivating, setDeactivating] = useState<number | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<Mechanic | null>(null)
  const [activateTarget, setActivateTarget] = useState<Mechanic | null>(null)
  const [activating, setActivating] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getMechanics()
      setMechanics(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function confirmDeactivate(id: number) {
    setDeactivateTarget(null)
    setDeactivating(id)
    try {
      await deactivateMechanic(id)
      load()
    } finally {
      setDeactivating(null)
    }
  }

  async function confirmActivate(id: number) {
    setActivateTarget(null)
    setActivating(id)
    try {
      await activateMechanic(id)
      load()
    } finally {
      setActivating(null)
    }
  }

  const active = mechanics.filter(m => m.is_active)
  const inactive = mechanics.filter(m => !m.is_active)

  return (
    <>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ustalar</h1>
            <p className="text-sm text-gray-500 mt-0.5">{active.length} aktiv usta</p>
          </div>
          <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Usta əlavə et
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : mechanics.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium">Hələ usta yoxdur</p>
            <p className="text-gray-500 text-sm mt-1">Usta əlavə etmək üçün yuxarıdakı düyməni basın.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Active */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktiv ustalar</p>
              </div>
              {active.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">Aktiv usta yoxdur.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {active.map(m => (
                    <li key={m.id} className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-blue-600 font-semibold text-sm">{(m.full_name ?? m.phone ?? '?')[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{m.full_name ?? '—'}</p>
                          {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-indigo-600 font-medium">{m.work_percent}% pay</span>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-500">Ümumi qazanc: <span className="font-semibold text-gray-700">{Number(m.total_earnings).toFixed(2)} ₼</span></span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">Aktiv</span>
                        <button
                          onClick={() => setEditMechanic(m)}
                          className="p-2.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Düzəlt"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeactivateTarget(m)}
                          disabled={deactivating === m.id}
                          className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors px-1"
                        >
                          {deactivating === m.id ? '...' : 'Deaktiv et'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Inactive */}
            {inactive.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Deaktiv ustalar</p>
                </div>
                <ul className="divide-y divide-gray-100">
                  {inactive.map(m => (
                    <li key={m.id} className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-gray-400 font-semibold text-sm">{(m.full_name ?? m.phone ?? '?')[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">{m.full_name ?? '—'}</p>
                          {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">Deaktiv</span>
                        <button
                          onClick={() => setEditMechanic(m)}
                          className="p-2.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Düzəlt"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setActivateTarget(m)}
                          disabled={activating === m.id}
                          className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors px-1"
                        >
                          {activating === m.id ? '...' : 'Aktiv et'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <AddMechanicDrawer open={addOpen} onClose={() => setAddOpen(false)} onAdded={load} />
      <EditMechanicDrawer mechanic={editMechanic} onClose={() => setEditMechanic(null)} onSaved={load} />

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Ustanı deaktiv et"
        message={`${deactivateTarget?.full_name ?? 'Bu usta'} deaktiv edilsin? Ona yeni sifariş təyin edilə bilməyəcək.`}
        confirmLabel="Deaktiv et"
        danger={false}
        onConfirm={() => deactivateTarget && confirmDeactivate(deactivateTarget.id)}
        onCancel={() => setDeactivateTarget(null)}
      />
      <ConfirmDialog
        open={!!activateTarget}
        title="Ustanı aktiv et"
        message={`${activateTarget?.full_name ?? 'Bu usta'} yenidən aktiv edilsin?`}
        confirmLabel="Aktiv et"
        danger={false}
        onConfirm={() => activateTarget && confirmActivate(activateTarget.id)}
        onCancel={() => setActivateTarget(null)}
      />
    </>
  )
}
