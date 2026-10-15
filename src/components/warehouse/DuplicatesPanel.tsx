import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDuplicates, mergeProduct, DuplicateProduct } from '@/services/warehouse.service'
import { formatCurrency, mapApiError } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'

/** Same item entered several times (often one "Anbarda yoxdur" product per
 * order). Merging moves every order, purchase and movement onto the kept
 * product and adds up the stock — nothing is lost. */
export default function DuplicatesPanel({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const [groups, setGroups] = useState<DuplicateProduct[][]>([])
  const [loading, setLoading] = useState(true)
  const [keep, setKeep] = useState<Record<number, number>>({})
  const [busyGroup, setBusyGroup] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setGroups((await getDuplicates()).data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (open) load() }, [open, load])

  async function merge(index: number, group: DuplicateProduct[]) {
    const keepId = keep[index] ?? group[0].id
    setBusyGroup(index); setError(''); setNotice('')
    try {
      for (const p of group) {
        if (p.id !== keepId) await mergeProduct(p.id, keepId)
      }
      setNotice(`"${group.find(p => p.id === keepId)?.name}" altında ${group.length} qeyd birləşdirildi.`)
      setKeep({})
      await load()
      onChanged()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setBusyGroup(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Təkrar məhsullar" width="max-w-[680px]">
      <p className="text-body text-text-3 mb-4">
        Eyni adla bir neçə dəfə yaradılmış məhsullar. Birləşdirəndə bütün sifarişlər, alışlar və stok seçdiyiniz məhsula köçürülür — heç nə itmir.
      </p>
      {notice && <p className="text-body text-success-strong bg-success-subtle rounded px-3 py-2 mb-3">{notice}</p>}
      {error && <p className="text-body text-danger-strong bg-danger-subtle rounded px-3 py-2 mb-3">{error}</p>}
      {loading && groups.length === 0 ? (
        <Spinner />
      ) : groups.length === 0 ? (
        <p className="text-body text-text-3 pb-4">Təkrar məhsul yoxdur.</p>
      ) : (
        <div className="flex flex-col gap-3 pb-4">
          <p className="text-small text-text-3">{groups.length} qrup. Hər qrupda saxlanacaq məhsulu seçin (tövsiyə olunan əvvəlcədən seçilib).</p>
          {groups.map((group, i) => (
            <div key={group.map(p => p.id).join('-')} className="border border-border rounded-md overflow-hidden">
              {group.map(p => (
                <label key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-border cursor-pointer hover:bg-[#F9F9F9]">
                  <input type="radio" name={`keep-${i}`} className="accent-ink" checked={(keep[i] ?? group[0].id) === p.id} onChange={() => setKeep(prev => ({ ...prev, [i]: p.id }))} />
                  <span className="flex-1 min-w-0">
                    <Link to={`/business/warehouse/products/${p.id}`} className="text-body font-semibold text-ink hover:underline">{p.name}</Link>
                    <span className="block text-small text-text-3 font-mono">
                      stok {p.stock_quantity} · {p.order_count} sifariş · satış {formatCurrency(p.sell_price)}{p.code ? ` · ${p.code}` : ''}
                    </span>
                  </span>
                  {p.is_warehouse === false ? <Badge variant="neutral">Sifarişlik</Badge> : <Badge variant="accent">Anbar</Badge>}
                </label>
              ))}
              <div className="px-4 py-3">
                <Button size="sm" className="w-full" loading={busyGroup === i} disabled={busyGroup !== null} onClick={() => merge(i, group)}>
                  Birləşdir ({group.length} → 1)
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
