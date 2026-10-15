import { useState } from 'react'
import { Mechanic } from '@/types'
import { createMechanic, updateMechanic } from '@/services/mechanics.service'
import { mapApiError } from '@/lib/utils'
import { mediaUrl } from '@/lib/apiUrl'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

export function getMechanicImageUrl(image?: string | null) {
  if (!image) return ''
  return mediaUrl(image)
}

/** Mechanic photo when there is one, otherwise the ink initials avatar. */
export function MechanicAvatar({ mechanic, size = 36 }: { mechanic: Pick<Mechanic, 'full_name' | 'phone' | 'image'>; size?: number }) {
  const url = getMechanicImageUrl(mechanic.image)
  if (url) {
    return <img src={url} alt={mechanic.full_name ?? 'Usta'} style={{ width: size, height: size }} className="rounded-full object-cover shrink-0 border border-border" />
  }
  return <Avatar name={mechanic.full_name ?? mechanic.phone ?? '?'} tone="ink" size={size} />
}

function PhotoField({ preview, onPick }: { preview: string; onPick: (file: File | null) => void }) {
  return (
    <div>
      <label className="label">Usta şəkli</label>
      <input type="file" accept="image/*" className="input" onChange={e => onPick(e.target.files?.[0] ?? null)} />
      {preview && (
        <div className="w-16 h-16 rounded overflow-hidden border border-border mt-2">
          <img src={preview} alt="Usta şəkli" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  )
}

/** "+ Usta əlavə et" — name, phone, photo, percent and the login password. Mount while open. */
export function AddMechanicModal({ onAdded, onCancel }: { onAdded: (created: Mechanic) => void; onCancel: () => void }) {
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
      onAdded(res.data)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open
      title="Yeni usta"
      onClose={onCancel}
      width="max-w-[560px]"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel}>Ləğv et</Button>
          <Button type="submit" form="add-mechanic-form" loading={loading}>{loading ? 'Əlavə edilir...' : 'Usta əlavə et'}</Button>
        </>
      }
    >
      <form id="add-mechanic-form" onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        <div>
          <label className="label">Ad Soyad</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus placeholder="Rauf Əliyev" className="input" />
        </div>
        <div>
          <label className="label">Əlaqə nömrəsi</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} required type="tel" placeholder="+994 50 000 00 00" className="input-mono" />
        </div>
        <PhotoField
          preview={imagePreview}
          onPick={file => { setImageFile(file); setImagePreview(file ? URL.createObjectURL(file) : '') }}
        />
        <div>
          <label className="label">İş faizi (%)</label>
          <input value={workPercent} onChange={e => setWorkPercent(e.target.value)} required type="number" min={0} max={100} placeholder="Məs: 40" className="input-mono" />
          <p className="text-small text-text-3 mt-1.5">Ödəniş qəbul ediləndə ustanın payı avtomatik xərc kimi qeyd ediləcək.</p>
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
            className={`input ${confirmPassword && confirmPassword !== password ? '!border-danger' : ''}`}
          />
          {confirmPassword && confirmPassword !== password && <p className="text-small text-danger mt-1.5">Şifrələr uyğun gəlmir</p>}
        </div>
        {error && <p className="text-body text-danger bg-danger-subtle rounded px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}

/** "Düzəlt" — name, phone, photo, work percent. Mount while open. */
export function EditMechanicModal({ mechanic, onSaved, onCancel }: { mechanic: Mechanic; onSaved: () => void; onCancel: () => void }) {
  const [fullName, setFullName] = useState(mechanic.full_name ?? '')
  const [phone, setPhone] = useState(mechanic.phone ?? '')
  const [workPercent, setWorkPercent] = useState(String(mechanic.work_percent))
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(getMechanicImageUrl(mechanic.image))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    <Modal
      open
      title="Məlumatları düzəlt"
      onClose={onCancel}
      width="max-w-[560px]"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel}>Ləğv et</Button>
          <Button type="submit" form="edit-mechanic-form" loading={loading}>{loading ? 'Saxlanılır...' : 'Saxla'}</Button>
        </>
      }
    >
      <form id="edit-mechanic-form" onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        <div>
          <label className="label">Ad Soyad</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Rauf Əliyev" className="input" />
        </div>
        <div>
          <label className="label">Əlaqə nömrəsi</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} required type="tel" placeholder="+994 50 000 00 00" className="input-mono" />
        </div>
        <PhotoField
          preview={imagePreview}
          onPick={file => { setImageFile(file); setImagePreview(file ? URL.createObjectURL(file) : getMechanicImageUrl(mechanic.image)) }}
        />
        <div>
          <label className="label">İş faizi (%)</label>
          <input value={workPercent} onChange={e => setWorkPercent(e.target.value)} required type="number" min={0} max={100} placeholder="Məs: 40" className="input-mono" />
        </div>
        {error && <p className="text-body text-danger bg-danger-subtle rounded px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}
