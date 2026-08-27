import { useState } from 'react'
import { useCurrentUser } from '@/App'
import { stopImpersonating } from '@/services/auth.service'

export default function ImpersonationBanner() {
  const user = useCurrentUser()
  const [loading, setLoading] = useState(false)

  if (!user?.impersonating) return null

  async function handleReturn() {
    setLoading(true)
    try {
      await stopImpersonating()
      // Full navigation, not client-side routing — AuthGate only fetches
      // /me once on mount, so a plain navigate() would leave RoleGuard
      // checking the stale (impersonated) role and bounce incorrectly.
      window.location.href = '/admin'
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-ink text-cream px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        <svg className="w-4.5 h-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <p className="text-sm font-medium">
          SuperAdmin kimi baxırsınız: <strong>{user.business?.name ?? 'bu biznes'}</strong>
        </p>
      </div>
      <button
        onClick={handleReturn}
        disabled={loading}
        className="text-xs font-mono font-semibold uppercase tracking-wide px-3 py-2 rounded bg-cream/10 hover:bg-cream/20 transition-colors disabled:opacity-50"
      >
        {loading ? '...' : 'Adminə qayıt'}
      </button>
    </div>
  )
}
