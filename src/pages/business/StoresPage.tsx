import { useState, useEffect } from 'react'
import { Store } from '@/types'
import { getStores, createStore, updateStore, deleteStore } from '@/services/stores.service'
import { mapApiError } from '@/lib/utils'

function StoreDrawer({
  open, store, onClose, onSaved,
}: {
  open: boolean
  store?: Store | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName(store?.name ?? '')
      setPhone(store?.phone ?? '')
      setContactPerson(store?.contact_person ?? '')
      setError('')
    }
  }, [open, store])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = { name: name.trim(), phone: phone.trim() || undefined, contact_person: contactPerson.trim() || undefined }
      if (store) {
        await updateStore(store.id, data)
      } else {
        await createStore(data)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{store ? 'Mağazanı düzəlt' : 'Yeni mağaza'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 px-6 py-6 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Mağaza adı <span className="text-red-500">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="Məs. Avtoehtiyat MMC" className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Telefon</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+994 50 000 00 00" className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Əlaqəli şəxs</label>
            <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Məs. Əli Məmmədov" className="input" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="mt-auto flex flex-col gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saxlanılır...' : 'Saxla'}</button>
            <button type="button" onClick={onClose} className="btn-ghost">Ləğv et</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editStore, setEditStore] = useState<Store | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  async function load() {
    try {
      const res = await getStores()
      setStores(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: number) {
    await deleteStore(id)
    setDeleteConfirmId(null)
    load()
  }

  function openCreate() { setEditStore(null); setDrawerOpen(true) }
  function openEdit(s: Store) { setEditStore(s); setDrawerOpen(true) }

  return (
    <>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mağazalar</h1>
            <p className="text-sm text-gray-500 mt-0.5">İşlədiyiniz təchizatçı mağazalar</p>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni mağaza
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : stores.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 7.5M17 13l1.5 7.5M9 20.5a.5.5 0 11-1 0 .5.5 0 011 0zm7 0a.5.5 0 11-1 0 .5.5 0 011 0z" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium">Hələ mağaza yoxdur</p>
            <p className="text-gray-500 text-sm mt-1">Yeni mağaza əlavə etmək üçün + düyməsini basın.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stores.map(store => (
              <div key={store.id} className="bg-white rounded-2xl border border-gray-200 px-5 py-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 7.5M17 13l1.5 7.5M9 20.5a.5.5 0 11-1 0 .5.5 0 011 0zm7 0a.5.5 0 11-1 0 .5.5 0 011 0z" />
                    </svg>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(store)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button onClick={() => setDeleteConfirmId(store.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-base font-bold text-gray-900">{store.name}</p>
                  {store.contact_person && (
                    <p className="text-sm text-gray-500 mt-1">{store.contact_person}</p>
                  )}
                  {store.phone && (
                    <a href={`tel:${store.phone}`} className="text-sm text-blue-600 hover:underline mt-1 block">
                      {store.phone}
                    </a>
                  )}
                </div>

                {deleteConfirmId === store.id && (
                  <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
                    <p className="text-xs text-gray-600">Silmək istəyirsiniz?</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(store.id)} className="flex-1 text-xs bg-red-600 text-white py-2 rounded-xl font-medium">Bəli, sil</button>
                      <button onClick={() => setDeleteConfirmId(null)} className="flex-1 text-xs bg-gray-100 text-gray-700 py-2 rounded-xl font-medium">Xeyr</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <StoreDrawer
        open={drawerOpen}
        store={editStore}
        onClose={() => setDrawerOpen(false)}
        onSaved={load}
      />
    </>
  )
}
