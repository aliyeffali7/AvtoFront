import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Referrer, ReferrerDetail } from '@/types'
import { createReferrer, getReferrer, getReferrers, payReferrer } from '@/services/crm.service'
import { formatCurrency, formatDate, mapApiError } from '@/lib/utils'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import MasterDetailShell from '@/components/ui/MasterDetailShell'
import Spinner from '@/components/ui/Spinner'
import { stageOf } from './crmLabels'
import Badge from '@/components/ui/Badge'

/** People who bring shops in: every payment of their shops earns them
 * their percent; here you see what they earned, got, and are still owed. */
export default function ReferrersTab({ onOpenLead }: { onOpenLead: (leadId: number) => void }) {
  const [referrers, setReferrers] = useState<Referrer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setReferrers((await getReferrers()).data)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const totalOwed = referrers.reduce((s, r) => s + Number(r.owed), 0)

  const list = loading ? <Spinner /> : referrers.length === 0 ? (
    <div className="p-6"><EmptyState title="Hələ referal yoxdur" subtitle="Kim sizə servis gətirirsə, onu buraya və ya CRM kartına əlavə edin." /></div>
  ) : (
    <table className="ledger-table">
      <thead>
        <tr>
          <th className="ledger-th">Ad</th>
          <th className="ledger-th text-right">Servis</th>
          <th className="ledger-th text-right">Qazanıb</th>
          <th className="ledger-th text-right">Borcum</th>
        </tr>
      </thead>
      <tbody>
        {referrers.map(r => (
          <tr key={r.id} onClick={() => { setCreating(false); setSelectedId(r.id) }}
            className={`ledger-row ${selectedId === r.id ? 'ledger-row-selected' : ''}`}>
            <td className="ledger-td font-medium">{r.name}<span className="block text-xs text-ink-muted font-mono">{r.phone}</span></td>
            <td className="ledger-td text-right font-mono">{r.lead_count}</td>
            <td className="ledger-td text-right font-mono">{formatCurrency(r.earned)}</td>
            <td className={`ledger-td text-right font-mono font-semibold ${Number(r.owed) > 0 ? 'text-danger' : ''}`}>{formatCurrency(r.owed)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-sm text-ink-muted">
          Tanışlarınıza borcunuz: <span className="font-mono font-semibold text-ink">{formatCurrency(totalOwed)}</span>
        </p>
        <Button onClick={() => { setSelectedId(null); setCreating(true) }}><Plus className="w-4 h-4" strokeWidth={2.5} /> Yeni referal</Button>
      </div>
      <MasterDetailShell
        list={list}
        detail={creating ? (
          <CreateReferrer onDone={id => { setCreating(false); load(); setSelectedId(id) }} onCancel={() => setCreating(false)} />
        ) : selectedId ? (
          <ReferrerPanel key={selectedId} id={selectedId} onChanged={load} onOpenLead={onOpenLead} />
        ) : null}
        onClose={() => { setCreating(false); setSelectedId(null) }}
      />
    </div>
  )
}

function CreateReferrer({ onDone, onCancel }: { onDone: (id: number) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      onDone((await createReferrer({ name: name.trim(), phone: phone.trim(), note: note.trim() })).data.id)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="p-6 flex flex-col gap-3">
      <p className="card-title">Yeni referal</p>
      <input className="input" value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="Adı" />
      <input className="input-mono" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefon" />
      <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Qeyd (məs. kart nömrəsi)" />
      <p className="text-xs text-ink-muted">Faiz hər servisin CRM kartında təyin olunur.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2"><Button type="submit" loading={saving}>Saxla</Button><Button type="button" variant="secondary" onClick={onCancel}>Ləğv et</Button></div>
    </form>
  )
}

function ReferrerPanel({ id, onChanged, onOpenLead }: { id: number; onChanged: () => void; onOpenLead: (leadId: number) => void }) {
  const [data, setData] = useState<ReferrerDetail | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getReferrer(id).then(r => { setData(r.data); setAmount(Number(r.data.owed) > 0 ? String(r.data.owed) : '') }).catch(err => setError(mapApiError(err)))
  }, [id])

  async function pay(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await payReferrer(id, parseFloat(amount) || 0, note.trim())
      setData(res.data); setAmount(''); setNote('')
      onChanged()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setBusy(false)
    }
  }

  if (!data) return error ? <p className="p-6 text-sm text-danger">{error}</p> : <Spinner />
  return (
    <div className="px-5 pb-8 -mt-8">
      <div className="pr-10 mb-4">
        <h2 className="font-serif font-semibold text-xl text-ink">{data.name}</h2>
        <p className="text-sm text-ink-muted font-mono">{data.phone}{data.note ? ` · ${data.note}` : ''}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Box label="Qazanıb" value={formatCurrency(data.earned)} />
        <Box label="Ödəmişəm" value={formatCurrency(data.paid)} />
        <Box label="Borcum" value={formatCurrency(data.owed)} danger={Number(data.owed) > 0} />
      </div>

      {Number(data.owed) > 0 && (
        <form onSubmit={pay} className="card p-3 mb-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <input type="number" min="0.01" step="0.01" max={data.owed} value={amount} onChange={e => setAmount(e.target.value)} className="input-mono flex-1" placeholder="Məbləğ ₼" required />
            <Button type="submit" loading={busy}>Ödə</Button>
          </div>
          <input value={note} onChange={e => setNote(e.target.value)} className="input text-sm" placeholder="Qeyd (məs. Sentyabr üçün)" />
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      )}

      <p className="section-label mb-1.5">Gətirdiyi servislər ({data.leads.length})</p>
      <div className="bg-surface border border-rule rounded divide-y divide-rule/60 mb-4">
        {data.leads.length === 0 ? <p className="px-3 py-2 text-sm text-ink-muted">Hələ yoxdur.</p> : data.leads.map(l => (
          <button key={l.id} onClick={() => onOpenLead(l.id)} className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 hover:bg-surface-alt">
            <span className="text-sm text-ink">{l.name} <Badge variant={stageOf(l.stage).variant}>{stageOf(l.stage).label}</Badge></span>
            <span className="text-right">
              <span className="font-mono text-sm">{Number(l.commission_percent)}%</span>
              <span className="block text-xs text-ink-muted">{l.paid_until ? `ödənib: ${formatDate(l.paid_until)}-dək` : 'hələ ödəniş yoxdur'}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="section-label mb-1.5">Komissiyalar (hər ödənişdən)</p>
      <p className="text-xs text-ink-muted mb-1.5">Borc yalnız servisin ödənişini qeyd edəndə yaranır: məs. 3 aylıq paket 180 ₼ × 20% = 36 ₼, növbəti borc növbəti ödənişdə.</p>
      <div className="bg-surface border border-rule rounded divide-y divide-rule/60 mb-4">
        {data.commissions.length === 0 ? <p className="px-3 py-2 text-sm text-ink-muted">Hələ ödəniş olmayıb.</p> : data.commissions.map(c => (
          <div key={c.id} className="flex justify-between gap-2 px-3 py-1.5 text-sm">
            <span className="text-ink-soft">{formatDate(c.payment_date)} · {c.lead_name} · {formatCurrency(c.payment_amount)}{c.payment_days ? ` (${c.payment_days} gün)` : ''} × {Number(c.percent)}%</span>
            <span className="font-mono">{formatCurrency(c.amount)}</span>
          </div>
        ))}
      </div>

      <p className="section-label mb-1.5">Ödənişlər</p>
      <div className="bg-surface border border-rule rounded divide-y divide-rule/60">
        {data.payouts.length === 0 ? <p className="px-3 py-2 text-sm text-ink-muted">Hələ ödəniş etməmisiniz.</p> : data.payouts.map(p => (
          <div key={p.id} className="flex justify-between gap-2 px-3 py-1.5 text-sm">
            <span className="text-ink-soft">{formatDate(p.date)}{p.note ? ` · ${p.note}` : ''}</span>
            <span className="font-mono text-success">{formatCurrency(p.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Box({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="bg-surface border border-rule rounded px-3 py-2.5">
      <p className="section-label mb-1">{label}</p>
      <p className={`font-mono font-semibold text-sm ${danger ? 'text-danger' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
