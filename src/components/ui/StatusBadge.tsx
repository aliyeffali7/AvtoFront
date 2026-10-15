import { AlertCircle, AlertTriangle, CheckCircle2, Circle, CircleDot, Clock, PackageCheck, PackageX, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type StatusTone = 'success' | 'warning' | 'danger' | 'info'

/** The nine fixed status words: text is never reworded, colour never travels alone. */
export const STATUS_DEF: Record<string, { tone: StatusTone; icon: LucideIcon }> = {
  'Gözləyir': { tone: 'info', icon: Clock },
  'İcrada': { tone: 'info', icon: Wrench },
  'Tamamlandı': { tone: 'success', icon: CheckCircle2 },
  'Ödənilməyib': { tone: 'danger', icon: AlertCircle },
  'Qismən ödənilib': { tone: 'warning', icon: CircleDot },
  'Ödənilib': { tone: 'success', icon: CheckCircle2 },
  'Stokda': { tone: 'success', icon: PackageCheck },
  'Az qalıb': { tone: 'warning', icon: AlertTriangle },
  'Bitib': { tone: 'danger', icon: PackageX },
}

const TONE_CLASS: Record<StatusTone, string> = {
  success: 'bg-success-subtle text-success-strong',
  warning: 'bg-warning-subtle text-warning-strong',
  danger: 'bg-danger-subtle text-danger-strong',
  info: 'bg-info-subtle text-info-strong',
}

export default function StatusBadge({
  status,
  tone,
  icon,
  className = '',
}: {
  status: string
  tone?: StatusTone
  icon?: LucideIcon
  className?: string
}) {
  const def = STATUS_DEF[status]
  const Icon = icon ?? def?.icon ?? Circle
  return (
    <span className={`badge ${TONE_CLASS[tone ?? def?.tone ?? 'info']} ${className}`}>
      <Icon size={16} strokeWidth={1.75} className="shrink-0" />
      {status}
    </span>
  )
}
