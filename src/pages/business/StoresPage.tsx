import { useState, useEffect, useCallback } from 'react'
import { Store, StorePurchases } from '@/types'
import { getStores, createStore, updateStore, deleteStore, getStorePurchases } from '@/services/stores.service'
import { formatDate, formatCurrency, mapApiError } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import MasterDetailShell from '@/components/ui/MasterDetailShell'

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)

  const [purchases, setPurchases] = useState<StorePurchases | null>(null)
  const [purchasesLoading, setPurchasesLoading] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getStores()
      setStores(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const selectedStore = selectedId ? stores.find(s => s.id === selectedId) ?? null : null

  useEffect(() => {
    if (!selectedId) { setPurchases(null); return }
    setPurchasesLoading(true)
    getStorePurchases(selectedId).then(r => setPurchases(r.data)).finally(() => setPurchasesLoading(false))
  }, [selectedId])

  function openCreate() {
    setCreating(true); setEditing(false); setSelectedId(null)
    setName(''); setPhone(''); setContactPerson(''); setFormError('')
  }

  function selectStore(store: Store) {
    setCreating(false); setEditing(false)
    setConfirmDelete(false)
    setSelectedId(store.id)
  }

  function startEdit(store: Store) {
    setName(store.name); setPhone(store.phone ?? ''); setContactPerson(store.contact_person ?? '')
    setFormError('')
    setEditing(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const res = await createStore({ name: name.trim(), phone: phone.trim() || undefined, contact_person: contactPerson.trim() || undefined })
      setCreating(false)
      await load()
      setSelectedId(res.data.id)
    } catch (err) {
      setFormError(mapApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStore) return
    setFormError('')
    setSaving(true)
    try {
      await updateStore(selectedStore.id, { name: name.trim(), phone: phone.trim() || undefined, contact_person: contactPerson.trim() || undefined })
      setEditing(false)
      load()
    } catch (err) {
      setFormError(mapApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedStore) return
    setDeleting(true)
    try {
      await deleteStore(selectedStore.id)
      setConfirmDelete(false)
      setSelectedId(null)
      load()
    } finally {
      setDeleting(false)
    }
  }

  const listPane = (
    <>
      {loading ? (
        <Spinner />
      ) : stores.length === 0 ? (
        <div className="p-6"><EmptyState title="Hələ mağaza yoxdur" subtitle="Yeni mağaza əlavə etmək üçün yuxarıdakı düyməni basın." /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="ledger-table min-w-[520px]">
            <thead>
              <tr>
                <th className="ledger-th">Mağaza</th>
                <th className="ledger-th">Telefon</th>
                <th className="ledger-th text-right">Cəmi alış</th>
              </tr>
            </thead>
            <tbody>
              {stores.map(store => (
                <tr
                  key={store.id}
                  onClick={() => selectStore(store)}
                  className={`ledger-row ${!creating && selectedId === store.id ? 'ledger-row-selected' : ''}`}
                >
                  <td className="ledger-td font-medium">{store.name}</td>
                  <td className="ledger-td font-mono text-ink-muted">{store.phone || '—'}</td>
                  <td className="ledger-td text-right font-mono font-semibold">{formatCurrency(store.total_purchased || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )

  function storeForm(submitFn: (e: React.FormEvent) => void, title: string) {
    return (
      <form onSubmit={submitFn} className="p-6 flex flex-col gap-4">
        <h2 className="card-title mb-1">{title}</h2>
        <div>
          <label className="label">Mağaza adı <span className="text-danger normal-case">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="Məs. Avtoehtiyat MMC" className="input" />
        </div>
        <div>
          <label className="label">Telefon <span className="text-ink-muted normal-case font-normal">(ixtiyari)</span></label>
          <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+994 50 000 00 00" className="input-mono" />
        </div>
        <div>
          <label className="label">Əlaqəli şəxs <span className="text-ink-muted normal-case font-normal">(ixtiyari)</span></label>
          <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Məs. Əli Məmmədov" className="input" />
        </div>
        {formError && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{formError}</p>}
        <div className="flex flex-col gap-2 pt-2">
          <Button type="submit" loading={saving}>{saving ? 'Saxlanılır...' : 'Saxla'}</Button>
          <Button type="button" variant="secondary" onClick={() => { setCreating(false); setEditing(false) }}>Ləğv et</Button>
        </div>
      </form>
    )
  }

  const detailPane = creating ? (
    storeForm(handleCreate, 'Yeni mağaza')
  ) : editing && selectedStore ? (
    storeForm(handleUpdate, 'Mağazanı redaktə et')
  ) : selectedStore ? (
    <div className="p-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          <h2 className="font-serif font-semibold text-xl text-ink truncate">{selectedStore.name}</h2>
          {selectedStore.contact_person && <p className="text-sm text-ink-muted mt-0.5">{selectedStore.contact_person}</p>}
          {selectedStore.phone && <p className="font-mono text-xs text-ink-muted mt-0.5">{selectedStore.phone}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => startEdit(selectedStore)} className="p-2 rounded text-ink-muted hover:bg-surface-alt hover:text-ink transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button onClick={() => setConfirmDelete(true)} className="p-2 rounded text-ink-muted hover:bg-danger-bg hover:text-danger transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="mt-3 mb-2 flex items-center gap-2 bg-danger-bg border border-danger/30 rounded px-3 py-2">
          <p className="text-sm text-danger flex-1">Bu mağaza silinsin?</p>
          <button onClick={handleDelete} disabled={deleting} className="text-xs font-semibold bg-danger text-cream px-2.5 py-1.5 rounded hover:opacity-90 disabled:opacity-50">
            {deleting ? '...' : 'Bəli, sil'}
          </button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs font-semibold px-2.5 py-1.5 rounded border border-rule text-ink-muted">Xeyr</button>
        </div>
      )}

      {purchasesLoading ? (
        <div className="mt-4"><Spinner /></div>
      ) : purchases ? (
        <>
          <div className="grid grid-cols-3 gap-2 my-4">
            <div className="bg-surface border border-rule rounded px-3 py-2.5">
              <p className="section-label mb-1">Cəmi alış</p>
              <p className="font-mono font-semibold text-sm text-ink">{formatCurrency(purchases.total_purchased)}</p>
            </div>
            <div className="bg-surface border border-rule rounded px-3 py-2.5">
              <p className="section-label mb-1">Kreditlə</p>
              <p className="font-mono font-semibold text-sm text-danger">{formatCurrency(purchases.credit_total)}</p>
            </div>
            <div className="bg-surface border border-rule rounded px-3 py-2.5">
              <p className="section-label mb-1">Nağd</p>
              <p className="font-mono font-semibold text-sm text-success">{formatCurrency(purchases.cash_total)}</p>
            </div>
          </div>

          <p className="section-label mb-2">Alınan məhsullar ({purchases.purchases.length})</p>
          {purchases.purchases.length === 0 ? (
            <p className="text-sm text-ink-muted">Bu mağazadan hələ məhsul alınmayıb.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th className="ledger-th">Məhsul</th>
                    <th className="ledger-th text-center">Miqdar</th>
                    <th className="ledger-th text-right">Məbləğ</th>
                    <th className="ledger-th">Ödəniş</th>
                    <th className="ledger-th">Tarix</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.purchases.map(p => (
                    <tr key={p.id}>
                      <td className="ledger-td font-medium text-ink">{p.product_name}</td>
                      <td className="ledger-td text-center font-mono">{p.quantity}</td>
                      <td className="ledger-td text-right font-mono font-semibold">{formatCurrency(p.line_total)}</td>
                      <td className="ledger-td"><Badge variant={p.on_credit ? 'warning' : 'success'}>{p.on_credit ? 'Kreditlə' : 'Nağd'}</Badge></td>
                      <td className="ledger-td font-mono text-xs text-ink-muted">{formatDate(p.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  ) : null

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Mağazalar</h1>
          <p className="text-sm text-ink-muted mt-0.5">İşlədiyiniz təchizatçı mağazalar</p>
        </div>
        <Button onClick={openCreate}>+ Yeni mağaza</Button>
      </div>

      <MasterDetailShell
        list={listPane}
        detail={detailPane}
        onClose={() => { setCreating(false); setEditing(false); setSelectedId(null) }}
      />
    </div>
  )
}
