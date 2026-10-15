import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ClipboardList, LogOut, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { logout } from '@/services/auth.service'

const TAB_BASE = 'flex-1 flex flex-col items-center justify-center gap-1 text-small font-semibold transition-colors duration-[120ms]'

function Tab({ to, icon: Icon, label, active }: { to: string; icon: LucideIcon; label: string; active: boolean }) {
  return (
    <Link to={to} className={`${TAB_BASE} ${active ? 'text-ink' : 'text-text-3'}`} aria-current={active ? 'page' : undefined}>
      <Icon size={24} strokeWidth={active ? 2 : 1.75} />
      {label}
    </Link>
  )
}

export default function MechanicBottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex items-stretch h-[68px] z-40">
      <Tab to="/mechanic/orders" icon={ClipboardList} label="Sifarişlər" active={pathname.startsWith('/mechanic/orders')} />
      <Tab to="/mechanic/earnings" icon={Wallet} label="Qazancım" active={pathname.startsWith('/mechanic/earnings')} />
      <button type="button" onClick={handleLogout} className={`${TAB_BASE} text-text-3 hover:text-ink`}>
        <LogOut size={24} strokeWidth={1.75} />
        Çıxış
      </button>
    </nav>
  )
}
