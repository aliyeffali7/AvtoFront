import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PublicOrder } from '@/types'
import { getPublicOrder } from '@/services/orders.service'
import { formatCurrency, formatDate } from '@/lib/utils'
import Badge, { BadgeVariant } from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { mediaUrl } from '@/lib/apiUrl'

const STATUS: Record<PublicOrder['status'], { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Gözləyir', variant: 'warning' },
  in_progress: { label: 'İcradadır', variant: 'accent' },
  done: { label: 'Hazırdır', variant: 'success' },
}

const PAYMENT: Record<PublicOrder['payment_status'], { label: string; variant: BadgeVariant }> = {
  unpaid: { label: 'Ödənilməyib', variant: 'danger' },
  partial: { label: 'Qismən ödənilib', variant: 'warning' },
  paid: { label: 'Ödənilib', variant: 'success' },
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
      <main className="min-h-screen bg-cream flex items-center justify-center px-4">
        <p className="text-sm text-ink-soft text-center max-w-sm">{error}</p>
      </main>
    )
  }
  if (!order) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <Spinner />
      </main>
    )
  }

  const { business } = order
  const car = [order.car_brand, order.car_model, order.car_year].filter(Boolean).join(' ')
  const logo = business.logo && mediaUrl(business.logo)

  return (
    <main className="min-h-screen bg-cream px-4 py-6">
      <div className="max-w-xl mx-auto flex flex-col gap-4">
        {/* Business header */}
        <header className="flex items-center gap-3">
          {logo && <img src={logo} alt="" className="w-12 h-12 rounded object-contain bg-surface border border-rule" />}
          <div className="min-w-0">
            <h1 className="font-serif font-semibold text-2xl text-ink leading-tight">{business.name}</h1>
            {business.slogan && <p className="text-xs text-ink-muted">{business.slogan}</p>}
          </div>
        </header>

        {/* Order summary */}
        <section className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono font-bold text-xl text-ink tracking-wider">{order.plate_number}</p>
              {car && <p className="text-sm text-ink-soft">{car}</p>}
              <p className="text-xs text-ink-muted mt-1">
                Sifariş №{order.number} · {formatDate(order.created_at)}
                {order.mileage != null && <> · {order.mileage.toLocaleString()} {order.mileage_unit}</>}
              </p>
              {order.customer_name && <p className="text-xs text-ink-muted mt-0.5">Müştəri: {order.customer_name}</p>}
            </div>
            <Badge variant={STATUS[order.status].variant}>{STATUS[order.status].label}</Badge>
          </div>
        </section>

        {(order.description || order.diagnosis || order.recommendations) && (
          <section className="card p-4 flex flex-col gap-3">
            {order.description && <TextBlock label="Müraciət" text={order.description} />}
            {order.diagnosis && <TextBlock label="Diaqnostika nəticəsi" text={order.diagnosis} />}
            {order.recommendations && <TextBlock label="Tövsiyələr" text={order.recommendations} />}
          </section>
        )}

        {/* Lines */}
        {(order.services.length > 0 || order.products.length > 0) && (
          <section className="card p-4">
            {order.services.length > 0 && (
              <>
                <p className="section-label mb-2">Görülən işlər</p>
                <ul className="flex flex-col gap-1.5 mb-3">
                  {order.services.map((s, i) => (
                    <li key={i} className="flex justify-between gap-3 text-sm">
                      <span className="text-ink">{s.name}</span>
                      <span className="font-mono text-ink shrink-0">{formatCurrency(s.price)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {order.products.length > 0 && (
              <>
                <p className="section-label mb-2">Hissələr</p>
                <ul className="flex flex-col gap-1.5">
                  {order.products.map((p, i) => (
                    <li key={i} className="flex justify-between gap-3 text-sm">
                      <span className="text-ink">
                        {p.name} <span className="text-ink-muted">× {p.quantity}</span>
                        {p.customer_supplied && <span className="text-xs text-ink-muted"> (müştərinin öz hissəsi)</span>}
                      </span>
                      <span className="font-mono text-ink shrink-0">
                        {p.customer_supplied ? '—' : formatCurrency(Number(p.sell_price) * p.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {/* Totals */}
        <section className="card p-4 flex flex-col gap-1.5 text-sm">
          <Row label="Cəmi" value={formatCurrency(order.total)} />
          {Number(order.discount_amount) > 0 && <Row label="Endirim" value={`−${formatCurrency(order.discount_amount)}`} />}
          <Row label="Ödənilib" value={formatCurrency(order.paid_amount)} />
          <div className="flex justify-between items-center gap-3 pt-2 mt-1 border-t border-rule">
            <span className="font-semibold text-ink">Qalıq</span>
            <span className="flex items-center gap-2">
              {order.status === 'done' && <Badge variant={PAYMENT[order.payment_status].variant}>{PAYMENT[order.payment_status].label}</Badge>}
              <span className="font-mono font-bold text-lg text-ink">{formatCurrency(order.amount_due)}</span>
            </span>
          </div>
        </section>

        {order.has_guarantee && (order.guarantee_text || order.guarantee_exclusions) && (
          <section className="card p-4 flex flex-col gap-3">
            {order.guarantee_text && <TextBlock label="Zəmanət" text={order.guarantee_text} />}
            {order.guarantee_exclusions && <TextBlock label="Zəmanətə daxil deyil" text={order.guarantee_exclusions} />}
          </section>
        )}

        {/* Contact */}
        {(business.phone || business.address || business.instagram) && (
          <section className="card p-4 flex flex-col gap-1.5 text-sm">
            {business.phone && <a href={`tel:${business.phone.replace(/[^\d+]/g, '')}`} className="text-accent font-semibold">{business.phone}</a>}
            {business.address && <p className="text-ink-soft">{business.address}</p>}
            {business.instagram && (
              <a href={`https://instagram.com/${business.instagram}`} target="_blank" rel="noreferrer" className="text-accent">@{business.instagram}</a>
            )}
          </section>
        )}

        <footer className="text-center text-xs text-ink-muted pt-2">Servo ilə hazırlanıb</footer>
      </div>
    </main>
  )
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="section-label mb-1">{label}</p>
      <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-soft">{label}</span>
      <span className="font-mono text-ink">{value}</span>
    </div>
  )
}
