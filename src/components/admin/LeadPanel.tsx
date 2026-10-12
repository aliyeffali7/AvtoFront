import { useCallback, useEffect, useState } from 'react'
import { Phone, MessageCircle, Pencil, UserPlus } from 'lucide-react'
import { BusinessAdmin, LeadDetail, LeadNoteKind, LeadObjection, LeadSource, LeadStage, Referrer } from '@/types'
import { addLeadNote, deleteLead, deleteLeadNote, getLead, updateLead } from '@/services/crm.service'
import { formatCurrency, formatDate, mapApiError } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import ReferrerPicker, { ReferrerValue } from './ReferrerPicker'
import { NOTE_KINDS, OBJECTIONS, SOURCES, STAGES, stageOf, telLink, whatsappLink } from './crmLabels'

const LINKED_STAGES: LeadStage[] = ['trial', 'customer', 'lost']

export default function LeadPanel({
  leadId, businesses, referrers, onChanged, onDeleted, onReferrersChanged,
}: {
  leadId: number
  businesses: BusinessAdmin[]
  referrers: Referrer[]
  onChanged: () => void
  onDeleted: () => void
  onReferrersChanged: () => void
}) {
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // new note
  const [kind, setKind] = useState<LeadNoteKind>('note')
  const [text, setText] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [nextAction, setNextAction] = useState('')
  // edit form
  const [form, setForm] = useState<Partial<LeadDetail>>({})
  const [referrerEdit, setReferrerEdit] = useState<ReferrerValue | null>(null)
  const [linkId, setLinkId] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await getLead(leadId)
      setLead(res.data)
      setForm(res.data)
    } catch (err) {
      setError(mapApiError(err))
    }
  }, [leadId])

  useEffect(() => { load() }, [load])

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError('')
    try {
      await fn()
      await load()
      onChanged()
      return true
    } catch (err) {
      setError(mapApiError(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() && !nextDate) return
    const ok = await run(async () => {
      if (text.trim()) await addLeadNote(leadId, text.trim(), kind)
      if (nextDate || nextAction) await updateLead(leadId, { next_action_date: nextDate || null, next_action: nextAction })
    })
    if (ok) { setText(''); setNextDate(''); setNextAction('') }
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(() => updateLead(leadId, {
      name: form.name, contact_person: form.contact_person, phone: form.phone, district: form.district,
      address: form.address, stage: form.stage, offered_price: form.offered_price || null, source: form.source,
      business: form.business ?? null, objections: form.objections,
    }))
    if (ok) setEditing(false)
  }

  async function saveReferrer(e: React.FormEvent) {
    e.preventDefault()
    if (!referrerEdit) return
    const ok = await run(() => updateLead(leadId, {
      referrer_name: referrerEdit.name.trim(), commission_percent: Number(referrerEdit.percent),
    }))
    if (ok) { setReferrerEdit(null); onReferrersChanged() }
  }

  async function removeReferrer() {
    if (await run(() => updateLead(leadId, { referrer: null, commission_percent: 0 }))) setReferrerEdit(null)
  }

  async function handleDelete() {
    setBusy(true); setError('')
    try {
      await deleteLead(leadId)
      onDeleted()
    } catch (err) {
      setError(mapApiError(err))
      setBusy(false)
    }
  }

  function toggleObjection(tag: LeadObjection) {
    const current = form.objections ?? []
    setForm({ ...form, objections: current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag] })
  }

  if (!lead) return error ? <p className="p-6 text-sm text-danger">{error}</p> : <Spinner />
  const stage = stageOf(lead.stage)
  const linkedIds = new Set(businesses.filter(b => b.crm_lead_id && b.crm_lead_id !== lead.id).map(b => b.id))

  return (
    <div className="px-5 pb-8 -mt-8">
      <div className="pr-10 mb-3">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Badge variant={stage.variant}>{stage.label}</Badge>
          {lead.district && <span className="text-xs text-ink-muted">{lead.district}</span>}
          {lead.business_name && <Badge variant="accent">Qeydiyyatlı: {lead.business_name}</Badge>}
        </div>
        <h2 className="font-serif font-semibold text-xl text-ink">{lead.name}</h2>
        {lead.contact_person && <p className="text-sm text-ink-soft">{lead.contact_person}</p>}
      </div>

      {!lead.business && (
        <div className="flex gap-2 items-center mb-4 bg-surface border border-dashed border-rule rounded px-3 py-2">
          <span className="text-xs text-ink-muted shrink-0">Qeydiyyatdan keçib?</span>
          <select value={linkId} onChange={e => setLinkId(e.target.value)} className="input text-sm py-1.5 flex-1 min-w-0" aria-label="Biznes seçin">
            <option value="">— biznesi seçin</option>
            {businesses.filter(b => !linkedIds.has(b.id)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <Button disabled={!linkId} loading={busy}
            onClick={async () => { if (await run(() => updateLead(leadId, { business: Number(linkId) }))) setLinkId('') }}>
            Bağla
          </Button>
        </div>
      )}

      {lead.phone && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <a href={telLink(lead.phone)} className="btn-secondary justify-center"><Phone className="w-4 h-4" /> Zəng et</a>
          <a href={whatsappLink(lead.phone)} target="_blank" rel="noreferrer" className="btn-secondary justify-center"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
        </div>
      )}

      {lead.health && (
        <div className={`rounded border px-3 py-2.5 mb-4 text-sm ${lead.health.risk.length ? 'bg-danger-bg border-danger/40' : 'bg-success-bg border-success/30'}`}>
          <p className="font-semibold mb-1">{lead.health.risk.length ? `Risk: ${lead.health.risk.join(' · ')}` : 'Sistemdən aktiv istifadə edir'}</p>
          <p className="text-xs text-ink-soft">
            Son fəaliyyət: {lead.health.last_activity ? formatDate(lead.health.last_activity) : '—'} ·
            {' '}son 14 gündə {lead.health.orders_14d} sifariş ·
            {' '}abunəlik: {lead.health.ends_at ? `${formatDate(lead.health.ends_at)} (${lead.health.days_left} gün)` : '—'}
          </p>
        </div>
      )}

      {lead.next_action_date && (
        <p className="text-sm mb-4 bg-surface border border-rule rounded px-3 py-2">
          <span className="section-label mr-2">Növbəti addım</span>
          <span className="font-mono">{formatDate(lead.next_action_date)}</span>{lead.next_action ? ` — ${lead.next_action}` : ''}
        </p>
      )}

      {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2 mb-3">{error}</p>}

      {referrerEdit ? (
        <form onSubmit={saveReferrer} className="card p-3 mb-4 flex flex-col gap-2">
          <p className="section-label">Referal</p>
          <ReferrerPicker value={referrerEdit} onChange={setReferrerEdit} referrers={referrers} autoFocus />
          <div className="flex gap-2 flex-wrap items-center">
            <Button type="submit" loading={busy}>Saxla</Button>
            <Button type="button" variant="secondary" onClick={() => setReferrerEdit(null)}>Ləğv et</Button>
            {lead.referrer && (
              <button type="button" onClick={removeReferrer} className="ml-auto text-xs text-ink-muted hover:text-danger">Referalı çıxar</button>
            )}
          </div>
        </form>
      ) : lead.referrer ? (
        <div className="flex items-center justify-between gap-2 mb-4 bg-surface border border-rule rounded px-3 py-2">
          <p className="text-sm">
            <span className="section-label mr-2">Referal</span>
            <span className="font-medium">{lead.referrer_name}</span>
            <span className="font-mono text-ink-soft"> · {Number(lead.commission_percent)}%</span>
          </p>
          <button onClick={() => setReferrerEdit({ name: lead.referrer_name ?? '', percent: String(Number(lead.commission_percent)) })}
            className="text-xs font-semibold text-accent hover:underline">Dəyiş</button>
        </div>
      ) : (
        <button onClick={() => setReferrerEdit({ name: '', percent: '' })}
          className="w-full flex items-center justify-center gap-2 mb-4 border border-dashed border-rule rounded px-3 py-2 text-sm text-ink-muted hover:bg-surface-alt hover:text-ink">
          <UserPlus className="w-4 h-4" /> Referal əlavə et (kim gətirib, neçə faiz)
        </button>
      )}

      <form onSubmit={saveNote} className="card p-3 mb-4 flex flex-col gap-2">
        <div className="flex gap-1 flex-wrap">
          {NOTE_KINDS.map(k => (
            <button type="button" key={k.key} onClick={() => setKind(k.key)}
              className={`px-3 py-1.5 rounded text-xs font-semibold border ${kind === k.key ? 'bg-accent text-cream border-accent' : 'border-rule text-ink-muted'}`}>
              {k.label}
            </button>
          ))}
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Nə danışdınız? Nə dedi?" className="input resize-y" />
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-ink-muted">Növbəti addım tarixi
            <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} className="input-mono py-2" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-muted">Nə etməli
            <input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Məs. Demo göstər" className="input py-2" />
          </label>
        </div>
        <Button type="submit" loading={busy} disabled={!text.trim() && !nextDate}>Saxla</Button>
      </form>

      <div className="flex items-center justify-between mb-1.5">
        <p className="section-label">Məlumatlar</p>
        <button onClick={() => setEditing(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded border border-rule text-ink hover:bg-surface-alt">
          {editing ? 'Bağla' : <><Pencil className="w-3.5 h-3.5" /> Məlumatları düzəlt</>}
        </button>
      </div>
      {!editing ? (
        <div className="bg-surface border border-rule rounded px-3 py-2 text-sm mb-4 flex flex-col gap-1">
          <Row label="Telefon" value={lead.phone} />
          <Row label="Ünvan" value={[lead.district, lead.address].filter(Boolean).join(', ')} />
          <Row label="Təklif olunan qiymət" value={lead.offered_price ? `${formatCurrency(lead.offered_price)} / ay` : ''} />
          <Row label="Haradan gəlib" value={SOURCES.find(s => s.key === lead.source)?.label ?? ''} />
          <Row label="Etirazlar" value={lead.objections.map(o => OBJECTIONS.find(x => x.key === o)?.label).join(', ')} />
        </div>
      ) : (
        <form onSubmit={saveForm} className="card p-3 mb-4 flex flex-col gap-2.5">
          <Field label="Servisin adı"><input className="input" value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Əlaqə şəxsi"><input className="input" value={form.contact_person ?? ''} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></Field>
          <Field label="Telefon"><input className="input-mono" type="tel" value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Rayon"><input className="input" value={form.district ?? ''} onChange={e => setForm({ ...form, district: e.target.value })} /></Field>
          <Field label="Ünvan"><input className="input" value={form.address ?? ''} onChange={e => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Mərhələ">
            <select className="input" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value as LeadStage })}>
              {STAGES.filter(s => !form.business || LINKED_STAGES.includes(s.key)).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            {form.business && <p className="text-xs text-ink-muted">Biznesə bağlıdır: mərhələ özü dəyişir (ödəniş yoxdursa "Sınaq", varsa "Aktiv müştəri"). Əl ilə yalnız "İtirildi" seçmək olar.</p>}
          </Field>
          <Field label="Təklif olunan qiymət (₼/ay)"><input className="input-mono" type="number" min="0" step="0.01" value={form.offered_price ?? ''} onChange={e => setForm({ ...form, offered_price: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
          <Field label="Haradan gəlib">
            <select className="input" value={form.source ?? ''} onChange={e => setForm({ ...form, source: e.target.value as LeadSource })}>
              <option value="">—</option>
              {SOURCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Qeydiyyatdan keçmiş biznes">
            <select className="input" value={form.business ?? ''} onChange={e => setForm({ ...form, business: e.target.value ? Number(e.target.value) : null })}>
              <option value="">— hələ yoxdur</option>
              {businesses.filter(b => !linkedIds.has(b.id)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Etirazlar">
            <div className="flex flex-wrap gap-1.5">
              {OBJECTIONS.map(o => (
                <button type="button" key={o.key} onClick={() => toggleObjection(o.key)}
                  className={`px-2.5 py-1 rounded text-xs border ${(form.objections ?? []).includes(o.key) ? 'bg-danger-bg text-danger border-danger/40' : 'border-rule text-ink-muted'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex gap-2"><Button type="submit" loading={busy}>Saxla</Button><Button type="button" variant="secondary" onClick={() => setEditing(false)}>Ləğv et</Button></div>
        </form>
      )}

      <p className="section-label mb-1.5">Tarixçə ({lead.notes.length})</p>
      {lead.notes.length === 0 ? <p className="text-sm text-ink-muted mb-4">Hələ qeyd yoxdur.</p> : (
        <div className="flex flex-col gap-2 mb-4">
          {lead.notes.map(n => (
            <div key={n.id} className="bg-surface border border-rule rounded px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs text-ink-muted font-mono">{formatDate(n.created_at)} · {NOTE_KINDS.find(k => k.key === n.kind)?.label}</span>
                <button onClick={() => run(() => deleteLeadNote(n.id))} className="text-xs text-ink-muted hover:text-danger">Sil</button>
              </div>
              <p className="text-sm text-ink whitespace-pre-wrap">{n.text}</p>
            </div>
          ))}
        </div>
      )}

      {lead.commissions.length > 0 && (
        <>
          <p className="section-label mb-1.5">Referal komissiyaları</p>
          <div className="bg-surface border border-rule rounded divide-y divide-rule/60 mb-4">
            {lead.commissions.map(c => (
              <div key={c.id} className="flex justify-between px-3 py-1.5 text-sm">
                <span className="text-ink-muted font-mono text-xs">{formatDate(c.payment_date)} · {formatCurrency(c.payment_amount)}{c.payment_days ? ` (${c.payment_days} gün)` : ''} × {Number(c.percent)}%</span>
                <span className="font-mono">{formatCurrency(c.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {confirmDelete ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-danger">Kart və bütün qeydləri silinsin?</span>
          <button onClick={handleDelete} disabled={busy} className="font-semibold text-danger">Bəli</button>
          <button onClick={() => setConfirmDelete(false)} className="font-semibold text-ink-muted">Xeyr</button>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} className="text-xs text-ink-muted hover:text-danger">Kartı sil</button>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink text-right">{value || '—'}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
