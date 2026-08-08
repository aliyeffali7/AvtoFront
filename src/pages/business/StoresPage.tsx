import { useState, useEffect } from 'react'
import { Store } from '@/types'
import { getStores, createStore, updateStore, deleteStore } from '@/services/stores.service'
import { mapApiError } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

// ─── Create panel (inline, expands above the grid) ──────────────────────────

function CreateStorePanel({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName(''); setPhone(''); setContactPerson(''); setError('')
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await createStore({ name: name.trim(), phone: phone.trim() || undefined, contact_person: contactPerson.trim() || undefined })
      onCreated()
      onClose()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <Card className="px-6 py-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="card-title">Yeni mağaza</h2>
        <button onClick={onClose} className="p-2 rounded text-ink-muted hover:bg-surface-alt hover:text-ink transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">Mağaza adı <span className="text-danger">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="Məs. Avtoehtiyat MMC" className="input" />
        </div>
        <div>
          <label className="label">Telefon</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+994 50 000 00 00" className="input-mono" />
        </div>
        <div>
          <label className="label">Əlaqəli şəxs</label>
          <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Məs. Əli Məmmədov" className="input" />
        </div>
        {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} loading={loading} className="flex-1">{loading ? 'Saxlanılır...' : 'Saxla'}</Button>
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Ləğv et</Button>
        </div>
      </form>
    </Card>
  )
}

// ─── Store card — supports in-place edit ────────────────────────────────────

function StoreCard({
  store, onSaved, onDeleted,
}: { store: Store; onSaved: () => void; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(store.name)
  const [phone, setPhone] = useState(store.phone ?? '')
  const [contactPerson, setContactPerson] = useState(store.contact_person ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function startEdit() {
    setName(store.name); setPhone(store.phone ?? ''); setContactPerson(store.contact_person ?? '')
    setError('')
    setEditing(true)
  }

  async function handleSave() {
    setError('')
    setLoading(true)
    try {
      await updateStore(store.id, { name: name.trim(), phone: phone.trim() || undefined, contact_person: contactPerson.trim() || undefined })
      setEditing(false)
      onSaved()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    await deleteStore(store.id)
    setConfirmDelete(false)
    onDeleted()
  }

  if (editing) {
    return (
      <Card className="px-5 py-5 flex flex-col gap-3">
        <div>
          <label className="label">Mağaza adı <span className="text-danger">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} required autoFocus className="input" />
        </div>
        <div>
          <label className="label">Telefon</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" className="input-mono" />
        </div>
        <div>
          <label className="label">Əlaqəli şəxs</label>
          <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="input" />
        </div>
        {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button onClick={handleSave} disabled={loading} loading={loading} className="flex-1 !py-2 !text-sm">{loading ? 'Saxlanılır...' : 'Saxla'}</Button>
          <Button variant="secondary" onClick={() => setEditing(false)} className="flex-1 !py-2 !text-sm">Ləğv et</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="px-5 py-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 bg-surface-alt rounded flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 7.5M17 13l1.5 7.5M9 20.5a.5.5 0 11-1 0 .5.5 0 011 0zm7 0a.5.5 0 11-1 0 .5.5 0 011 0z" />
          </svg>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={startEdit} className="p-1.5 rounded text-ink-muted hover:bg-surface-alt hover:text-ink transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded text-ink-muted hover:bg-danger-bg hover:text-danger transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div>
        <p className="text-base font-serif font-semibold text-ink">{store.name}</p>
        {store.contact_person && (
          <p className="text-sm text-ink-muted mt-1">{store.contact_person}</p>
        )}
        {store.phone && (
          <a href={`tel:${store.phone}`} className="text-sm font-mono text-accent hover:underline mt-1 block">
            {store.phone}
          </a>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Mağazanı sil"
        message={`"${store.name}" mağazası silinsin? Bu əməliyyat geri qaytarıla bilməz.`}
        confirmLabel="Bəli, sil"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Card>
  )
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  async function load() {
    try {
      const res = await getStores()
      setStores(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Mağazalar</h1>
          <p className="text-sm text-ink-muted mt-0.5">İşlədiyiniz təchizatçı mağazalar</p>
        </div>
        {!createOpen && (
          <Button onClick={() => setCreateOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni mağaza
          </Button>
        )}
      </div>

      <CreateStorePanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />

      {loading ? (
        <Spinner />
      ) : stores.length === 0 ? (
        <EmptyState
          title="Hələ mağaza yoxdur"
          subtitle="Yeni mağaza əlavə etmək üçün + düyməsini basın."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stores.map(store => (
            <StoreCard key={store.id} store={store} onSaved={load} onDeleted={load} />
          ))}
        </div>
      )}
    </div>
  )
}
