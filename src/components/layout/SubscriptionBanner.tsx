import { useEffect, useState } from 'react'
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
  return (
    <div role="status" className={`${tone === 'danger' ? 'bg-danger' : 'bg-warning'} text-cream px-5 py-3 flex items-center gap-3`}>
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        {tone === 'danger' ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        )}
      </svg>
      <p className="text-sm font-medium">{text}</p>
    </div>
  )
}
