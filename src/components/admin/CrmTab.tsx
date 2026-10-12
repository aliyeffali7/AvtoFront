import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { BusinessAdmin, CrmAgenda, Lead, LeadSource, LeadStage, Referrer } from '@/types'
import { createLead, getAgenda, getLeads, getReferrers } from '@/services/crm.service'
import { formatDate, mapApiError, toLocalISODate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import MasterDetailShell from '@/components/ui/MasterDetailShell'
import Spinner from '@/components/ui/Spinner'
import LeadPanel from './LeadPanel'
import ReferrerPicker, { ReferrerValue } from './ReferrerPicker'
import { OBJECTIONS, SOURCES, STAGES, stageOf } from './crmLabels'

type View = 'all' | 'today' | 'overdue' | 'risk' | LeadStage

export default function CrmTab({ businesses, openLeadId, onOpened }: {
  businesses: BusinessAdmin[]
  openLeadId: number | null
  onOpened: () => void
}) {
  const [agenda, setAgenda] = useState<CrmAgenda | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [referrers, setReferrers] = useState<Referrer[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)

  const loadAgenda = useCallback(() => { getAgenda().then(r => setAgenda(r.data)).catch(() => {}) }, [])
  const loadReferrers = useCallback(() => { getReferrers().then(r => setReferrers(r.data)).catch(() => {}) }, [])

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      if (view === 'risk') {
        setLeads((await getAgenda()).data.at_risk.map(r => r.lead))
      } else {
        const params: { stage?: string; q?: string; due?: 'today' | 'overdue' } = {}
        if (view === 'today' || view === 'overdue') params.due = view
        else if (view !== 'all') params.stage = view
        if (search.trim()) params.q = search.trim()
        setLeads((await getLeads(params)).data)
      }
    } finally {
      setLoading(false)
    }
  }, [view, search])

  useEffect(() => { loadAgenda(); loadReferrers() }, [loadAgenda, loadReferrers])
  useEffect(() => {
    const timer = setTimeout(loadLeads, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [loadLeads, search])
  useEffect(() => {
    if (openLeadId) { setSelectedId(openLeadId); onOpened() }
  }, [openLeadId, onOpened])

  const refresh = () => { loadAgenda(); loadLeads() }
  const risk = new Set(agenda?.at_risk.map(r => r.lead.id))

  const chips: { key: View; label: string; count?: number; tone?: string }[] = [
    { key: 'all', label: 'Hamısı' },
    { key: 'today', label: 'Bu gün zəng', count: agenda?.today.length, tone: 'text-accent' },
    { key: 'overdue', label: 'Gecikmiş', count: agenda?.overdue.length, tone: 'text-danger' },
    { key: 'risk', label: 'Risk altında', count: agenda?.at_risk.length, tone: 'text-danger' },
    ...STAGES.map(s => ({ key: s.key as View, label: s.label, count: agenda?.stages[s.key] })),
  ]

  const list = loading ? <Spinner /> : leads.length === 0 ? (
    <div className="p-6"><EmptyState title="Kart yoxdur" subtitle='Servisə getdinizsə, "Tez qeyd" ilə yazın.' /></div>
  ) : (
    <div className="divide-y divide-rule">
      {leads.map(l => {
        const stage = stageOf(l.stage)
        const overdue = l.next_action_date && l.next_action_date < toLocalISODate()
        return (
          <button key={l.id} onClick={() => setSelectedId(l.id)}
            className={`w-full text-left px-4 py-3 hover:bg-surface-alt ${selectedId === l.id ? 'bg-surface-alt' : ''}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-ink">{l.name}</span>
              <Badge variant={stage.variant}>{stage.label}</Badge>
              {risk.has(l.id) && <Badge variant="danger">Risk</Badge>}
              {l.district && <span className="text-xs text-ink-muted">{l.district}</span>}
            </div>
            {l.last_note && <p className="text-sm text-ink-soft truncate mt-0.5">{l.last_note.text}</p>}
            {l.next_action_date && (
              <p className={`text-xs font-mono mt-0.5 ${overdue ? 'text-danger' : 'text-ink-muted'}`}>
                ⏰ {formatDate(l.next_action_date)}{l.next_action ? ` — ${l.next_action}` : ''}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )

  const topObjections = (agenda?.objections ?? []).slice(0, 3)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
        <Button onClick={() => setQuickOpen(v => !v)} className="sm:w-auto">
          <Plus className="w-4 h-4" strokeWidth={2.5} /> Tez qeyd
        </Button>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Servis, adam, telefon, rayon..." className="input sm:max-w-xs" />
        {topObjections.length > 0 && (
          <p className="text-xs text-ink-muted sm:ml-auto">
            Ən çox etiraz: {topObjections.map(([k, n]) => `${OBJECTIONS.find(o => o.key === k)?.label} (${n})`).join(', ')}
          </p>
        )}
      </div>

      {quickOpen && (
        <QuickCapture
          referrers={referrers}
          onSaved={id => { setQuickOpen(false); refresh(); loadReferrers(); setSelectedId(id) }}
          onCancel={() => setQuickOpen(false)}
        />
      )}

      <div className="flex gap-1.5 flex-wrap mb-3">
        {chips.map(c => (
          <button key={c.key} onClick={() => setView(c.key)}
            className={`px-3 py-1.5 rounded text-sm border ${view === c.key ? 'bg-ink text-cream border-ink' : 'border-rule text-ink-muted hover:bg-surface-alt'}`}>
            {c.label}{c.count ? <span className={`ml-1.5 font-mono font-semibold ${view === c.key ? '' : c.tone ?? ''}`}>{c.count}</span> : null}
          </button>
        ))}
      </div>

      <MasterDetailShell
        list={list}
        detail={selectedId ? (
          <LeadPanel
            key={selectedId}
            leadId={selectedId}
            businesses={businesses}
            referrers={referrers}
            onChanged={refresh}
            onDeleted={() => { setSelectedId(null); refresh() }}
            onReferrersChanged={loadReferrers}
          />
        ) : null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}

/** 20-second capture after a visit: name + what happened (+ when to follow up). */
function QuickCapture({ referrers, onSaved, onCancel }: { referrers: Referrer[]; onSaved: (id: number) => void; onCancel: () => void }) {
  const [source, setSource] = useState<LeadSource>('visit')
  const [referrer, setReferrer] = useState<ReferrerValue>({ name: '', percent: '' })
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [district, setDistrict] = useState('')
  const [note, setNote] = useState('')
  const [next, setNext] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await createLead({
        name: name.trim(), phone: phone.trim(), district: district.trim(), source,
        ...(source === 'referral' ? { referrer_name: referrer.name.trim(), commission_percent: Number(referrer.percent) } : {}),
        next_action_date: next || null, offered_price: price ? Number(price) : null, note: note.trim(), note_kind: 'visit',
      })
      onSaved(res.data.id)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="card p-4 mb-4 flex flex-col gap-2.5 max-w-xl">
      <p className="card-title">Tez qeyd — yeni servis</p>
      <input value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="Servisin adı" className="input" />
      <div className="flex flex-col gap-1">
        <span className="text-xs text-ink-muted">Haradan gəlib?</span>
        <div className="flex gap-1.5 flex-wrap">
          {SOURCES.map(s => (
            <button type="button" key={s.key} onClick={() => setSource(s.key)} aria-pressed={source === s.key}
              className={`px-3 py-1.5 rounded text-xs font-semibold border ${source === s.key ? 'bg-accent text-cream border-accent' : 'border-rule text-ink-muted hover:bg-surface-alt'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {source === 'referral' && (
        <div className="bg-surface-alt border border-rule rounded p-3">
          <ReferrerPicker value={referrer} onChange={setReferrer} referrers={referrers} />
        </div>
      )}
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Nə danışdınız? (səslə də yaza bilərsiniz)" className="input resize-y" />
      <div className="grid grid-cols-2 gap-2">
        <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="Telefon" className="input-mono" />
        <input value={district} onChange={e => setDistrict(e.target.value)} placeholder="Rayon" className="input" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-ink-muted">Təklif etdiyim qiymət (₼/ay)
          <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="məs. 70" className="input-mono" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">Nə vaxt yenidən əlaqə saxlayım?
          <input type="date" value={next} onChange={e => setNext(e.target.value)} className="input-mono" />
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={saving} className="flex-1">Saxla</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Ləğv et</Button>
      </div>
    </form>
  )
}
