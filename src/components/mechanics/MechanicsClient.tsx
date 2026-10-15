import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Mechanic } from '@/types'
import { getMechanics } from '@/services/mechanics.service'
import { PAY_TYPE_LABELS } from './MechanicPayPanel'
import { AddMechanicModal, MechanicAvatar } from './MechanicForms'
import { formatCurrency } from '@/lib/utils'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Money from '@/components/ui/Money'
import PageHeader from '@/components/ui/PageHeader'
import Spinner from '@/components/ui/Spinner'

/** Ustalar list: Aktiv / Deaktiv tabs, a row opens the mechanic's own page. */
export default function MechanicsClient() {
  const navigate = useNavigate()
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'inactive'>('active')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getMechanics()
      setMechanics(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const active = mechanics.filter(m => m.is_active)
  const inactive = mechanics.filter(m => !m.is_active)
  const rows = tab === 'active' ? active : inactive
  const totalBalance = rows.reduce((s, m) => s + (m.balance ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Ustalar"
        subtitle={`${active.length} aktiv usta`}
        actions={<Button icon={Plus} onClick={() => setCreating(true)}>Usta əlavə et</Button>}
      />

      <div className="flex gap-1 border border-border rounded p-1 bg-surface-2 w-fit" role="group" aria-label="Status">
        {([
          { key: 'active', label: `Aktiv (${active.length})` },
          { key: 'inactive', label: `Deaktiv (${inactive.length})` },
        ] as const).map(t => (
          <button
            key={t.key}
            type="button"
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded text-small font-semibold transition-colors ${
              tab === t.key ? 'bg-surface text-ink border border-border' : 'text-text-3 hover:text-ink border border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && mechanics.length === 0 ? <Spinner /> : mechanics.length === 0 ? (
        <EmptyState
          title="Hələ usta yoxdur"
          subtitle="Usta əlavə etmək üçün “Usta əlavə et” düyməsini basın."
          action={<Button icon={Plus} onClick={() => setCreating(true)}>Usta əlavə et</Button>}
        />
      ) : rows.length === 0 ? (
        <EmptyState title={tab === 'active' ? 'Aktiv usta yoxdur' : 'Deaktiv usta yoxdur'} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th className="ledger-th">Usta</th>
                  <th className="ledger-th">Telefon</th>
                  <th className="ledger-th">Ödəniş növü</th>
                  <th className="ledger-th text-right">Qalıq (borcumuz)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(m => (
                  <tr key={m.id} onClick={() => navigate(`/business/mechanics/${m.id}`)} className="ledger-row">
                    <td className="ledger-td">
                      <span className="flex items-center gap-2.5">
                        <MechanicAvatar mechanic={m} size={32} />
                        <span className="font-semibold">{m.full_name ?? '—'}</span>
                      </span>
                    </td>
                    <td className="ledger-td font-mono text-text-2">{m.phone || <span className="text-text-3">—</span>}</td>
                    <td className="ledger-td">
                      {PAY_TYPE_LABELS[m.pay_type ?? 'percent']}
                      <span className="block text-small text-text-3 font-mono">
                        {[m.pay_type !== 'salary' ? `${m.work_percent}%` : null, m.pay_type !== 'percent' && m.pay_type ? `${formatCurrency(m.salary ?? 0)}/ay` : null].filter(Boolean).join(' + ')}
                      </span>
                    </td>
                    <td className="ledger-td text-right">
                      {(m.balance ?? 0) > 0 ? <Money value={m.balance ?? 0} meaning="payable" /> : <Money value={m.balance ?? 0} />}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2">
                  <td className="ledger-td font-semibold" colSpan={3}>Cəmi · {rows.length} usta</td>
                  <td className="ledger-td text-right"><Money value={totalBalance} className="font-bold" /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {creating && (
        <AddMechanicModal
          onAdded={created => { setCreating(false); load(); navigate(`/business/mechanics/${created.id}`) }}
          onCancel={() => setCreating(false)}
        />
      )}
    </div>
  )
}
