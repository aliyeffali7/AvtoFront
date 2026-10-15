import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Phone, Plus, Search } from 'lucide-react'
import { Store } from '@/types'
import { getStores } from '@/services/stores.service'
import { formatPhone } from '@/lib/utils'
import { hasWhatsAppNumber, whatsappLink } from '@/lib/whatsapp'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Money from '@/components/ui/Money'
import PageHeader from '@/components/ui/PageHeader'
import Spinner from '@/components/ui/Spinner'
import StoreFormModal from '@/components/stores/StoreFormModal'

const ICON_BTN = 'w-9 h-9 rounded flex items-center justify-center text-text-2 hover:bg-surface-2 transition-colors duration-[120ms]'

/** Stok · Tədarükçülər (includes the former Mağazalar contact info). A row opens the supplier's page. */
export default function StoresPage() {
  const navigate = useNavigate()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setStores((await getStores()).data)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return stores
    const qDigits = q.replace(/\D/g, '')
    return stores.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.contact_person ?? '').toLowerCase().includes(q) ||
      (s.phone ?? '').toLowerCase().includes(q) ||
      (qDigits.length >= 3 && (s.phone ?? '').replace(/\D/g, '').includes(qDigits)),
    )
  }, [stores, search])

  const totalPurchased = filtered.reduce((s, x) => s + Number(x.total_purchased || 0), 0)
  const totalDebt = filtered.reduce((s, x) => s + Number(x.debt_remaining || 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Stok · Tədarükçülər"
        subtitle={`${stores.length} tədarükçü · mal aldığınız mağazalar: nə alınıb, nə qədər borc var`}
        actions={<Button icon={Plus} onClick={() => setCreating(true)}>Yeni tədarükçü</Button>}
      />

      <div className="relative w-full sm:w-80">
        <Search size={18} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Ad, əlaqəli şəxs və ya telefon..."
          aria-label="Axtar"
          className="input !pl-10"
        />
      </div>

      {loading && stores.length === 0 ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState
          title={search ? 'Axtarışa uyğun tədarükçü tapılmadı' : 'Hələ mağaza yoxdur'}
          subtitle={!search ? 'Yeni mağaza əlavə etmək üçün "Yeni tədarükçü" düyməsini basın.' : undefined}
          action={!search ? <Button icon={Plus} onClick={() => setCreating(true)}>Yeni tədarükçü</Button> : undefined}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ledger-table min-w-[820px]">
              <thead>
                <tr>
                  <th className="ledger-th">Tədarükçü adı</th>
                  <th className="ledger-th">Əlaqə şəxsi</th>
                  <th className="ledger-th">Telefon</th>
                  <th className="ledger-th text-right">Cəmi alış</th>
                  <th className="ledger-th text-right">Borc qalığı</th>
                  <th className="ledger-th w-px"><span className="sr-only">Əlaqə</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const debt = Number(s.debt_remaining || 0)
                  return (
                    <tr key={s.id} onClick={() => navigate(`/business/stores/${s.id}`)} className="ledger-row">
                      <td className="ledger-td">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={s.name} size={32} />
                          <span className="font-semibold">{s.name}</span>
                        </span>
                      </td>
                      <td className="ledger-td">{s.contact_person || <span className="text-text-3">—</span>}</td>
                      <td className="ledger-td font-mono text-text-2">{formatPhone(s.phone) || <span className="text-text-3">—</span>}</td>
                      <td className="ledger-td text-right"><Money value={s.total_purchased || 0} /></td>
                      <td className="ledger-td text-right">
                        {debt > 0 ? <Money value={debt} meaning="payable" /> : <span className="text-text-3">—</span>}
                      </td>
                      <td className="ledger-td">
                        <span className="flex items-center justify-end gap-1">
                          {s.phone && (
                            <a href={`tel:${s.phone}`} onClick={e => e.stopPropagation()} title="Zəng et" aria-label={`Zəng et: ${s.name}`} className={ICON_BTN}>
                              <Phone size={18} strokeWidth={1.75} />
                            </a>
                          )}
                          {hasWhatsAppNumber(s.phone) && (
                            <a href={whatsappLink(s.phone!)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title="WhatsApp" aria-label={`WhatsApp: ${s.name}`} className={ICON_BTN}>
                              <MessageCircle size={18} strokeWidth={1.75} />
                            </a>
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2">
                  <td className="ledger-td font-semibold" colSpan={3}>Cəmi · {filtered.length} tədarükçü</td>
                  <td className="ledger-td text-right"><Money value={totalPurchased} className="font-bold" /></td>
                  <td className="ledger-td text-right">
                    {totalDebt > 0 ? <Money value={totalDebt} meaning="payable" className="font-bold" /> : <span className="text-text-3">—</span>}
                  </td>
                  <td className="ledger-td" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {creating && (
        <StoreFormModal
          onDone={id => { setCreating(false); navigate(`/business/stores/${id}`) }}
          onCancel={() => setCreating(false)}
        />
      )}
    </div>
  )
}
