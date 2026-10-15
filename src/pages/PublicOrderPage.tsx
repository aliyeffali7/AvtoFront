import { ReactNode, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Clock, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PublicOrder } from '@/types'
import { getPublicOrder } from '@/services/orders.service'
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils'
import StatusBadge, { StatusTone } from '@/components/ui/StatusBadge'
import Spinner from '@/components/ui/Spinner'
import Plate from '@/components/ui/Plate'
import Money from '@/components/ui/Money'
import ServoLogo from '@/components/ui/ServoLogo'
import { mediaUrl } from '@/lib/apiUrl'

const STATUS: Record<PublicOrder['status'], { label: string; tone: StatusTone; icon: LucideIcon }> = {
  pending: { label: 'Gözləyir', tone: 'info', icon: Clock },
  in_progress: { label: 'İcradadır', tone: 'info', icon: Wrench },
  done: { label: 'Hazırdır', tone: 'success', icon: CheckCircle2 },
}

const PAYMENT_LABEL: Record<PublicOrder['payment_status'], string> = {
  unpaid: 'Ödənilməyib',
  partial: 'Qismən ödənilib',
  paid: 'Ödənilib',
}

/** Customer's read-only view of one order, opened from a WhatsApp link. No login. */
export default function PublicOrderPage() {
  const { token = '' } = useParams()
  const [order, setOrder] = useState<PublicOrder | null>(null)
  const [error, setError] = useState('')

  // Private invoice: keep it out of search engines.
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => { meta.remove() }
  }, [])

  useEffect(() => {
    getPublicOrder(token)
      .then(res => {
        setOrder(res.data)
        document.title = `${res.data.business.name} — Sifariş №${res.data.number}`
      })
      .catch(() => setError('Bu link tapılmadı və ya artıq etibarsızdır. Servislə əlaqə saxlayın.'))
  }, [token])

  if (error) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-4">
        <p className="text-body text-text-2 text-center max-w-sm">{error}</p>
      </main>
    )
  }
  if (!order) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center">
        <Spinner />
      </main>
    )
  }

  const { business } = order
  const car = [order.car_brand, order.car_model, order.car_year].filter(Boolean).join(' ')
  const logo = business.logo && mediaUrl(business.logo)
  const st = STATUS[order.status]

  return (
    <main className="min-h-screen bg-paper px-4 py-6">
      <div className="max-w-[560px] mx-auto flex flex-col gap-4">
        {/* Business header */}
        <header className="flex items-center gap-3">
          {logo && <img src={logo} alt="" className="w-12 h-12 rounded object-contain bg-surface border border-border" />}
          <div className="min-w-0">
            <h1 className="font-display text-h2 text-ink break-words">{business.name}</h1>
            {business.slogan && <p className="text-small text-text-3">{business.slogan}</p>}
          </div>
        </header>

        {/* Order summary */}
        <section className="card p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <Plate value={order.plate_number} size={18} />
            <StatusBadge status={st.label} tone={st.tone} icon={st.icon} />
          </div>
          {car && <p className="font-display text-h3 text-ink">{car}</p>}
          <div className="text-small text-text-3">
            <p>
              <span className="font-mono">Sifariş №{order.number}</span> · {formatDate(order.created_at)}
              {order.mileage != null && <> · <span className="font-mono">{order.mileage.toLocaleString()} {order.mileage_unit}</span></>}
            </p>
            {order.customer_name && <p className="mt-0.5">Müştəri: {order.customer_name}</p>}
          </div>
        </section>

        {(order.description || order.diagnosis || order.recommendations) && (
          <section className="card p-4 flex flex-col gap-4">
            {order.description && <TextBlock label="Müraciət" text={order.description} />}
            {order.diagnosis && <TextBlock label="Diaqnostika nəticəsi" text={order.diagnosis} />}
            {order.recommendations && <TextBlock label="Tövsiyələr" text={order.recommendations} />}
          </section>
        )}

        {/* Lines */}
        {(order.services.length > 0 || order.products.length > 0) && (
          <section className="card p-4 flex flex-col gap-4">
            {order.services.length > 0 && (
              <div>
                <p className="section-label mb-2">Görülən işlər</p>
                <ul className="flex flex-col divide-y divide-border">
                  {order.services.map((s, i) => (
                    <li key={i} className="flex justify-between gap-3 py-2 text-body">
                      <span className="text-text-1 min-w-0">{s.name}</span>
                      <span className="font-mono font-semibold tabular-nums text-text-1 shrink-0">{formatCurrency(s.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {order.products.length > 0 && (
              <div>
                <p className="section-label mb-2">Hissələr</p>
                <ul className="flex flex-col divide-y divide-border">
                  {order.products.map((p, i) => (
                    <li key={i} className="flex justify-between gap-3 py-2 text-body">
                      <span className="text-text-1 min-w-0">
                        {p.name} <span className="text-text-3 font-mono">× {p.quantity}</span>
                        {p.customer_supplied && <span className="text-small text-text-3"> (müştərinin öz hissəsi)</span>}
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-text-1 shrink-0">
                        {p.customer_supplied ? '—' : formatCurrency(Number(p.sell_price) * p.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Totals */}
        <section className="card p-4 flex flex-col gap-2 text-body">
          <Row label="Cəmi" value={<Money value={order.total} />} />
          {Number(order.discount_amount) > 0 && <Row label="Endirim" value={<Money value={-Number(order.discount_amount)} />} />}
          <Row label="Ödənilib" value={<Money value={order.paid_amount} />} />
          <div className="flex justify-between items-center gap-3 pt-3 mt-1 border-t border-border">
            <span className="font-semibold text-text-1">Qalıq</span>
            <span className="flex items-center gap-2 flex-wrap justify-end">
              {order.status === 'done' && <StatusBadge status={PAYMENT_LABEL[order.payment_status]} />}
              <Money value={order.amount_due} className="text-money" />
            </span>
          </div>
        </section>

        {order.has_guarantee && (order.guarantee_text || order.guarantee_exclusions) && (
          <section className="card p-4 flex flex-col gap-4">
            {order.guarantee_text && <TextBlock label="Zəmanət" text={order.guarantee_text} />}
            {order.guarantee_exclusions && <TextBlock label="Zəmanətə daxil deyil" text={order.guarantee_exclusions} />}
          </section>
        )}

        {/* Contact */}
        {(business.phone || business.address || business.instagram) && (
          <section className="card p-4 flex flex-col gap-1.5 text-body">
            {business.phone && <a href={`tel:${business.phone.replace(/[^\d+]/g, '')}`} className="text-ink font-semibold underline underline-offset-2">{formatPhone(business.phone)}</a>}
            {business.address && <p className="text-text-2">{business.address}</p>}
            {business.instagram && (
              <a href={`https://instagram.com/${business.instagram}`} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-2">@{business.instagram}</a>
            )}
          </section>
        )}

        <footer className="flex flex-col items-center gap-1.5 pt-4 pb-2 text-small text-text-3">
          <span>Servo ilə hazırlanıb</span>
          <ServoLogo variant="ink" className="h-3.5" />
        </footer>
      </div>
    </main>
  )
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="section-label mb-1">{label}</p>
      <p className="text-body-l text-text-1 whitespace-pre-line">{text}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <span className="text-text-2">{label}</span>
      {value}
    </div>
  )
}
