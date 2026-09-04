import { useState, useEffect } from 'react'
import { Customer, CustomerDetail } from '@/types'
import { createCustomer, updateCustomer } from '@/services/customers.service'
import { mapApiError } from '@/lib/utils'
import { loadDraft, saveDraft, clearDraft, CUSTOMER_DRAFT_KEY } from '@/lib/formDraft'
import PlateInput from '@/components/ui/PlateInput'

type CustomerDraft = {
  fullName: string; phone: string; carBrand: string; carModel: string
  carYear: string; carPlate: string; vinCode: string
}

/**
 * Single-column customer create/edit form, rendered inline in the master-detail
 * right panel (no drawer) — mirrors OrderForm's create/edit unification.
 */
export default function CustomerForm({ customer, onDone, onCancel }: {
  customer?: CustomerDetail | null
  onDone: (customerId: number) => void
  onCancel: () => void
}) {
  const isEdit = !!customer

  // New-customer forms restore a local draft so a half-filled form survives
  // navigating away and back; editing always starts from the real record.
  const [draft] = useState<CustomerDraft | null>(() => (customer ? null : loadDraft<CustomerDraft>(CUSTOMER_DRAFT_KEY)))
  const [draftRestored, setDraftRestored] = useState(!!draft)

  const [fullName, setFullName] = useState(customer?.full_name ?? draft?.fullName ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? draft?.phone ?? '')
  const [carBrand, setCarBrand] = useState(customer?.car_brand ?? draft?.carBrand ?? '')
  const [carModel, setCarModel] = useState(customer?.car_model ?? draft?.carModel ?? '')
  const [carYear, setCarYear] = useState(customer?.car_year ?? draft?.carYear ?? '')
  const [carPlate, setCarPlate] = useState(customer?.car_plate ?? draft?.carPlate ?? '')
  const [vinCode, setVinCode] = useState(customer?.vin_code ?? draft?.vinCode ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit) return
    if (!fullName && !phone && !carBrand && !carModel && !carYear && !carPlate && !vinCode) {
      clearDraft(CUSTOMER_DRAFT_KEY)
      return
    }
    saveDraft<CustomerDraft>(CUSTOMER_DRAFT_KEY, { fullName, phone, carBrand, carModel, carYear, carPlate, vinCode })
  }, [isEdit, fullName, phone, carBrand, carModel, carYear, carPlate, vinCode])

  function discardDraft() {
    clearDraft(CUSTOMER_DRAFT_KEY)
    setDraftRestored(false)
    setFullName(''); setPhone(''); setCarBrand(''); setCarModel(''); setCarYear(''); setCarPlate(''); setVinCode(''); setError('')
  }

  function handleCancel() {
    if (!isEdit) clearDraft(CUSTOMER_DRAFT_KEY)
    onCancel()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const payload = {
      full_name: fullName,
      phone: phone || undefined,
      car_brand: carBrand || undefined,
      car_model: carModel || undefined,
      car_year: carYear || undefined,
      car_plate: carPlate || undefined,
      vin_code: vinCode || undefined,
    }
    try {
      const res = isEdit ? await updateCustomer(customer!.id, payload) : await createCustomer(payload)
      if (!isEdit) clearDraft(CUSTOMER_DRAFT_KEY)
      onDone((res.data as Customer).id)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
      <p className="font-serif font-semibold text-lg text-ink">{isEdit ? 'Müştəri redaktəsi' : 'Yeni müştəri'}</p>

      {draftRestored && (
        <div className="flex items-center justify-between gap-2 bg-surface-alt border border-rule rounded px-3 py-2 text-xs">
          <span className="text-ink-muted">Yarımçıq qalmış qaralama bərpa edildi.</span>
          <button type="button" onClick={discardDraft} className="font-semibold text-danger hover:underline shrink-0">Təmizlə</button>
        </div>
      )}

      <input value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus placeholder="Ad Soyad" className="input" />
      <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+994 50 000 00 00" className="input" />

      <div className="border-t border-rule pt-1">
        <p className="section-label mb-2">Avtomobil</p>
        <div className="flex flex-col gap-2.5">
          <input value={carBrand} onChange={e => setCarBrand(e.target.value)} placeholder="Marka" className="input" />
          <input value={carModel} onChange={e => setCarModel(e.target.value)} placeholder="Model" className="input" />
          <div className="flex gap-2.5">
            <input value={carYear} onChange={e => setCarYear(e.target.value)} placeholder="İl" maxLength={4} className="input flex-1" />
            <PlateInput value={carPlate} onChange={setCarPlate} className="input-mono tracking-wider flex-1" />
          </div>
          <input value={vinCode} onChange={e => setVinCode(e.target.value)} placeholder="VIN kod" maxLength={17} className="input-mono text-sm" />
        </div>
      </div>

      {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{error}</p>}

      <div className="flex flex-col gap-2.5 pt-1">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saxlanılır...' : isEdit ? 'Saxla' : 'Müştəri əlavə et'}</button>
        <button type="button" onClick={handleCancel} className="btn-secondary">Ləğv et</button>
      </div>
    </form>
  )
}
