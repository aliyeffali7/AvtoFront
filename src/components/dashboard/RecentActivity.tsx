import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Banknote, CheckCircle2, ClipboardList, CreditCard, PackagePlus, Trash2, Undo2, Wrench, type LucideIcon,
} from 'lucide-react'
import { ActivityEvent, ActivityKind } from '@/types'
import { getRecentActivity } from '@/services/finance.service'
import { toLocalISODate } from '@/lib/utils'
import Money, { MoneyMeaning } from '@/components/ui/Money'
import Spinner from '@/components/ui/Spinner'

const KIND: Record<ActivityKind, { icon: LucideIcon; label: string; meaning: MoneyMeaning }> = {
  order_created: { icon: ClipboardList, label: 'Yeni sifariş', meaning: 'neutral' },
  order_done: { icon: CheckCircle2, label: 'Sifariş tamamlandı', meaning: 'neutral' },
  payment: { icon: Banknote, label: 'Ödəniş alındı', meaning: 'income' },
  purchase: { icon: PackagePlus, label: 'Mal alışı', meaning: 'neutral' },
  supplier_payment: { icon: CreditCard, label: 'Kreditor ödənişi', meaning: 'expense' },
  supplier_return: { icon: Undo2, label: 'Tədarükçüyə qaytarma', meaning: 'neutral' },
  write_off: { icon: Trash2, label: 'Anbar silinməsi', meaning: 'neutral' },
  mechanic_payout: { icon: Wrench, label: 'Usta ödənişi', meaning: 'expense' },
}

/** "14:32" for today, "12.10 14:32" for earlier days. */
function whenLabel(iso: string): string {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (toLocalISODate(d) === toLocalISODate()) return time
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}.${month} ${time}`
}

/** Ana səhifə · Son hərəkətlər — the latest ~10 business events, each linking to its source. */
export default function RecentActivity() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    getRecentActivity()
      .then(res => { if (alive) setEvents(res.data) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  return (
    <section className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="card-title">Son hərəkətlər</h2>
      </div>
      {failed ? (
        <p className="text-body text-text-3 px-5 py-8 text-center">Hərəkətlər yüklənmədi. Səhifəni yeniləyin.</p>
      ) : events === null ? (
        <Spinner />
      ) : events.length === 0 ? (
        <p className="text-body text-text-3 px-5 py-8 text-center">Hələ hərəkət yoxdur. Sifariş və ya alış əlavə etdikdə burada görünəcək.</p>
      ) : (
        <ul>
          {events.map(e => {
            const kind = KIND[e.kind]
            const Icon = kind.icon
            return (
              <li key={e.id} className="border-b border-border last:border-b-0">
                <Link
                  to={e.link}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors"
                  title={kind.label}
                >
                  <span className="w-9 h-9 shrink-0 rounded border border-border bg-surface-2 inline-flex items-center justify-center text-text-2">
                    <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-body text-ink truncate">{e.text}</span>
                    <span className="block text-small text-text-3">{kind.label} · <span className="font-mono">{whenLabel(e.at)}</span></span>
                  </span>
                  {e.amount != null && Number(e.amount) > 0 && (
                    <Money value={e.amount} meaning={kind.meaning} className="shrink-0" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
