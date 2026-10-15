import { useEffect, useState } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'
import api from '@/lib/axios'
import { SubscriptionStatus } from '@/types'

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr']
const WARN_DAYS = 3

/** "1 oktyabr" / with locative "1 oktyabrda" ("apreldə" — vowel harmony). */
function azDate(iso: string, locative = false) {
  const d = new Date(iso)
  const month = MONTHS[d.getMonth()]
  const suffix = locative ? (month === 'aprel' ? 'də' : 'da') : ''
  return `${d.getDate()} ${month}${suffix}`
}

/** Shown on every page (owner and mechanic), never dismissible: counts down
 * the last days before access ends, then explains read-only mode. */
export default function SubscriptionBanner() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)

  useEffect(() => {
    api.get<SubscriptionStatus>('/api/auth/subscription').then(r => setStatus(r.data)).catch(() => {})
  }, [])

  if (!status) return null

  let tone: 'danger' | 'warning' | null = null
  let text = ''
  if (status.state === 'suspended') {
    tone = 'danger'
    text = 'Hesabınız admin tərəfindən dayandırılıb. Hazırda yalnız baxa bilərsiniz — ətraflı məlumat üçün bizimlə əlaqə saxlayın.'
  } else if (status.state === 'expired') {
    tone = 'danger'
    text = status.ends_at
      ? `Abunəliyinizin müddəti ${azDate(status.ends_at, true)} bitib. Hazırda yalnız baxa bilərsiniz — davam etmək üçün bizimlə əlaqə saxlayın.`
      : 'Abunəliyinizin müddəti bitib. Hazırda yalnız baxa bilərsiniz — davam etmək üçün bizimlə əlaqə saxlayın.'
  } else if (status.ends_at && status.days_left !== null && status.days_left <= WARN_DAYS) {
    tone = 'warning'
    if (status.days_left <= 0) text = 'Abunəliyiniz bu gün bitir.'
    else if (status.days_left === 1) text = `Abunəliyiniz sabah (${azDate(status.ends_at)}) bitir.`
    else text = `Abunəliyiniz ${azDate(status.ends_at, true)} bitir — ${status.days_left} gün qalıb.`
  }

  if (!tone) return null
  const Icon = tone === 'danger' ? AlertTriangle : Clock
  return (
    <div
      role="status"
      className={`${tone === 'danger' ? 'bg-danger-subtle text-danger-strong border-danger/20' : 'bg-warning-subtle text-warning-strong border-warning/20'} border-b px-5 py-3 flex items-center gap-3`}
    >
      <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
      <p className="text-body font-medium">{text}</p>
    </div>
  )
}
