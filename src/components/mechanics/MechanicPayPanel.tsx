import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mechanic, MechanicAccount, MechanicPayType } from '@/types'
import { getMechanicAccount, payMechanic, updateMechanicPayTerms } from '@/services/mechanics.service'
import { formatCurrency, formatDate, mapApiError, toLocalISODate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

export const PAY_TYPE_LABELS: Record<MechanicPayType, string> = {
  percent: 'Faizlə',
  salary: 'Maaşlı',
  mixed: 'Maaş + faiz',
}

const PAY_TYPE_HINTS: Record<MechanicPayType, string> = {
  percent: 'Yalnız tamamlanan işlərdən faiz alır. İş yoxdursa, qazanc yoxdur.',
  salary: 'Sifariş sayından asılı olmayaraq sabit aylıq maaş alır.',
  mixed: 'Minimal maaş + hər işdən faiz (maaşın üstünə gəlir).',
}

export default function MechanicPayPanel({ mechanic, onChanged }: { mechanic: Mechanic; onChanged: () => void }) {
  const [acc, setAcc] = useState<MechanicAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [payType, setPayType] = useState<MechanicPayType>(mechanic.pay_type ?? 'percent')
  const [workPercent, setWorkPercent] = useState(String(mechanic.work_percent))
  const [salary, setSalary] = useState(String(mechanic.salary ?? 0))
  const [hiredAt, setHiredAt] = useState(mechanic.hired_at ?? toLocalISODate())
  const [leftAt, setLeftAt] = useState(mechanic.left_at ?? '')
  const [payNow, setPayNow] = useState(mechanic.pay_immediately ?? true)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getMechanicAccount(mechanic.id)
      setAcc(res.data)
      setAmount(res.data.balance > 0 ? String(res.data.balance) : '')
    } finally {
      setLoading(false)
    }
  }, [mechanic.id])

  useEffect(() => { load() }, [load])

  async function saveTerms(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      await updateMechanicPayTerms(mechanic.id, {
        pay_type: payType,
        work_percent: parseInt(workPercent) || 0,
        salary: payType === 'percent' ? 0 : parseFloat(salary) || 0,
        hired_at: hiredAt || null,
        left_at: leftAt || null,
        pay_immediately: payNow,
      })
      setEditing(false)
      setNotice('Ödəniş şərtləri saxlanıldı.')
      onChanged()
      await load()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      const res = await payMechanic(mechanic.id, parseFloat(amount) || 0, note)
      setAcc(res.data)
      setNotice(`${formatCurrency(parseFloat(amount) || 0)} ödənildi — kassadan çıxdı.`)
      setAmount(res.data.balance > 0 ? String(res.data.balance) : '')
      setNote('')
      onChanged()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setBusy(false)
    }
  }

  const type = mechanic.pay_type ?? 'percent'
  const terms = [
    PAY_TYPE_LABELS[type],
    type !== 'salary' ? `${mechanic.work_percent}% faiz` : null,
    type !== 'percent' ? `${formatCurrency(mechanic.salary ?? 0)} / ay` : null,
    type !== 'salary' ? (mechanic.pay_immediately ? 'faiz dərhal verilir' : 'faiz hesaba yığılır') : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <p className="section-label">Ödəniş şərtləri</p>
        <button onClick={() => setEditing(v => !v)} className="text-xs font-semibold text-accent hover:underline">{editing ? 'Bağla' : 'Dəyiş'}</button>
      </div>
      {!editing ? (
        <p className="text-sm text-ink bg-surface border border-rule rounded px-3 py-2.5 mb-4">{terms}</p>
      ) : (
        <form onSubmit={saveTerms} className="card p-4 mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="label">Ödəniş növü</label>
            <div className="flex gap-1 border border-rule rounded p-1 bg-surface-alt">
              {(Object.keys(PAY_TYPE_LABELS) as MechanicPayType[]).map(t => (
                <button type="button" key={t} onClick={() => setPayType(t)}
                  className={`flex-1 py-2 rounded text-sm font-medium ${payType === t ? 'bg-surface text-ink border border-rule' : 'text-ink-muted'}`}>
                  {PAY_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-muted">{PAY_TYPE_HINTS[payType]}</p>
          </div>
          {payType !== 'salary' && (
            <div className="flex flex-col gap-1.5">
              <label className="label">İş faizi (%)</label>
              <input type="number" min="0" max="100" className="input-mono" value={workPercent} onChange={e => setWorkPercent(e.target.value)} />
            </div>
          )}
          {payType !== 'percent' && (
            <div className="flex flex-col gap-1.5">
              <label className="label">Aylıq maaş (₼)</label>
              <input type="number" min="0" step="0.01" className="input-mono" value={salary} onChange={e => setSalary(e.target.value)} required />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="label">İşə başlama tarixi</label>
            <input type="date" className="input-mono" value={hiredAt} onChange={e => setHiredAt(e.target.value)} />
            {payType !== 'percent' && <p className="text-xs text-ink-muted">Maaş bu gündən hesablanır; ilk ay işlədiyi günlərə görə bölünür.</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label">İşdən çıxma tarixi <span className="text-ink-muted normal-case font-normal">(ixtiyari)</span></label>
            <input type="date" className="input-mono" value={leftAt} onChange={e => setLeftAt(e.target.value)} />
          </div>
          {payType !== 'salary' && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={payNow} onChange={e => setPayNow(e.target.checked)} className="w-5 h-5 mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-ink">Faiz payı iş tamamlanan gün verilir</span>
                <span className="block text-xs text-ink-muted">Seçilməsə, faiz ustanın hesabına yığılır və "Ödə" ilə verilir.</span>
              </span>
            </label>
          )}
          <div className="flex gap-2">
            <Button type="submit" loading={busy}>Saxla</Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Ləğv et</Button>
          </div>
        </form>
      )}

      <p className="section-label mb-2">Usta hesabı</p>
      {loading || !acc ? <Spinner /> : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Box label="Qazanılıb" value={formatCurrency(acc.earned)} />
            <Box label="Ödənilib" value={formatCurrency(acc.paid)} tone="success" />
            <Box label="Qalıq" value={formatCurrency(acc.balance)} tone={acc.balance > 0 ? 'danger' : undefined} />
          </div>
          {acc.this_month_salary > 0 && (
            <p className="text-xs text-ink-muted mb-3">Bu ayın maaşından bu günə qədər: {formatCurrency(acc.this_month_salary)} (ay bitəndə hesabata yazılır)</p>
          )}
          {notice && <p className="text-sm text-success bg-success-bg rounded px-3 py-2 mb-3">{notice}</p>}
          {error && <p className="text-sm text-danger bg-danger-bg rounded px-3 py-2 mb-3">{error}</p>}

          <form onSubmit={pay} className="card p-3 flex flex-col gap-2 mb-4">
            <p className="text-sm font-semibold text-ink">Ustaya pul ver</p>
            <div className="flex gap-2">
              <input type="number" min="0.01" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="Məbləğ ₼" className="input-mono flex-1" />
              <Button type="submit" loading={busy}>Ödə</Button>
            </div>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Qeyd (məs. Sentyabr maaşı)" className="input text-sm" />
            <p className="text-xs text-ink-muted">Kassadan çıxır. Hesabata təsir etmir — xərc qazanılanda yazılıb.</p>
          </form>

          {acc.months.length > 0 && (
            <div className="bg-surface border border-rule rounded divide-y divide-rule/60 mb-3">
              <div className="flex px-3 py-1.5 text-xs font-mono uppercase text-ink-muted"><span className="flex-1">Ay</span><span className="w-24 text-right">Qazanc</span><span className="w-24 text-right">Ödənilib</span></div>
              {acc.months.slice(0, 6).map(m => (
                <div key={m.month} className="flex px-3 py-1.5 text-sm font-mono">
                  <span className="flex-1">{m.month}</span>
                  <span className="w-24 text-right">{formatCurrency(m.earned)}</span>
                  <span className="w-24 text-right text-success">{formatCurrency(m.paid)}</span>
                </div>
              ))}
            </div>
          )}
          {acc.entries.length > 0 && (
            <div className="bg-surface border border-rule rounded divide-y divide-rule/60">
              {acc.entries.slice(0, 10).map(e => (
                <div key={e.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-mono text-xs text-ink-muted mr-2">{formatDate(e.date)}</span>
                    {e.order ? <Link to={`/business/orders/${e.order}`} className="hover:text-accent">{e.description}</Link> : e.description}
                  </span>
                  <span className={`font-mono shrink-0 ${e.earned ? 'text-ink' : 'text-success'}`}>
                    {e.earned && e.paid ? 'qazandı və aldı ' : e.earned ? '+' : '−'}{formatCurrency(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Box({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  return (
    <div className="bg-surface border border-rule rounded px-3 py-2.5">
      <p className="section-label mb-1">{label}</p>
      <p className={`font-mono font-semibold text-sm ${tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
