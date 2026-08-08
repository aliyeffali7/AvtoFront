import { useState, useEffect, useCallback } from 'react'
import { Mechanic } from '@/types'
import { getMechanics, createMechanic, updateMechanic, deactivateMechanic, activateMechanic } from '@/services/mechanics.service'
import { mapApiError, formatCurrency } from '@/lib/utils'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import MasterDetailShell from '@/components/ui/MasterDetailShell'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

function getMechanicImageUrl(image?: string | null) {
  if (!image) return ''
  if (image.startsWith('http')) return image
  return `${import.meta.env.VITE_API_URL ?? ''}${image}`
}

function MechanicAvatar({ mechanic, className = 'w-9 h-9 text-sm' }: { mechanic: Pick<Mechanic, 'full_name' | 'phone' | 'image'>; className?: string }) {
  const url = getMechanicImageUrl(mechanic.image)
  if (url) {
    return <img src={url} alt={mechanic.full_name ?? 'Usta'} className={`${className} rounded-full object-cover shrink-0 border border-rule`} />
  }
  return (
    <div className={`${className} rounded-full bg-surface-alt flex items-center justify-center shrink-0 border border-rule`}>
      <span className="font-mono font-semibold text-ink-muted">{(mechanic.full_name ?? mechanic.phone ?? '?')[0].toUpperCase()}</span>
    </div>
  )
}

function AddMechanicForm({ onAdded, onCancel }: { onAdded: (created: Mechanic) => void; onCancel: () => void }) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [workPercent, setWorkPercent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
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
      const res = await createMechanic({ full_name: fullName, phone, password, password_confirm: confirmPassword, work_percent: percent, image: imageFile })
      setFullName(''); setPhone(''); setPassword(''); setConfirmPassword(''); setWorkPercent(''); setImageFile(null); setImagePreview('')
      onAdded(res.data)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
      <h2 className="card-title mb-1">Yeni usta</h2>
      <div>
        <label className="label">Ad Soyad</label>
        <input value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus placeholder="Rauf Əliyev" className="input" />
      </div>
      <div>
        <label className="label">Əlaqə nömrəsi</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} required type="tel" placeholder="+994 50 000 00 00" className="input" />
      </div>
      <div>
        <label className="label">Usta şəkli</label>
        <input
          type="file"
          accept="image/*"
          className="input"
          onChange={e => {
            const file = e.target.files?.[0] ?? null
            setImageFile(file)
            setImagePreview(file ? URL.createObjectURL(file) : '')
          }}
        />
        {imagePreview && (
          <div className="w-16 h-16 rounded overflow-hidden border border-rule mt-2">
            <img src={imagePreview} alt="Usta şəkli" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
      <div>
        <label className="label">İş faizi (%)</label>
        <input
          value={workPercent}
          onChange={e => setWorkPercent(e.target.value)}
          required
          type="number"
          min={0}
          max={100}
          placeholder="Məs: 40"
          className="input-mono"
        />
        <p className="text-xs text-ink-muted mt-1.5">Ödəniş qəbul ediləndə ustanın payı avtomatik xərc kimi qeyd ediləcək.</p>
      </div>
      <div>
        <label className="label">Şifrə</label>
        <input value={password} onChange={e => setPassword(e.target.value)} required type="password" placeholder="Minimum 8 simvol" minLength={8} className="input" />
      </div>
      <div>
        <label className="label">Şifrəni təsdiqlə</label>
        <input
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
          type="password"
          placeholder="Şifrəni təkrar daxil edin"
          className={`input ${confirmPassword && confirmPassword !== password ? 'border-danger focus:ring-danger focus:border-danger' : ''}`}
        />
        {confirmPassword && confirmPassword !== password && (
          <p className="text-xs text-danger mt-1.5">Şifrələr uyğun gəlmir</p>
        )}
      </div>
      {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{error}</p>}
      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" loading={loading}>{loading ? 'Əlavə edilir...' : 'Usta əlavə et'}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Ləğv et</Button>
      </div>
    </form>
  )
}

function MechanicDetail({
  mechanic,
  onSaved,
  onDeactivate,
  onActivate,
  actionBusy,
}: {
  mechanic: Mechanic
  onSaved: () => void
  onDeactivate: () => void
  onActivate: () => void
  actionBusy: boolean
}) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [workPercent, setWorkPercent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setFullName(mechanic.full_name ?? '')
    setPhone(mechanic.phone ?? '')
    setWorkPercent(String(mechanic.work_percent))
    setImageFile(null)
    setImagePreview(getMechanicImageUrl(mechanic.image))
    setError('')
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
      await updateMechanic(mechanic.id, { full_name: fullName, phone, work_percent: percent, image: imageFile })
      onSaved()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <MechanicAvatar mechanic={mechanic} className="w-14 h-14 text-lg" />
          <div className="min-w-0">
            <h2 className="font-serif font-semibold text-xl text-ink truncate">{mechanic.full_name ?? '—'}</h2>
            {mechanic.phone && <p className="font-mono text-xs text-ink-muted mt-0.5">{mechanic.phone}</p>}
          </div>
        </div>
        <Badge variant={mechanic.is_active ? 'success' : 'neutral'}>{mechanic.is_active ? 'Aktiv' : 'Deaktiv'}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="bg-surface border border-rule rounded px-3 py-2.5">
          <p className="section-label mb-1">İş faizi</p>
          <p className="font-mono font-semibold text-sm text-ink">{mechanic.work_percent}%</p>
        </div>
        <div className="bg-surface border border-rule rounded px-3 py-2.5">
          <p className="section-label mb-1">Qazanc</p>
          <p className="font-mono font-semibold text-sm text-ink">{formatCurrency(mechanic.total_earnings)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="section-label">Məlumatları düzəlt</p>
        <div>
          <label className="label">Ad Soyad</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Rauf Əliyev" className="input" />
        </div>
        <div>
          <label className="label">Əlaqə nömrəsi</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} required type="tel" placeholder="+994 50 000 00 00" className="input" />
        </div>
        <div>
          <label className="label">Usta şəkli</label>
          <input
            type="file"
            accept="image/*"
            className="input"
            onChange={e => {
              const file = e.target.files?.[0] ?? null
              setImageFile(file)
              setImagePreview(file ? URL.createObjectURL(file) : getMechanicImageUrl(mechanic.image))
            }}
          />
          {imagePreview && (
            <div className="w-16 h-16 rounded overflow-hidden border border-rule mt-2">
              <img src={imagePreview} alt="Usta şəkli" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <div>
          <label className="label">İş faizi (%)</label>
          <input
            value={workPercent}
            onChange={e => setWorkPercent(e.target.value)}
            required
            type="number"
            min={0}
            max={100}
            placeholder="Məs: 40"
            className="input-mono"
          />
        </div>
        {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{error}</p>}
        <Button type="submit" loading={loading}>{loading ? 'Saxlanılır...' : 'Saxla'}</Button>
      </form>

      <div className="border-t border-rule mt-6 pt-4">
        {mechanic.is_active ? (
          <Button type="button" variant="danger" onClick={onDeactivate} disabled={actionBusy} className="w-full">
            {actionBusy ? '...' : 'Deaktiv et'}
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={onActivate} disabled={actionBusy} className="w-full">
            {actionBusy ? '...' : 'Aktiv et'}
          </Button>
        )}
      </div>
    </div>
  )
}

function MechanicTable({
  title,
  mechanics,
  selectedId,
  onSelect,
}: {
  title: string
  mechanics: Mechanic[]
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  return (
    <div>
      <div className="bg-surface-alt px-4 py-2 border-b border-rule">
        <p className="section-label">{title}</p>
      </div>
      {mechanics.length === 0 ? (
        <p className="px-4 py-4 text-sm text-ink-muted">Bu bölmədə usta yoxdur.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="ledger-table min-w-[560px]">
            <thead>
              <tr>
                <th className="ledger-th">Usta</th>
                <th className="ledger-th">Telefon</th>
                <th className="ledger-th text-right">İş faizi</th>
                <th className="ledger-th text-right">Qazanc</th>
                <th className="ledger-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {mechanics.map(m => (
                <tr
                  key={m.id}
                  onClick={() => onSelect(m.id)}
                  className={`ledger-row ${selectedId === m.id ? 'ledger-row-selected' : ''}`}
                >
                  <td className="ledger-td">
                    <div className="flex items-center gap-2.5">
                      <MechanicAvatar mechanic={m} className="w-8 h-8 text-xs" />
                      <span className="font-medium">{m.full_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="ledger-td font-mono text-ink-muted">{m.phone || '—'}</td>
                  <td className="ledger-td text-right font-mono">{m.work_percent}%</td>
                  <td className="ledger-td text-right font-mono font-semibold">{formatCurrency(m.total_earnings)}</td>
                  <td className="ledger-td"><Badge variant={m.is_active ? 'success' : 'neutral'}>{m.is_active ? 'Aktiv' : 'Deaktiv'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function MechanicsClient() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
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

  function openCreate() {
    setCreating(true)
    setSelectedId(null)
  }

  function selectMechanic(id: number) {
    setCreating(false)
    setSelectedId(id)
  }

  const active = mechanics.filter(m => m.is_active)
  const inactive = mechanics.filter(m => !m.is_active)
  const selectedMechanic = selectedId ? mechanics.find(m => m.id === selectedId) ?? null : null

  const listPane = (
    loading ? (
      <Spinner />
    ) : mechanics.length === 0 ? (
      <div className="p-6">
        <EmptyState title="Hələ usta yoxdur" subtitle="Usta əlavə etmək üçün yuxarıdakı düyməni basın." />
      </div>
    ) : (
      <div className="flex flex-col">
        <MechanicTable title="Aktiv ustalar" mechanics={active} selectedId={creating ? null : selectedId} onSelect={selectMechanic} />
        {inactive.length > 0 && (
          <MechanicTable title="Deaktiv ustalar" mechanics={inactive} selectedId={creating ? null : selectedId} onSelect={selectMechanic} />
        )}
      </div>
    )
  )

  const detailPane = creating ? (
    <AddMechanicForm
      onAdded={created => { setCreating(false); setSelectedId(created.id); load() }}
      onCancel={() => setCreating(false)}
    />
  ) : selectedMechanic ? (
    <MechanicDetail
      mechanic={selectedMechanic}
      onSaved={load}
      onDeactivate={() => setDeactivateTarget(selectedMechanic)}
      onActivate={() => setActivateTarget(selectedMechanic)}
      actionBusy={deactivating === selectedMechanic.id || activating === selectedMechanic.id}
    />
  ) : null

  return (
    <>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="page-title">Ustalar</h1>
            <p className="text-sm text-ink-muted mt-0.5">{active.length} aktiv usta</p>
          </div>
          <Button onClick={openCreate}>+ Usta əlavə et</Button>
        </div>

        <MasterDetailShell list={listPane} detail={detailPane} onClose={() => { setCreating(false); setSelectedId(null) }} />
      </div>

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
