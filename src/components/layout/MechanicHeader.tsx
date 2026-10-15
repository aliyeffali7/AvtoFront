import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCurrentUser } from '@/App'
import Avatar from '@/components/ui/Avatar'

/** Ink top bar of the mechanic phone app: title, subtitle, optional back arrow, avatar. */
export default function MechanicHeader({
  title,
  subtitle,
  back = false,
  right,
}: {
  title: ReactNode
  subtitle?: ReactNode
  back?: boolean
  right?: ReactNode
}) {
  const navigate = useNavigate()
  const user = useCurrentUser()
  // Mechanic accounts get a synthetic `{phone}+{id}@mechanic.local` email, so
  // its local part is not a name — show the avatar only for real emails.
  const email = user?.email ?? ''
  const who = email && !email.endsWith('@mechanic.local') ? email.split('@')[0] : ''
  return (
    <header className="bg-ink px-4 py-3 flex items-center gap-3 min-h-[68px]">
      {back && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Geri"
          className="w-11 h-11 -ml-2 flex items-center justify-center rounded text-paper hover:bg-ink-up shrink-0"
        >
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-h3 text-paper truncate">{title}</h1>
        {subtitle && <p className="text-small text-text-4 truncate">{subtitle}</p>}
      </div>
      {right}
      {who && <Avatar name={who} tone="light" size={36} />}
    </header>
  )
}
