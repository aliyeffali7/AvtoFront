import { useCallback, useEffect, useState } from 'react'
import { Phone, User, Plus } from 'lucide-react'
import { Store } from '@/types'
import { getStores, createStore, updateStore, deleteStore } from '@/services/stores.service'
import { mapApiError } from '@/lib/utils'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

/** Plain contact cards for the shops the business works with: name, phone,
 * contact person. Same list as Stok → Tədarükçülər, without the numbers. */
export default function ShopsPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setStores((await getStores()).data.sort((a, b) => a.name.localeCompare(b.name, 'az')))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const q = search.trim().toLowerCase()
  const visible = q
    ? stores.filter(s => [s.name, s.phone, s.contact_person].some(v => v?.toLowerCase().includes(q)))
    : stores

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="page-title">Mağazalar</h1>
        <div className="flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ad, nömrə və ya adam..." className="input sm:w-64" />
          <Button onClick={() => setEditingId('new')} className="shrink-0">
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Yeni mağaza
          </Button>
        </div>
      </div>

      {editingId === 'new' && (
        <div className="mb-4 max-w-sm">
          <ShopForm onDone={() => { setEditingId(null); load() }} onCancel={() => setEditingId(null)} />
        </div>
      )}

      {loading ? <Spinner /> : visible.length === 0 ? (
        <EmptyState
          title={q ? 'Heç nə tapılmadı' : 'Hələ mağaza yoxdur'}
          subtitle={q ? undefined : '"Yeni mağaza" düyməsini basıb əlavə edin.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(store => editingId === store.id ? (
            <ShopForm key={store.id} store={store} onDone={() => { setEditingId(null); load() }} onCancel={() => setEditingId(null)} />
          ) : (
            <div key={store.id} className="card p-5 flex flex-col gap-3">
              <p className="font-serif font-semibold text-lg text-ink leading-tight">{store.name}</p>
              <div className="flex flex-col gap-2 text-sm">
                <span className="flex items-center gap-2 text-ink-soft">
                  <User className="w-4 h-4 text-ink-muted shrink-0" />
                  {store.contact_person || <span className="text-ink-muted">—</span>}
                </span>
                {store.phone ? (
                  <a href={`tel:${store.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 font-mono text-accent hover:underline">
                    <Phone className="w-4 h-4 shrink-0" />
                    {store.phone}
                  </a>
                ) : (
                  <span className="flex items-center gap-2 text-ink-muted">
                    <Phone className="w-4 h-4 shrink-0" /> —
                  </span>
                )}
              </div>
              <div className="flex justify-end pt-1 border-t border-rule">
                <button onClick={() => setEditingId(store.id)} className="text-xs font-semibold text-ink-muted hover:text-accent pt-2">Düzəlt</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ShopForm({ store, onDone, onCancel }: { store?: Store; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(store?.name ?? '')
  const [phone, setPhone] = useState(store?.phone ?? '')
  const [person, setPerson] = useState(store?.contact_person ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const data = { name: name.trim(), phone: phone.trim(), contact_person: person.trim() }
      if (store) await updateStore(store.id, data)
      else await createStore(data)
      onDone()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!store) return
    setSaving(true); setError('')
    try {
      await deleteStore(store.id)
      onDone()
    } catch (err) {
      setError(mapApiError(err))
      setConfirmDelete(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-3 border-accent">
      <div className="flex flex-col gap-1.5">
        <label className="label">Mağaza adı <span className="text-danger">*</span></label>
        <input value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="Məs. Avtoehtiyat MMC" className="input" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label">Nömrə</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+994 50 000 00 00" className="input-mono" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label">Adam adı</label>
        <input value={person} onChange={e => setPerson(e.target.value)} placeholder="Məs. Əli Məmmədov" className="input" />
      </div>
      {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={saving} className="flex-1">Saxla</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Ləğv et</Button>
      </div>
      {store && (
        confirmDelete ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-danger flex-1">Silinsin?</span>
            <button type="button" onClick={handleDelete} disabled={saving} className="font-semibold text-danger">Bəli</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="font-semibold text-ink-muted">Xeyr</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs text-ink-muted hover:text-danger self-start">Mağazanı sil</button>
        )
      )}
    </form>
  )
}
