import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react'
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
    <section className="card overflow-hidden flex flex-col">
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-10 h-10 rounded-md bg-surface-2 flex items-center justify-center shrink-0 text-text-2">
            <ClipboardList size={20} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-h3 text-text-1 flex items-center gap-2">
              Hazır işlər
              {items && items.length > 0 && (
                <span className="font-mono text-small font-medium text-text-3 bg-surface-2 rounded-sm px-1.5 py-0.5">{items.length}</span>
              )}
            </h2>
            <p className="text-small text-text-3 mt-0.5">Usta payı hansı ustanın etməsindən asılı olmayaraq eynidir.</p>
          </div>
        </div>
        <Button type="button" size="sm" icon={Plus} onClick={openNew}>Əlavə et</Button>
      </div>

      {loadFailed ? (
        <p className="mx-6 mb-6 text-body text-danger-strong bg-danger-subtle rounded px-4 py-3">
          Hazır işlər yüklənmədi. <button type="button" onClick={load} className="underline font-semibold">Yenidən cəhd et</button>
        </p>
      ) : items === null ? (
        <div className="px-6 pb-6"><Spinner /></div>
      ) : items.length === 0 ? (
        <div className="mx-6 mb-6 border border-dashed border-border-strong rounded-lg px-4 py-10 text-center flex flex-col items-center gap-3">
          <p className="text-body text-text-3 max-w-[36ch]">
            Hələ hazır iş yoxdur. Tez-tez gördüyünüz işi əlavə edin — sifarişdə bir kliklə seçəcəksiniz.
          </p>
          <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={openNew}>İlk hazır işi əlavə et</Button>
        </div>
      ) : (
        <table className="w-full border-t border-border">
          <thead>
            <tr className="bg-surface-2">
              <th className="text-left px-6 py-2.5 text-label uppercase text-text-3 font-medium">İş</th>
              <th className="text-right px-3 py-2.5 text-label uppercase text-text-3 font-medium whitespace-nowrap">Qiymət</th>
              <th className="text-right px-3 py-2.5 text-label uppercase text-text-3 font-medium whitespace-nowrap">Usta payı</th>
              <th className="w-[88px]" aria-label="Əməliyyatlar" />
            </tr>
          </thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} className="group border-t border-border hover:bg-[#F9F9F9] transition-colors">
                <td className="px-6 py-3 text-body font-medium text-text-1">{t.name}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap"><Money value={Number(t.price)} className="!text-body" /></td>
                <td className="px-3 py-3 text-right whitespace-nowrap text-text-2"><Money value={Number(t.mechanic_amount)} className="!text-body" /></td>
                <td className="pr-4 py-2">
                  <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => openEdit(t)} aria-label={`${t.name} — redaktə et`} className="w-9 h-9 flex items-center justify-center rounded text-text-3 hover:bg-surface-2 hover:text-ink">
                      <Pencil size={18} strokeWidth={1.75} />
                    </button>
                    <button type="button" onClick={() => { setDeleting(t); setDeleteError('') }} aria-label={`${t.name} — sil`} className="w-9 h-9 flex items-center justify-center rounded text-text-3 hover:bg-surface-2 hover:text-danger">
                      <Trash2 size={18} strokeWidth={1.75} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
