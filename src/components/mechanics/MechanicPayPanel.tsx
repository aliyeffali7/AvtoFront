import { ReactNode, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HandCoins } from 'lucide-react'
import { Mechanic, MechanicAccount, MechanicPayType } from '@/types'
import { getMechanicAccount, payMechanic, updateMechanicPayTerms } from '@/services/mechanics.service'
import { formatCurrency, formatDate, mapApiError, toLocalISODate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import InkBand from '@/components/ui/InkBand'
import Modal from '@/components/ui/Modal'
import Money from '@/components/ui/Money'
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

const LINK_BTN = 'text-small font-semibold text-ink hover:underline underline-offset-2'

function Term({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-sans text-label uppercase text-text-3">{label}</span>
      <span className="text-body">{value}</span>
    </div>
  )
}

/**
 * Account section of the mechanic page: "Usta hesabı" ink band with
 * "Ustaya pul ver", pay terms (editable), `middle` slot (period earnings),
 * monthly + entry history.
 */
export default function MechanicPayPanel({ mechanic, onChanged, middle }: { mechanic: Mechanic; onChanged: () => void; middle?: ReactNode }) {
  const [acc, setAcc] = useState<MechanicAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [paying, setPaying] = useState(false)
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

  function openEdit() {
    setPayType(mechanic.pay_type ?? 'percent')
    setWorkPercent(String(mechanic.work_percent))
    setSalary(String(mechanic.salary ?? 0))
    setHiredAt(mechanic.hired_at ?? toLocalISODate())
    setLeftAt(mechanic.left_at ?? '')
    setPayNow(mechanic.pay_immediately ?? true)
    setError('')
    setEditing(true)
  }

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
      setPaying(false)
      onChanged()
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setBusy(false)
    }
  }

  const type = mechanic.pay_type ?? 'percent'

  return (
    <>
      {/* Usta hesabı */}
      {loading || !acc ? (
        <div className="bg-ink rounded-lg px-7 py-6"><Spinner /></div>
      ) : (
        <InkBand
          label="Usta hesabı"
          items={[
            { label: 'Qazanılıb', value: formatCurrency(acc.earned) },
            { label: 'Ödənilib', value: formatCurrency(acc.paid) },
            { label: 'Qalıq', value: formatCurrency(acc.balance), note: acc.balance > 0 ? 'Ustaya borcumuz' : undefined, highlight: acc.balance > 0 },
          ]}
          footer={
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="secondary" size="lg" icon={HandCoins} onClick={() => { setError(''); setPaying(true) }}>Ustaya pul ver</Button>
              {acc.this_month_salary > 0 && (
                <p className="text-small text-text-4">Bu ayın maaşından bu günə qədər: {formatCurrency(acc.this_month_salary)} (ay bitəndə hesabata yazılır)</p>
              )}
            </div>
          }
        />
      )}
      {notice && <p className="text-body text-success-strong bg-success-subtle rounded px-3 py-2">{notice}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Ödəniş şərtləri */}
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3 mb-3 min-h-[20px]">
            <h2 className="section-label">Ödəniş şərtləri</h2>
            <button type="button" onClick={openEdit} className={LINK_BTN}>Dəyiş</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Term label="Ödəniş növü" value={PAY_TYPE_LABELS[type]} />
            {type !== 'salary' && <Term label="İş faizi" value={<span className="font-mono">{mechanic.work_percent}%</span>} />}
            {type !== 'percent' && <Term label="Aylıq maaş" value={<span className="font-mono">{formatCurrency(mechanic.salary ?? 0)}</span>} />}
            {type !== 'salary' && <Term label="Faiz payı" value={mechanic.pay_immediately ? 'Dərhal verilir' : 'Hesaba yığılır'} />}
            <Term label="İşə başlama" value={<span className="font-mono">{mechanic.hired_at ? formatDate(mechanic.hired_at) : '—'}</span>} />
            {mechanic.left_at && <Term label="İşdən çıxma" value={<span className="font-mono">{formatDate(mechanic.left_at)}</span>} />}
          </div>
        </section>

        {middle}
      </div>

      {/* History */}
      {acc && (acc.months.length > 0 || acc.entries.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {acc.months.length > 0 && (
            <section className="card overflow-hidden">
              <h2 className="section-label px-5 pt-5 pb-3">Aylar üzrə</h2>
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th className="ledger-th">Ay</th>
                    <th className="ledger-th text-right">Qazanc</th>
                    <th className="ledger-th text-right">Ödənilib</th>
                  </tr>
                </thead>
                <tbody>
                  {acc.months.slice(0, 6).map(m => (
                    <tr key={m.month}>
                      <td className="ledger-td font-mono">{m.month}</td>
                      <td className="ledger-td text-right"><Money value={m.earned} /></td>
                      <td className="ledger-td text-right"><Money value={m.paid} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          {acc.entries.length > 0 && (
            <section className="card overflow-hidden">
              <h2 className="section-label px-5 pt-5 pb-3">Ödəniş tarixçəsi</h2>
              <div className="divide-y divide-border">
                {acc.entries.slice(0, 10).map(e => (
                  <div key={e.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-body">
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-small text-text-3 mr-2">{formatDate(e.date)}</span>
                      {e.order ? <Link to={`/business/orders/${e.order}`} className="hover:underline underline-offset-2">{e.description}</Link> : e.description}
                    </span>
                    <span className={`font-mono tabular-nums font-semibold shrink-0 ${e.earned ? 'text-text-1' : 'text-success'}`}>
                      {e.earned && e.paid ? 'qazandı və aldı ' : e.earned ? '+' : '−'}{formatCurrency(e.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Ustaya pul ver */}
      <Modal
        open={paying}
        title="Ustaya pul ver"
        subtitle={mechanic.full_name}
        onClose={() => setPaying(false)}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setPaying(false)}>Ləğv et</Button>
            <Button type="submit" form="pay-mechanic-form" loading={busy}>Ödə</Button>
          </>
        }
      >
        <form id="pay-mechanic-form" onSubmit={pay} className="flex flex-col gap-3 pb-2">
          <input type="number" min="0.01" step="0.01" required autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="Məbləğ ₼" className="input-mono" />
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Qeyd (məs. Sentyabr maaşı)" className="input" />
          <p className="text-small text-text-3">Kassadan çıxır. Hesabata təsir etmir — xərc qazanılanda yazılıb.</p>
          {error && <p className="text-body text-danger bg-danger-subtle rounded px-3 py-2">{error}</p>}
        </form>
      </Modal>

      {/* Ödəniş şərtlərini dəyiş */}
      <Modal
        open={editing}
        title="Ödəniş şərtləri"
        subtitle={mechanic.full_name}
        onClose={() => setEditing(false)}
        width="max-w-[560px]"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Ləğv et</Button>
            <Button type="submit" form="pay-terms-form" loading={busy}>Saxla</Button>
          </>
        }
      >
        <form id="pay-terms-form" onSubmit={saveTerms} className="flex flex-col gap-4 pb-2">
          <div className="flex flex-col gap-1.5">
            <label className="label !mb-0">Ödəniş növü</label>
            <div className="flex gap-1 border border-border rounded p-1 bg-surface-2">
              {(Object.keys(PAY_TYPE_LABELS) as MechanicPayType[]).map(t => (
                <button type="button" key={t} onClick={() => setPayType(t)} aria-pressed={payType === t}
                  className={`flex-1 py-2 rounded text-small font-semibold ${payType === t ? 'bg-surface text-ink border border-border' : 'text-text-3 border border-transparent'}`}>
                  {PAY_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <p className="text-small text-text-3">{PAY_TYPE_HINTS[payType]}</p>
          </div>
          {payType !== 'salary' && (
            <div className="flex flex-col gap-1.5">
              <label className="label !mb-0">İş faizi (%)</label>
              <input type="number" min="0" max="100" className="input-mono" value={workPercent} onChange={e => setWorkPercent(e.target.value)} />
            </div>
          )}
          {payType !== 'percent' && (
            <div className="flex flex-col gap-1.5">
              <label className="label !mb-0">Aylıq maaş (₼)</label>
              <input type="number" min="0" step="0.01" className="input-mono" value={salary} onChange={e => setSalary(e.target.value)} required />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="label !mb-0">İşə başlama tarixi</label>
            <input type="date" className="input-mono" value={hiredAt} onChange={e => setHiredAt(e.target.value)} />
            {payType !== 'percent' && <p className="text-small text-text-3">Maaş bu gündən hesablanır; ilk ay işlədiyi günlərə görə bölünür.</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label !mb-0">İşdən çıxma tarixi <span className="text-text-3 normal-case font-normal">(ixtiyari)</span></label>
            <input type="date" className="input-mono" value={leftAt} onChange={e => setLeftAt(e.target.value)} />
          </div>
          {payType !== 'salary' && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={payNow} onChange={e => setPayNow(e.target.checked)} className="w-5 h-5 mt-0.5 accent-ink" />
              <span>
                <span className="block text-body font-semibold text-ink">Faiz payı iş tamamlanan gün verilir</span>
                <span className="block text-small text-text-3">Seçilməsə, faiz ustanın hesabına yığılır və "Ödə" ilə verilir.</span>
              </span>
            </label>
          )}
          {error && <p className="text-body text-danger bg-danger-subtle rounded px-3 py-2">{error}</p>}
        </form>
      </Modal>
    </>
  )
}
