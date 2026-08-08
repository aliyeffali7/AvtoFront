import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Customer, CustomerDetail, Business } from '@/types'
import { getCustomers, getCustomer, updateCustomer, deleteCustomer } from '@/services/customers.service'
import { getBusinessProfile } from '@/services/auth.service'
import { formatCurrency, formatDate, autoFormatSearch } from '@/lib/utils'
import { printOrderPDF, printCustomerPDF } from '@/lib/printOrderPDF'
import StatusBadge from '@/components/orders/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import CustomerForm from './CustomerForm'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { Plus } from 'lucide-react'

function formatLastVisit(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CustomersClient() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [panelMode, setPanelMode] = useState<'empty' | 'view' | 'create' | 'edit'>('empty')
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [customerLoading, setCustomerLoading] = useState(false)
  const [business, setBusiness] = useState<Business | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [notes, setNotes] = useState('')
  const [notesEditing, setNotesEditing] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const loadList = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const res = await getCustomers({ page: p, search: debouncedSearch || undefined })
      setCustomers(res.data.results)
      setTotalPages(res.data.total_pages)
      setTotalCount(res.data.count)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => { loadList(page) }, [page, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { getBusinessProfile().then(r => setBusiness(r.data)).catch(() => {}) }, [])

  const loadCustomer = useCallback(async () => {
    if (!id) return
    setCustomerLoading(true)
    try {
      const res = await getCustomer(parseInt(id))
      setCustomer(res.data)
      setNotes(res.data.notes ?? '')
    } finally {
      setCustomerLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) { setPanelMode('view'); loadCustomer() }
    else if (panelMode === 'view') { setPanelMode('empty'); setCustomer(null) }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  function selectRow(c: Customer) { navigate(`/business/customers/${c.id}`) }
  function startCreate() { navigate('/business/customers'); setCustomer(null); setPanelMode('create') }
  function closePanel() { navigate('/business/customers'); setCustomer(null); setPanelMode('empty') }

  useEffect(() => {
    if (panelMode === 'empty') return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [panelMode]) // eslint-disable-line react-hooks/exhaustive-deps

  function onFormDone(customerId: number) {
    loadList(1); setPage(1)
    navigate(`/business/customers/${customerId}`)
  }

  async function handleDelete() {
    if (!customer) return
    await deleteCustomer(customer.id)
    setDeleteConfirm(false)
    loadList(1); setPage(1)
    closePanel()
  }

  async function saveNotes() {
    if (!customer) return
    setNotesSaving(true)
    try {
      const res = await updateCustomer(customer.id, { notes })
      setCustomer(res.data)
      setNotesEditing(false)
    } finally {
      setNotesSaving(false)
    }
  }

  const mileageHistory = (customer?.orders ?? [])
    .filter(o => o.mileage != null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="page-title">Müştərilər</h1>
        <button onClick={startCreate} className="btn-primary">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Yeni Müştəri
        </button>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(autoFormatSearch(e.target.value))}
          placeholder="Ad, telefon və ya nişan ilə axtar..."
          className="input max-w-sm"
        />
      </div>

      {loading && customers.length === 0 ? <Spinner /> : customers.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? 'Axtarışa uyğun müştəri tapılmadı' : 'Hələ müştəri yoxdur'}
          subtitle={!debouncedSearch ? 'Yeni müştəri əlavə etmək üçün + düyməsini basın.' : undefined}
        />
      ) : (
        <div className="w-full bg-surface border border-rule rounded overflow-hidden flex flex-col lg:flex-row" style={{ maxHeight: 'calc(100vh - 210px)' }}>
          <div className={`overflow-auto ${panelMode === 'empty' ? 'w-full' : 'lg:w-[62%] lg:border-r border-rule'}`}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th className="ledger-th">Müştəri</th>
                  <th className="ledger-th">Nişan</th>
                  <th className="ledger-th">Son ziyarət</th>
                  <th className="ledger-th text-right">Cəmi</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id} onClick={() => selectRow(c)} className={`ledger-row ${customer?.id === c.id ? 'ledger-row-selected' : ''}`}>
                    <td className="ledger-td">
                      <div className="font-medium text-ink">{c.full_name}</div>
                      {c.total_debt > 0 && <div className="text-xs font-mono text-danger">Borc: {formatCurrency(c.total_debt)}</div>}
                    </td>
                    <td className="ledger-td font-mono">{c.car_plate || c.plates[0] || '—'}</td>
                    <td className="ledger-td">{formatLastVisit(c.last_visit)}</td>
                    <td className="ledger-td text-right font-mono font-semibold">{formatCurrency(c.total_paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 py-3 border-t border-rule">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded border border-rule text-ink-muted hover:bg-surface-alt disabled:opacity-40">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)} className={`w-8 h-8 rounded text-sm font-mono ${n === page ? 'bg-accent text-cream' : 'border border-rule text-ink-muted hover:bg-surface-alt'}`}>{n}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded border border-rule text-ink-muted hover:bg-surface-alt disabled:opacity-40">›</button>
              </div>
            )}
          </div>

          {panelMode !== 'empty' && (
          <div className="lg:w-[38%] overflow-auto bg-cream">
            <div className="sticky top-0 z-10 flex justify-end p-2 pointer-events-none">
              <button
                onClick={closePanel}
                title="Bağla (Esc)"
                className="pointer-events-auto w-8 h-8 rounded border border-rule bg-surface text-ink-muted hover:text-ink hover:border-ink flex items-center justify-center shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {panelMode === 'create' && <CustomerForm onDone={onFormDone} onCancel={closePanel} />}
            {panelMode === 'edit' && customer && <CustomerForm customer={customer} onDone={onFormDone} onCancel={() => setPanelMode('view')} />}

            {panelMode === 'view' && customerLoading && <Spinner />}

            {panelMode === 'view' && !customerLoading && customer && (
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-serif font-semibold text-xl text-ink">{customer.full_name}</h2>
                    {customer.phone && <p className="text-sm font-mono text-ink-muted mt-0.5">{customer.phone}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setPanelMode('edit')} className="p-2 rounded border border-rule text-ink-muted hover:bg-surface-alt">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => setDeleteConfirm(true)} className="p-2 rounded border border-danger text-danger hover:bg-danger-bg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                {(customer.car_brand || customer.car_model) && <p className="text-sm text-ink-soft">{[customer.car_brand, customer.car_model, customer.car_year].filter(Boolean).join(' ')}</p>}
                {(customer.car_plate || customer.plates.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {(customer.car_plate ? [customer.car_plate] : customer.plates).map(plate => (
                      <span key={plate} className="px-2 py-0.5 rounded bg-surface-alt text-xs font-mono font-semibold text-ink">{plate}</span>
                    ))}
                  </div>
                )}
                {customer.vin_code && <p className="text-xs font-mono text-ink-muted">VIN: {customer.vin_code}</p>}

                <div className="card grid grid-cols-3 divide-x divide-rule">
                  <div className="px-3 py-2.5">
                    <p className="section-label mb-0.5">Ödənilmiş</p>
                    <p className="text-sm font-mono font-bold text-ink">{formatCurrency(customer.total_paid)}</p>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="section-label mb-0.5">Borc</p>
                    <p className={`text-sm font-mono font-bold ${customer.total_debt > 0 ? 'text-danger' : 'text-ink-muted'}`}>{formatCurrency(customer.total_debt)}</p>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="section-label mb-0.5">Son ziyarət</p>
                    <p className="text-xs font-medium text-ink">{formatLastVisit(customer.last_visit)}</p>
                  </div>
                </div>

                {/* Orders */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="section-label">Sifariş tarixçəsi ({customer.orders.length})</p>
                    {customer.orders.length > 0 && (
                      <button onClick={() => printCustomerPDF(customer, business)} className="text-xs font-semibold text-accent hover:text-accent-hover">Hamısını yüklə</button>
                    )}
                  </div>
                  {customer.orders.length === 0 ? (
                    <p className="text-sm text-ink-muted">Sifariş yoxdur.</p>
                  ) : (
                    <div className="border border-rule rounded overflow-hidden">
                      {customer.orders.map(o => (
                        <div key={o.id} className="flex items-center gap-2 border-b border-rule last:border-0">
                          <Link to={`/business/orders/${o.id}`} className="flex-1 min-w-0 px-3 py-2.5 hover:bg-surface-alt">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-mono font-semibold text-sm text-ink">{o.plate_number}</span>
                              <StatusBadge status={o.status} />
                            </div>
                            <p className="text-xs text-ink-muted">{formatDate(o.created_at)}{o.total != null && o.total > 0 ? ` · ${formatCurrency(o.total)}` : ''}</p>
                          </Link>
                          <button onClick={() => printOrderPDF(o, business)} title="PDF" className="p-2 text-accent hover:bg-surface-alt shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes — inline edit-in-place */}
                <div className="card p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="section-label">Qeydlər</p>
                    {!notesEditing && <button onClick={() => setNotesEditing(true)} className="text-xs font-semibold text-accent hover:text-accent-hover">{notes ? 'Düzəlt' : 'Əlavə et'}</button>}
                  </div>
                  {notesEditing ? (
                    <div className="flex flex-col gap-2">
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} autoFocus placeholder="Müştəri haqqında qeydlər..." className="input resize-none text-sm" />
                      <div className="flex gap-2">
                        <button onClick={saveNotes} disabled={notesSaving} className="btn-primary flex-1 text-sm py-1.5">{notesSaving ? 'Saxlanılır...' : 'Saxla'}</button>
                        <button onClick={() => { setNotesEditing(false); setNotes(customer.notes ?? '') }} className="btn-secondary text-sm py-1.5 px-3">Ləğv et</button>
                      </div>
                    </div>
                  ) : notes ? (
                    <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{notes}</p>
                  ) : (
                    <p className="text-sm text-ink-muted italic">Qeyd yoxdur.</p>
                  )}
                </div>

                {/* Mileage history */}
                {mileageHistory.length > 0 && (
                  <div className="card p-3.5">
                    <p className="section-label mb-1.5">Yürüş tarixi</p>
                    <div className="flex flex-col">
                      {mileageHistory.map((o, i) => (
                        <div key={o.id} className={`flex items-center justify-between py-1.5 ${i < mileageHistory.length - 1 ? 'border-b border-rule' : ''}`}>
                          <div>
                            <p className="text-xs text-ink-muted">{formatDate(o.created_at)}</p>
                            <p className="text-xs font-mono text-ink-muted">{o.plate_number}</p>
                          </div>
                          <span className="text-sm font-mono font-semibold text-ink">{o.mileage!.toLocaleString()} km</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {customer && (
        <ConfirmDialog
          open={deleteConfirm}
          title="Müştərini sil"
          message={`"${customer.full_name}" müştərisi silinsin? Bu əməliyyat geri qaytarıla bilməz.`}
          confirmLabel="Sil"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}
    </>
  )
}
