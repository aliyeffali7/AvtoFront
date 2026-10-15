import { useState, useEffect } from 'react'
import { Customer, CustomerDetail } from '@/types'
import { createCustomer, updateCustomer } from '@/services/customers.service'
import { mapApiError } from '@/lib/utils'
import { loadDraft, saveDraft, clearDraft, CUSTOMER_DRAFT_KEY } from '@/lib/formDraft'
import PlateInput from '@/components/ui/PlateInput'
import CarBrandModelInputs from '@/components/ui/CarBrandModelInputs'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

type CustomerDraft = {
  fullName: string; phone: string; carBrand: string; carModel: string
  carYear: string; carPlate: string; vinCode: string
}

/**
 * Customer create/edit form in a Modal. Mount it while open (state and the
 * new-customer draft are initialised on mount).
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
    <Modal
      open
      title={isEdit ? 'Müştəri redaktəsi' : 'Yeni müştəri'}
      onClose={handleCancel}
      width="max-w-[560px]"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleCancel}>Ləğv et</Button>
          <Button type="submit" form="customer-form" loading={loading}>{loading ? 'Saxlanılır...' : isEdit ? 'Saxla' : 'Müştəri əlavə et'}</Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
        {draftRestored && (
          <div className="flex items-center justify-between gap-2 bg-surface-2 border border-border rounded px-3 py-2 text-small">
            <span className="text-text-3">Yarımçıq qalmış qaralama bərpa edildi.</span>
            <button type="button" onClick={discardDraft} className="font-semibold text-danger hover:underline shrink-0">Təmizlə</button>
          </div>
        )}

        <input value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus placeholder="Ad Soyad" className="input" />
        <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+994 50 000 00 00" className="input-mono" />

        <div className="border-t border-border pt-3">
          <p className="section-label mb-2">Avtomobil</p>
          <div className="flex flex-col gap-2.5">
            <CarBrandModelInputs brand={carBrand} model={carModel} onBrandChange={setCarBrand} onModelChange={setCarModel} />
            <div className="flex gap-2.5">
              <input value={carYear} onChange={e => setCarYear(e.target.value)} placeholder="İl" maxLength={4} className="input-mono flex-1" />
              <PlateInput value={carPlate} onChange={setCarPlate} className="input-mono tracking-wider flex-1" />
            </div>
            <input value={vinCode} onChange={e => setVinCode(e.target.value)} placeholder="VIN kod" maxLength={17} className="input-mono" />
          </div>
        </div>

        {error && <p className="text-body text-danger bg-danger-subtle rounded px-3 py-2">{error}</p>}
      </form>
    </Modal>
  )
}
