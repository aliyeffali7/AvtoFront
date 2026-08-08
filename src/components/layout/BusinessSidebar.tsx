import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { logout, getBusinessProfile } from '@/services/auth.service'
import { Business } from '@/types'
import {
  ClipboardList,
  Users,
  Package,
  Wallet,
  UserCircle,
  AlertTriangle,
  CalendarDays,
  ShoppingCart,
  CreditCard,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/business/orders',       label: 'Sifarişlər',      icon: ClipboardList },
  { href: '/business/customers',    label: 'Müştərilər',      icon: UserCircle },
  { href: '/business/mechanics',    label: 'Ustalar',         icon: Users },
  { href: '/business/warehouse',    label: 'Anbar',           icon: Package },
  { href: '/business/finance',      label: 'Maliyyə',         icon: Wallet },
  { href: '/business/debts',        label: 'Borclar',         icon: AlertTriangle },
  { href: '/business/creditors',    label: 'Kreditorlar',     icon: CreditCard },
  { href: '/business/reservations', label: 'Rezervasiyalar',  icon: CalendarDays },
  { href: '/business/stores',       label: 'Mağazalar',       icon: ShoppingCart },
  { href: '/business/settings',     label: 'Tənzimləmələr',   icon: Settings },
]

export default function BusinessSidebar({ onClose }: { onClose?: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [business, setBusiness] = useState<Business | null>(null)
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    getBusinessProfile().then(r => setBusiness(r.data)).catch(() => {})
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <aside className="w-56 bg-sidebar min-h-screen flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {business?.logo && !logoError ? (
            <img
              src={business.logo.startsWith('http') ? business.logo : (import.meta.env.VITE_API_URL ?? '') + business.logo}
              alt="logo"
              className="w-10 h-10 rounded object-contain shrink-0 bg-cream"
              onError={() => setLogoError(true)}
            />
          ) : null}
          <div className="min-w-0">
            <p className="font-serif font-semibold text-[17px] text-cream leading-tight truncate">
              {business?.name ?? 'Avtoservis CRM'}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded text-ink-muted hover:bg-sidebar-active transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors min-h-[42px] border-l-2 ${
                isActive
                  ? 'bg-sidebar-active text-cream border-sidebar-accent'
                  : 'text-ink-muted hover:bg-sidebar-active/60 hover:text-cream border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.25 : 1.8} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-ink-muted hover:text-cream transition-colors min-h-[42px]"
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          Çıxış
        </button>
      </div>
    </aside>
  )
}
