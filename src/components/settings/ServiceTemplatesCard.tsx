import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ServiceTemplate } from '@/types'
import {
  createServiceTemplate, deleteServiceTemplate, getServiceTemplates, updateServiceTemplate,
} from '@/services/orders.service'
import { mapApiError } from '@/lib/utils'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Modal from '@/components/ui/Modal'
import Money from '@/components/ui/Money'
import Spinner from '@/components/ui/Spinner'

type Values = { name: string; price: string; mechanicAmount: string }
const EMPTY: Values = { name: '', price: '', mechanicAmount: '' }

/** Tənzimləmələr · Hazır işlər — ready-made jobs: name, price, fixed usta payı. */
export default function ServiceTemplatesCard() {
  const [items, setItems] = useState<ServiceTemplate[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [editing, setEditing] = useState<ServiceTemplate | 'new' | null>(null)
  const [values, setValues] = useState<Values>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<ServiceTemplate | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const load = useCallback(() => {
    setLoadFailed(false)
    getServiceTemplates()
      .then(res => setItems(res.data))
      .catch(() => setLoadFailed(true))
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    setValues(EMPTY); setError(''); setEditing('new')
  }
  function openEdit(t: ServiceTemplate) {
    setValues({ name: t.name, price: String(t.price), mechanicAmount: String(t.mechanic_amount) })
    setError(''); setEditing(t)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const price = parseFloat(values.price)
    const amount = parseFloat(values.mechanicAmount || '0') || 0
    if (!values.name.trim()) { setError('İşin adını yazın.'); return }
    if (Number.isNaN(price) || price < 0) { setError('Qiyməti yazın.'); return }
    if (amount > price) { setError('Usta payı işin qiymətindən çox ola bilməz.'); return }
    setSaving(true); setError('')
    try {
      const data = { name: values.name.trim(), price, mechanic_amount: amount }
      if (editing && editing !== 'new') await updateServiceTemplate(editing.id, data)
      else await createServiceTemplate(data)
      setEditing(null)
      load()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await deleteServiceTemplate(deleting.id)
      setDeleting(null); setDeleteError('')
      load()
    } catch (err) {
      setDeleteError(mapApiError(err))
    }
  }

  return (
    <section className="card p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-label">Hazır işlər</h2>
          <p className="text-small text-text-3 mt-1">Usta payı hansı ustanın etməsindən asılı olmayaraq eynidir.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={openNew}>Əlavə et</Button>
      </div>

      {loadFailed ? (
        <p className="text-body text-danger-strong bg-danger-subtle rounded px-4 py-3">
          Hazır işlər yüklənmədi. <button type="button" onClick={load} className="underline font-semibold">Yenidən cəhd et</button>
        </p>
      ) : items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="text-body text-text-3 border border-dashed border-border-strong rounded-lg px-4 py-8 text-center">
          Hələ hazır iş yoxdur. Tez-tez gördüyünüz işi əlavə edin — sifarişdə bir kliklə seçəcəksiniz.
        </p>
      ) : (
        <ul className="border border-border rounded-lg divide-y divide-border">
          {items.map(t => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-text-1 truncate">{t.name}</p>
                <p className="text-small text-text-3 flex flex-wrap items-center gap-x-1.5">
                  <span>Qiymət: <Money value={Number(t.price)} className="!text-small !font-medium" /></span>
                  <span aria-hidden>·</span>
                  <span>Usta payı: <Money value={Number(t.mechanic_amount)} className="!text-small !font-medium" /></span>
                </p>
              </div>
              <button type="button" onClick={() => openEdit(t)} aria-label={`${t.name} — redaktə et`} className="w-9 h-9 flex items-center justify-center rounded text-text-3 hover:bg-surface-2 hover:text-ink">
                <Pencil size={18} strokeWidth={1.75} />
              </button>
              <button type="button" onClick={() => { setDeleting(t); setDeleteError('') }} aria-label={`${t.name} — sil`} className="w-9 h-9 flex items-center justify-center rounded text-text-3 hover:bg-surface-2 hover:text-danger">
                <Trash2 size={18} strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Yeni hazır iş' : 'Hazır işi redaktə et'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Ləğv et</Button>
            <Button type="submit" form="service-template-form" loading={saving}>Yadda saxla</Button>
          </>
        }
      >
        <form id="service-template-form" onSubmit={save} className="flex flex-col gap-4 pb-2">
          <div>
            <label className="label" htmlFor="tpl-name">İşin adı</label>
            <input id="tpl-name" value={values.name} onChange={e => setValues({ ...values, name: e.target.value })} required maxLength={255} placeholder="Məs: Yağ dəyişmə" className="input" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="tpl-price">Qiymət ₼</label>
              <input id="tpl-price" value={values.price} onChange={e => setValues({ ...values, price: e.target.value })} required type="number" min="0" step="0.01" placeholder="0.00" className="input-mono" />
            </div>
            <div>
              <label className="label" htmlFor="tpl-amount">Usta payı ₼</label>
              <input id="tpl-amount" value={values.mechanicAmount} onChange={e => setValues({ ...values, mechanicAmount: e.target.value })} type="number" min="0" step="0.01" placeholder="0.00" className="input-mono" />
            </div>
          </div>
          <p className="text-small text-text-3 -mt-2">Usta payı hansı ustanın etməsindən asılı olmayaraq eynidir.</p>
          {error && <p className="text-body text-danger-strong bg-danger-subtle rounded px-3 py-2">{error}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        danger
        title="Hazır işi sil"
        message={deleteError || `"${deleting?.name ?? ''}" silinsin? Əvvəlki sifarişlərə təsir etmir.`}
        confirmLabel="Sil"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </section>
  )
}
