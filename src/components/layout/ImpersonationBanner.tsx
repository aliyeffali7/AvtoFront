import { useState } from 'react'
import { Eye } from 'lucide-react'
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
    <div className="bg-info-subtle text-info-strong border-b border-info/20 px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        <Eye className="w-5 h-5 shrink-0" strokeWidth={1.75} />
        <p className="text-body font-medium">
          SuperAdmin kimi baxırsınız: <strong>{user.business?.name ?? 'bu biznes'}</strong>
        </p>
      </div>
      <button
        onClick={handleReturn}
        disabled={loading}
        className="text-small font-semibold px-3 h-9 rounded-md bg-info-strong text-paper hover:bg-info transition-colors disabled:opacity-40"
      >
        {loading ? '...' : 'Adminə qayıt'}
      </button>
    </div>
  )
}
