import { useState } from 'react'
import { Store } from '@/types'
import { createStore, updateStore } from '@/services/stores.service'
import { mapApiError } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { t } from '@/i18n'

/** New / edit supplier. Mount it while open (state is initialised on mount). */
export default function StoreFormModal({ store, onDone, onCancel }: {
  store?: Store | null
  onDone: (storeId: number) => void
  onCancel: () => void
}) {
  const isEdit = !!store
  const [name, setName] = useState(store?.name ?? '')
  const [phone, setPhone] = useState(store?.phone ?? '')
  const [contactPerson, setContactPerson] = useState(store?.contact_person ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const data = { name: name.trim(), phone: phone.trim() || undefined, contact_person: contactPerson.trim() || undefined }
      const res = store ? await updateStore(store.id, data) : await createStore(data)
      onDone(res.data.id)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onCancel}
      title={isEdit ? t('Tədarükçünü redaktə et') : t('Yeni tədarükçü')}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel}>{t('Ləğv et')}</Button>
          <Button type="submit" form="store-form" loading={saving}>{saving ? t('Saxlanılır...') : t('Saxla')}</Button>
        </>
      }
    >
      <form id="store-form" onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        <div>
          <label className="label">{t('Mağaza adı')} <span className="text-danger normal-case">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder={t('Məs. Avtoehtiyat MMC')} className="input" />
        </div>
        <div>
          <label className="label">{t('Telefon')} <span className="text-text-3 normal-case font-normal">({t('ixtiyari')})</span></label>
          <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+994 50 000 00 00" className="input-mono" />
        </div>
        <div>
          <label className="label">{t('Əlaqəli şəxs')} <span className="text-text-3 normal-case font-normal">({t('ixtiyari')})</span></label>
          <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder={t('Məs. Əli Məmmədov')} className="input" />
        </div>
        {error && <p className="text-body text-danger-strong bg-danger-subtle rounded px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}
