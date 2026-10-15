import { Link } from 'react-router-dom'
import {
  Banknote, CheckCircle2, ClipboardList, CreditCard, PackagePlus, Trash2, Undo2, Wrench, type LucideIcon,
} from 'lucide-react'
import { ActivityEvent, ActivityKind } from '@/types'
import Money, { MoneyMeaning } from '@/components/ui/Money'

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

/** One activity line (icon, text, kind · time, amount) linking to its source. Shared by
 * the dashboard card and the Hərəkətlər page. */
export default function ActivityRow({ event, when }: { event: ActivityEvent; when: string }) {
  const kind = KIND[event.kind]
  const Icon = kind.icon
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        to={event.link}
        className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors"
        title={kind.label}
      >
        <span className="w-9 h-9 shrink-0 rounded border border-border bg-surface-2 inline-flex items-center justify-center text-text-2">
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-body text-ink truncate">{event.text}</span>
          <span className="block text-small text-text-3">{kind.label} · <span className="font-mono">{when}</span></span>
        </span>
        {event.amount != null && Number(event.amount) > 0 && (
          <Money value={event.amount} meaning={kind.meaning} className="shrink-0" />
        )}
      </Link>
    </li>
  )
}
