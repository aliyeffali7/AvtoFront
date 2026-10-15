import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, GitMerge, MessageCircle, Pencil, Phone, Trash2 } from 'lucide-react'
import { Store, StorePurchases } from '@/types'
import { getStores, getStorePurchases, deleteStore, mergeStore } from '@/services/stores.service'
import { formatCurrency, formatDate, mapApiError } from '@/lib/utils'
import { useGoBack } from '@/lib/useGoBack'
import { hasWhatsAppNumber, whatsappLink } from '@/lib/whatsapp'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import KpiCard from '@/components/ui/KpiCard'
import Modal from '@/components/ui/Modal'
import Money from '@/components/ui/Money'
import Spinner from '@/components/ui/Spinner'
import StoreFormModal from '@/components/stores/StoreFormModal'

/** Full-page supplier: header, KPIs, purchase history, merge and delete. */
export default function StoreDetailPage() {
  const navigate = useNavigate()
  const goBack = useGoBack('/business/stores')
  const { id } = useParams<{ id: string }>()
  const storeId = id ? parseInt(id) : NaN

  const [data, setData] = useState<StorePurchases | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeInto, setMergeInto] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    if (!Number.isFinite(storeId)) { setLoadError(true); setLoading(false); return }
    setLoading(true)
    setLoadError(false)
    try {
      setData((await getStorePurchases(storeId)).data)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => { setData(null); load() }, [load])
  useEffect(() => { getStores().then(r => setStores(r.data)).catch(() => {}) }, [storeId])

  async function handleDelete() {
    if (!data) return
    setBusy(true)
    setActionError('')
    try {
      await deleteStore(data.store.id)
      setConfirmDelete(false)
      navigate('/business/stores', { replace: true })
    } catch (err) {
      setConfirmDelete(false)
      setActionError(mapApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleMerge() {
    if (!data || !mergeInto) return
    setBusy(true)
    setActionError('')
    try {
      const res = await mergeStore(data.store.id, parseInt(mergeInto))
      setMergeOpen(false)
      setMergeInto('')
      navigate(`/business/stores/${res.data.id}`, { replace: true })
    } catch (err) {
      setActionError(mapApiError(err))
      setMergeOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const backBtn = (
    <div>
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={goBack}>Geri — Tədarükçülər</Button>
    </div>
  )

  if (loading && !data) return <div className="flex flex-col gap-4">{backBtn}<Spinner /></div>
  if (loadError || !data) {
    return (
      <div className="flex flex-col gap-4">
        {backBtn}
        <EmptyState title="Tədarükçü tapılmadı" subtitle="Bu tədarükçü silinib və ya əlçatan deyil." />
      </div>
    )
  }

  const store = data.store
  const debt = Number(data.debt_remaining)
  const paid = Number(data.total_purchased) - debt
  const hasPurchases = data.purchases.length > 0

  return (
    <div className="flex flex-col gap-4">
      {backBtn}

      {/* Header card */}
      <div className="card p-5 flex flex-wrap items-center gap-4">
        <Avatar name={store.name} tone="ink" size={48} />
        <div className="flex-1 min-w-[200px]">
          <h1 className="page-title">{store.name}</h1>
          {store.contact_person && <p className="text-body text-text-3">{store.contact_person}</p>}
          {store.phone && <p className="font-mono text-body text-text-3">{store.phone}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {store.phone && (
            <a href={`tel:${store.phone}`} className="btn-secondary"><Phone size={18} strokeWidth={1.75} />Zəng et</a>
          )}
          {hasWhatsAppNumber(store.phone) && (
            <a href={whatsappLink(store.phone!)} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle size={18} strokeWidth={1.75} />WhatsApp</a>
          )}
          <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Düzəlt</Button>
        </div>
      </div>

      {actionError && <p className="text-body text-danger-strong bg-danger-subtle rounded px-4 py-3">{actionError}</p>}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Cəmi alış" value={Number(data.total_purchased)} money note={`Nağd ${formatCurrency(data.cash_total)} · Nisyə ${formatCurrency(data.credit_total)}`} />
        <KpiCard label="Ödənilib" value={paid} money meaning="income" />
        <KpiCard label="Borc qalığı" value={debt} money meaning={debt > 0 ? 'payable' : 'neutral'} accent={debt > 0} note={debt > 0 ? 'Ödəniləcək' : undefined} />
      </div>

      {/* Purchases */}
      <section className="card overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="section-label">Alınan məhsullar ({data.purchases.length})</h2>
        </div>
        {!hasPurchases ? (
          <p className="px-5 pb-5 text-body text-text-3">Bu mağazadan hələ məhsul alınmayıb.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger-table min-w-[640px]">
              <thead>
                <tr>
                  <th className="ledger-th">Tarix</th>
                  <th className="ledger-th">Məhsul</th>
                  <th className="ledger-th text-right">Miqdar</th>
                  <th className="ledger-th">Ödəniş</th>
                  <th className="ledger-th text-right">Məbləğ</th>
                </tr>
              </thead>
              <tbody>
                {data.purchases.map(p => (
                  <tr key={p.id} onClick={() => navigate(`/business/warehouse/purchases/${p.purchase}`)} className="ledger-row">
                    <td className="ledger-td font-mono text-text-2">{formatDate(p.date)}</td>
                    <td className="ledger-td whitespace-normal font-semibold">{p.product_name}</td>
                    <td className="ledger-td text-right font-mono tabular-nums">{p.quantity}{p.returned_quantity > 0 ? ` (−${p.returned_quantity})` : ''}</td>
                    <td className="ledger-td"><Badge variant={p.on_credit ? 'warning' : 'success'}>{p.on_credit ? 'Nisyə' : 'Nağd'}</Badge></td>
                    <td className="ledger-td text-right"><Money value={p.line_total} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2">
                  <td className="ledger-td font-semibold" colSpan={4}>Cəmi alış</td>
                  <td className="ledger-td text-right"><Money value={data.total_purchased} className="font-bold" /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Merge / delete */}
      <section className="card p-5 flex flex-wrap items-center gap-3">
        <Button variant="secondary" icon={GitMerge} onClick={() => { setMergeOpen(true); setActionError('') }}>Başqa tədarükçü ilə birləşdir</Button>
        <Button variant="danger" icon={Trash2} disabled={hasPurchases} onClick={() => { setConfirmDelete(true); setActionError('') }}>Sil</Button>
        {hasPurchases && <p className="text-small text-text-3">Alışı olan tədarükçünü silmək olmaz — lazım olsa başqa tədarükçü ilə birləşdirin.</p>}
      </section>

      <Modal
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        title="Tədarükçüləri birləşdir"
        subtitle={store.name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMergeOpen(false)}>Ləğv et</Button>
            <Button loading={busy} disabled={!mergeInto} onClick={handleMerge}>Birləşdir</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          <p className="text-body text-text-2">
            Eyni mağaza iki dəfə yazılıbsa (məs. "Avto ehtiyat" və "Avtoehtiyat"), bunun bütün alışları, borcları və tarixçəsi seçdiyinizə köçürüləcək, bu qeyd silinəcək.
          </p>
          <div>
            <label className="label">Hansı tədarükçüyə?</label>
            <select value={mergeInto} onChange={e => setMergeInto(e.target.value)} className="input">
              <option value="">Seçin...</option>
              {stores.filter(st => st.id !== store.id).map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Tədarükçünü sil"
        message={`"${store.name}" tədarükçüsü silinsin? Bu əməliyyat geri qaytarıla bilməz.`}
        confirmLabel={busy ? '...' : 'Bəli, sil'}
        cancelLabel="Xeyr"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {editing && (
        <StoreFormModal
          store={store}
          onDone={() => { setEditing(false); load(); getStores().then(r => setStores(r.data)).catch(() => {}) }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  )
}
