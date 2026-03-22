import { useEffect, useState } from 'react'
import api from '@/lib/axios'

interface SubscriptionStatus {
  is_active: boolean
  trial_ends_at: string | null
  subscription_ends_at: string | null
}

export default function SubscriptionBanner() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)

  useEffect(() => {
    api.get<SubscriptionStatus>('/api/auth/subscription').then(r => setStatus(r.data)).catch(() => {})
  }, [])

  if (!status) return null

  // Expired
  if (!status.is_active) {
    return (
      <div className="bg-red-600 text-white px-5 py-3 flex items-center gap-3">
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <p className="text-sm font-medium">
          Abunəliyinizin müddəti bitib. Sistemə tam giriş üçün platforma admini ilə əlaqə saxlayın.
        </p>
      </div>
    )
  }

  // Trial with ≤3 days left
  const endsAt = status.trial_ends_at ?? status.subscription_ends_at
  const daysLeft = endsAt
    ? Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  if (endsAt && daysLeft !== null && daysLeft <= 3 && daysLeft >= 0) {
    return (
      <div className="bg-amber-500 text-white px-5 py-3 flex items-center gap-3">
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-medium">
          Sınaq müddətiniz <strong>{daysLeft} gün</strong> sonra bitir. Davam etmək üçün admini əlaqə saxlayın.
        </p>
      </div>
    )
  }

  return null
}
