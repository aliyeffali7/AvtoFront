import { Fragment, useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { Business, DebtorGroup, ManualDebt } from '@/types'
import { getBusinessProfile } from '@/services/auth.service'
import { debtReminderMessage, hasWhatsAppNumber, whatsappLink } from '@/lib/whatsapp'
import { DebtorStatus, getDebtors } from '@/services/finance.service'
import { getManualDebts, createManualDebt, payManualDebt, deleteManualDebt } from '@/services/finance.service'
import { recordPayment } from '@/services/orders.service'
import { formatDate, formatCurrency, formatPhone } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import KpiCard from '@/components/ui/KpiCard'
import Modal from '@/components/ui/Modal'
import Money from '@/components/ui/Money'
import PageHeader from '@/components/ui/PageHeader'
import Segmented from '@/components/ui/Segmented'
import Spinner from '@/components/ui/Spinner'
import StatusBadge from '@/components/ui/StatusBadge'

function groupKey(g: DebtorGroup) {
  return g.customer_id != null ? `c${g.customer_id}` : `n${g.customer_name}|${g.phone}`
}

function statusWord(g: DebtorGroup): string {
  if (g.is_paid) return 'Ödənilib'
  if (g.paid_amount > 0) return 'Qismən ödənilib'
  return 'Ödənilməyib'
}

export default function DebitorlarTab() {
  const [debtors, setDebtors] = useState<DebtorGroup[]>([])
  const [business, setBusiness] = useState<Business | null>(null)
  const [manualDebts, setManualDebts] = useState<ManualDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [openDebtors, setOpenDebtors] = useState<DebtorGroup[]>([])
  const [statusFilter, setStatusFilter] = useState<DebtorStatus>('open')

  const [payingOrderId, setPayingOrderId] = useState<number | null>(null)
  const [orderPayInputs, setOrderPayInputs] = useState<Record<number, string>>({})
  const [orderPayErrors, setOrderPayErrors] = useState<Record<number, string>>({})

  const [payingDebtId, setPayingDebtId] = useState<number | null>(null)
  const [debtPayInputs, setDebtPayInputs] = useState<Record<number, string>>({})
  const [debtPayErrors, setDebtPayErrors] = useState<Record<number, string>>({})
  const [confirmDeleteDebtId, setConfirmDeleteDebtId] = useState<number | null>(null)
  const [deletingDebtId, setDeletingDebtId] = useState<number | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // The KPI always reflects what is still owed; the list follows the filter.
      const [openRes, listRes, manualRes] = await Promise.all([
        getDebtors('open'),
        statusFilter === 'open' ? null : getDebtors(statusFilter),
        getManualDebts(),
      ])
      setOpenDebtors(openRes.data)
      setDebtors(listRes ? listRes.data : openRes.data)
      setManualDebts(manualRes.data.filter(d => !d.is_paid))
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { getBusinessProfile().then(res => setBusiness(res.data)).catch(() => {}) }, [])

  const visible = debtors
  const totalUnpaid = openDebtors.reduce((s, g) => s + g.remaining, 0)
  const unpaidCount = openDebtors.length

  async function handleOrderPay(orderId: number, debt: number) {
    const amount = parseFloat(orderPayInputs[orderId] ?? debt.toFixed(2)) || 0
    if (amount <= 0) {
      setOrderPayErrors(prev => ({ ...prev, [orderId]: 'Məbləğ 0-dan böyük olmalıdır.' }))
      return
    }
    if (Math.round(amount * 100) > Math.round(debt * 100)) {
      setOrderPayErrors(prev => ({ ...prev, [orderId]: `Məbləğ qalan borcu (${formatCurrency(debt)}) aşa bilməz.` }))
      return
    }
    setOrderPayErrors(prev => ({ ...prev, [orderId]: '' }))
    setPayingOrderId(orderId)
    try {
      await recordPayment(orderId, amount)
      setOrderPayInputs(prev => { const n = { ...prev }; delete n[orderId]; return n })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Xəta baş verdi.'
      setOrderPayErrors(prev => ({ ...prev, [orderId]: msg }))
    } finally {
      setPayingOrderId(null)
    }
  }

  async function handleDebtPay(debt: ManualDebt) {
    const amount = parseFloat(debtPayInputs[debt.id] ?? debt.remaining.toFixed(2)) || 0
    if (amount <= 0) {
      setDebtPayErrors(prev => ({ ...prev, [debt.id]: 'Məbləğ 0-dan böyük olmalıdır.' }))
      return
    }
    if (amount > debt.remaining + 0.001) {
      setDebtPayErrors(prev => ({ ...prev, [debt.id]: `Məbləğ qalan borcu (${formatCurrency(debt.remaining)}) aşa bilməz.` }))
      return
    }
    setDebtPayErrors(prev => ({ ...prev, [debt.id]: '' }))
    setPayingDebtId(debt.id)
    try {
      await payManualDebt(debt.id, amount)
      setDebtPayInputs(prev => { const n = { ...prev }; delete n[debt.id]; return n })
      load()
    } catch {
      setDebtPayErrors(prev => ({ ...prev, [debt.id]: 'Xəta baş verdi.' }))
    } finally {
      setPayingDebtId(null)
    }
  }

  async function handleDebtDelete(id: number) {
    setDeletingDebtId(id)
    try {
      await deleteManualDebt(id)
      setConfirmDeleteDebtId(null)
      load()
    } finally {
      setDeletingDebtId(null)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    if (!newName.trim()) { setAddError('Ad daxil edin.'); return }
    const amount = parseFloat(newAmount)
    if (!amount || amount <= 0) { setAddError('Düzgün məbləğ daxil edin.'); return }
    setAdding(true)
    try {
      await createManualDebt({ name: newName.trim(), amount })
      setNewName(''); setNewAmount('')
      setAddOpen(false)
      load()
    } catch {
      setAddError('Xəta baş verdi.')
    } finally {
      setAdding(false)
    }
  }

  function renderDetail(g: DebtorGroup) {
    return (
      <div className="px-5 py-5 bg-paper border-b border-border">
        <p className="font-sans text-label uppercase text-text-3 mb-2">Sifarişlər ({g.orders.length})</p>
        <div className="flex flex-col gap-3">
          {g.orders.map(order => (
            <div key={order.id} className={`bg-surface border border-border rounded-md px-4 py-3 ${order.remaining <= 0 ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <Link to={`/business/orders/${order.id}`} className="text-body font-mono font-semibold text-ink hover:underline underline-offset-2">
                    {order.plate_number || `#${order.id}`}
                  </Link>
                  <p className="text-small text-text-3 mt-0.5">{order.car} · {formatDate(order.date)}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end">
                  <Money value={order.total} />
                  {order.paid_amount > 0 && (
                    <span className="text-small font-mono text-success-strong">Ödənilib: {formatCurrency(order.paid_amount)}</span>
                  )}
                  {order.remaining > 0 && (
                    <Money value={order.remaining} meaning="receivable" className="mt-0.5" />
                  )}
                </div>
              </div>
              {order.remaining > 0 && (
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <input
                      type="number" min="0.01" step="0.01"
                      value={orderPayInputs[order.id] ?? order.remaining.toFixed(2)}
                      onChange={e => {
                        setOrderPayInputs(prev => ({ ...prev, [order.id]: e.target.value }))
                        setOrderPayErrors(prev => ({ ...prev, [order.id]: '' }))
                      }}
                      aria-label="Ödəniş məbləği"
                      className={`input-mono pr-8 ${orderPayErrors[order.id] ? '!border-danger' : ''}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3">₼</span>
                  </div>
                  <Button variant="secondary" onClick={() => setOrderPayInputs(prev => ({ ...prev, [order.id]: order.remaining.toFixed(2) }))}>Tam</Button>
                  <Button loading={payingOrderId === order.id} onClick={() => handleOrderPay(order.id, order.remaining)}>Ödə</Button>
                </div>
              )}
              {orderPayErrors[order.id] && <p className="text-small text-danger-strong mt-1.5">{orderPayErrors[order.id]}</p>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Maliyyə · Debitorlar"
        subtitle="Müştərilərin ödəməli olduğu sifariş borcları və digər borclar."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Ümumi debitor borcu"
          value={totalUnpaid}
          money
          meaning="receivable"
          note={`${unpaidCount} müştəri · Alınacaq`}
        />
      </div>

      <Segmented
        label="Filtr"
        value={statusFilter}
        onChange={setStatusFilter}
        options={[
          { key: 'open', label: 'Ödənilməyib' },
          { key: 'paid', label: 'Ödənilib', title: 'Son 90 gündə tam ödənilmiş sifarişlər' },
          { key: 'all', label: 'Hamısı' },
        ]}
      />
      {statusFilter !== 'open' && (
        <p className="text-small text-text-3 -mt-2">Ödənilmiş sifarişlər üçün yalnız son 90 gün göstərilir.</p>
      )}

      {loading && debtors.length === 0 ? (
        <Spinner />
      ) : visible.length === 0 ? (
        statusFilter === 'paid' ? (
          <EmptyState title="Son 90 gündə ödənilmiş sifariş yoxdur" subtitle="Tam ödənilmiş tamamlanmış sifarişlər burada görünəcək." />
        ) : (
          <EmptyState title="Heç bir debitor borcu yoxdur" subtitle="Bütün sifarişlər ödənilib." />
        )
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ledger-table min-w-[860px]">
              <thead>
                <tr>
                  <th className="ledger-th w-8" />
                  <th className="ledger-th">Müştəri</th>
                  <th className="ledger-th">Telefon</th>
                  <th className="ledger-th">Status</th>
                  <th className="ledger-th text-right">Cəmi</th>
                  <th className="ledger-th text-right">Ödənilib</th>
                  <th className="ledger-th text-right">Qalıq</th>
                  <th className="ledger-th" />
                </tr>
              </thead>
              <tbody>
                {visible.map(g => {
                  const key = groupKey(g)
                  const open = selectedKey === key
                  const canRemind = business && g.remaining > 0 && hasWhatsAppNumber(g.phone)
                  return (
                    <Fragment key={key}>
                      <tr onClick={() => setSelectedKey(open ? null : key)} className={`ledger-row ${open ? 'ledger-row-selected' : ''}`}>
                        <td className="ledger-td !pr-0">
                          <ChevronRight size={18} strokeWidth={1.75} className={`text-text-3 transition-transform duration-[160ms] ${open ? 'rotate-90' : ''}`} />
                        </td>
                        <td className="ledger-td">
                          <span className="flex items-center gap-2">
                            <Avatar name={g.customer_name} size={28} />
                            {g.customer_id != null ? (
                              <Link to={`/business/customers/${g.customer_id}`} onClick={e => e.stopPropagation()} className="font-semibold hover:underline underline-offset-2">{g.customer_name}</Link>
                            ) : <span className="font-semibold">{g.customer_name}</span>}
                          </span>
                        </td>
                        <td className="ledger-td font-mono text-text-2">{formatPhone(g.phone) || '—'}</td>
                        <td className="ledger-td"><StatusBadge status={statusWord(g)} /></td>
                        <td className="ledger-td text-right"><Money value={g.total_charged} /></td>
                        <td className="ledger-td text-right"><Money value={g.paid_amount} meaning="income" sign="none" /></td>
                        <td className="ledger-td text-right"><Money value={g.remaining} meaning="receivable" /></td>
                        <td className="ledger-td text-right" onClick={e => e.stopPropagation()}>
                          <span className="inline-flex items-center gap-2">
                            {canRemind && (
                              <a
                                href={whatsappLink(g.phone, debtReminderMessage({ customer_name: g.customer_name, amount: g.remaining }, business))}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-secondary !min-h-[36px] !px-3 !text-small"
                                title="WhatsApp xatırlatma"
                              >
                                <MessageCircle size={16} strokeWidth={1.75} />
                                <span className="hidden xl:inline">WhatsApp xatırlatma</span>
                              </a>
                            )}
                            {g.remaining > 0 && (
                              <Button size="sm" onClick={() => setSelectedKey(key)}>Ödə</Button>
                            )}
                          </span>
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={8} className="p-0">{renderDetail(g)}</td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2">
                  <td className="ledger-td font-semibold" colSpan={4}>Cəmi · {visible.length} müştəri</td>
                  <td className="ledger-td text-right"><Money value={visible.reduce((s, g) => s + g.total_charged, 0)} className="font-bold" /></td>
                  <td className="ledger-td text-right"><Money value={visible.reduce((s, g) => s + g.paid_amount, 0)} meaning="income" sign="none" className="font-bold" /></td>
                  <td className="ledger-td text-right"><Money value={visible.reduce((s, g) => s + g.remaining, 0)} meaning="receivable" className="font-bold" /></td>
                  <td className="ledger-td" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Manual debts */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <h2 className="section-label">Sair borclar</h2>
          <Button variant="secondary" size="sm" icon={Plus} onClick={() => { setAddOpen(true); setAddError('') }}>Borc yarat</Button>
        </div>

        {manualDebts.length === 0 ? (
          <p className="px-5 pb-5 text-body text-text-3">Əl ilə əlavə edilmiş borc yoxdur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger-table min-w-[720px]">
              <thead>
                <tr>
                  <th className="ledger-th">Ad</th>
                  <th className="ledger-th">Tarix</th>
                  <th className="ledger-th text-right">Qalıq</th>
                  <th className="ledger-th">Ödəniş</th>
                </tr>
              </thead>
              <tbody>
                {manualDebts.map(debt => (
                  <tr key={debt.id}>
                    <td className="ledger-td font-semibold">{debt.name}</td>
                    <td className="ledger-td font-mono text-text-2">{formatDate(debt.created_at)}</td>
                    <td className="ledger-td text-right">
                      <div className="flex flex-col items-end">
                        <Money value={debt.remaining} meaning="receivable" />
                        {debt.paid_amount > 0 && <span className="text-small text-text-3">Ödənilib: {formatCurrency(debt.paid_amount)}</span>}
                      </div>
                    </td>
                    <td className="ledger-td">
                      <div className="flex flex-col gap-1.5 items-start">
                        <div className="flex gap-2 items-center">
                          <div className="relative">
                            <input
                              type="number" min="0.01" step="0.01"
                              value={debtPayInputs[debt.id] ?? debt.remaining.toFixed(2)}
                              onChange={e => {
                                setDebtPayInputs(prev => ({ ...prev, [debt.id]: e.target.value }))
                                setDebtPayErrors(prev => ({ ...prev, [debt.id]: '' }))
                              }}
                              aria-label="Ödəniş məbləği"
                              className={`input-mono !min-h-[36px] !py-1 !px-2 text-small w-28 pr-6 ${debtPayErrors[debt.id] ? '!border-danger' : ''}`}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-text-3 text-small">₼</span>
                          </div>
                          <Button variant="secondary" size="sm" onClick={() => setDebtPayInputs(prev => ({ ...prev, [debt.id]: debt.remaining.toFixed(2) }))}>Tam</Button>
                          <Button size="sm" loading={payingDebtId === debt.id} onClick={() => handleDebtPay(debt)}>Ödəniş qeyd et</Button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteDebtId(debt.id)}
                            className="w-9 h-9 inline-flex items-center justify-center rounded text-text-3 hover:text-danger hover:bg-danger-subtle transition-colors shrink-0"
                            aria-label="Borcu sil"
                            title="Borcu sil"
                          >
                            <Trash2 size={18} strokeWidth={1.75} />
                          </button>
                        </div>
                        {debtPayErrors[debt.id] && <p className="text-small text-danger-strong">{debtPayErrors[debt.id]}</p>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={addOpen}
        title="Borc yarat"
        subtitle="Sair borc"
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Ləğv et</Button>
            <Button type="submit" form="manual-debt-form" loading={adding}>Yarat</Button>
          </>
        }
      >
        <form id="manual-debt-form" onSubmit={handleAdd} className="flex flex-col gap-4 pb-2">
          <div>
            <label className="label">Ad</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Məs. Əli Həsənov" className="input" autoFocus />
          </div>
          <div>
            <label className="label">Məbləğ</label>
            <div className="relative">
              <input value={newAmount} onChange={e => setNewAmount(e.target.value)} type="number" min="0.01" step="0.01" placeholder="0.00" className="input-mono pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3">₼</span>
            </div>
          </div>
          {addError && <p className="text-small text-danger-strong bg-danger-subtle rounded px-3 py-2">{addError}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteDebtId !== null}
        title="Borc silinsin?"
        message="Bu borc qeydi silinəcək. Bu əməliyyat geri qaytarıla bilməz."
        confirmLabel={deletingDebtId !== null ? '...' : 'Bəli, sil'}
        cancelLabel="Xeyr"
        danger
        onConfirm={() => confirmDeleteDebtId !== null && handleDebtDelete(confirmDeleteDebtId)}
        onCancel={() => setConfirmDeleteDebtId(null)}
      />
    </div>
  )
}
