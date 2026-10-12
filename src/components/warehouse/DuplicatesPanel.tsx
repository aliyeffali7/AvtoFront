import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDuplicates, mergeProduct, DuplicateProduct } from '@/services/warehouse.service'
import { formatCurrency, mapApiError } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

/** Same item entered several times (often one "Anbarda yoxdur" product per
 * order). Merging moves every order, purchase and movement onto the kept
 * product and adds up the stock — nothing is lost. */
export default function DuplicatesPanel({ onChanged }: { onChanged: () => void }) {
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

  useEffect(() => { load() }, [load])

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

  if (loading) return <Spinner />

  return (
    <div className="px-5 pb-6 -mt-8">
      <div className="pr-10 mb-4">
        <h2 className="font-serif font-semibold text-xl text-ink">Təkrar məhsullar</h2>
        <p className="text-sm text-ink-muted mt-0.5">
          Eyni adla bir neçə dəfə yaradılmış məhsullar. Birləşdirəndə bütün sifarişlər, alışlar və stok seçdiyiniz məhsula köçürülür — heç nə itmir.
        </p>
      </div>
      {notice && <p className="text-sm text-success bg-success-bg rounded px-3 py-2 mb-3">{notice}</p>}
      {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2 mb-3">{error}</p>}
      {groups.length === 0 ? (
        <p className="text-sm text-ink-muted">Təkrar məhsul yoxdur.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ink-muted">{groups.length} qrup. Hər qrupda saxlanacaq məhsulu seçin (tövsiyə olunan əvvəlcədən seçilib).</p>
          {groups.map((group, i) => (
            <div key={group.map(p => p.id).join('-')} className="bg-surface border border-rule rounded">
              {group.map(p => (
                <label key={p.id} className="flex items-center gap-2 px-3 py-2 border-b border-rule/60 cursor-pointer">
                  <input type="radio" name={`keep-${i}`} checked={(keep[i] ?? group[0].id) === p.id} onChange={() => setKeep(prev => ({ ...prev, [i]: p.id }))} />
                  <span className="flex-1 min-w-0">
                    <Link to={`/business/warehouse/products/${p.id}`} className="text-sm font-medium text-ink hover:text-accent">{p.name}</Link>
                    <span className="block text-xs text-ink-muted font-mono">
                      stok {p.stock_quantity} · {p.order_count} sifariş · satış {formatCurrency(p.sell_price)}{p.code ? ` · ${p.code}` : ''}
                    </span>
                  </span>
                  {p.is_warehouse === false ? <Badge variant="neutral">Sifarişlik</Badge> : <Badge variant="accent">Anbar</Badge>}
                </label>
              ))}
              <div className="px-3 py-2">
                <Button className="min-h-0 py-2 text-sm w-full" loading={busyGroup === i} disabled={busyGroup !== null} onClick={() => merge(i, group)}>
                  Birləşdir ({group.length} → 1)
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
