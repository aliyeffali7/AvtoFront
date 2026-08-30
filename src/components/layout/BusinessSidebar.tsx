import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { logout, getBusinessProfile } from '@/services/auth.service'
import { Business } from '@/types'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Package,
  Wallet,
  UserCircle,
  CalendarDays,
  ShoppingCart,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react'

const financeChildren = [
  { href: '/business/finance/kassa',       label: 'Kassa' },
  { href: '/business/finance/kreditorlar', label: 'Kreditorlar' },
  { href: '/business/finance/debitorlar',  label: 'Debitorlar' },
  { href: '/business/finance/hesabat',     label: 'Hesabat' },
]

const navItems = [
  { href: '/business/dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/business/orders',       label: 'Sifarişlər',      icon: ClipboardList },
  { href: '/business/customers',    label: 'Müştərilər',      icon: UserCircle },
  { href: '/business/mechanics',    label: 'Ustalar',         icon: Users },
  { href: '/business/warehouse',    label: 'Stok',            icon: Package },
  { href: '/business/finance',      label: 'Maliyyə',         icon: Wallet, children: financeChildren },
  { href: '/business/reservations', label: 'Rezervasiyalar',  icon: CalendarDays },
  { href: '/business/stores',       label: 'Mağazalar',       icon: ShoppingCart },
  { href: '/business/settings',     label: 'Tənzimləmələr',   icon: Settings },
]

export default function BusinessSidebar({ onClose }: { onClose?: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [business, setBusiness] = useState<Business | null>(null)
  const [logoError, setLogoError] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  useEffect(() => {
    getBusinessProfile().then(r => setBusiness(r.data)).catch(() => {})
  }, [])

  // Auto-expand the parent whenever navigation lands on one of its children —
  // but only in reaction to an actual route change, not on every render, so
  // a manual close click (which doesn't itself change the route) sticks
  // instead of being immediately forced back open.
  useEffect(() => {
    const parent = navItems.find(item => 'children' in item && item.children?.some(c => pathname.startsWith(c.href)))
    setOpenMenu(parent ? parent.href : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <aside className="w-72 bg-sidebar min-h-screen flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-6 py-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {business?.logo && !logoError ? (
            <img
              src={business.logo.startsWith('http') ? business.logo : (import.meta.env.VITE_API_URL ?? '') + business.logo}
              alt="logo"
              className="w-24 h-24 rounded object-contain shrink-0 bg-cream"
              onError={() => setLogoError(true)}
            />
          ) : null}
          <div className="min-w-0">
            <p className="font-serif font-semibold text-[17px] text-cream leading-tight truncate">
              {business?.name ?? 'Avtoservis CRM'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleLogout}
            title="Çıxış"
            aria-label="Çıxış"
            className="w-11 h-11 flex items-center justify-center rounded text-ink-muted hover:text-cream hover:bg-sidebar-active transition-colors"
          >
            <LogOut className="w-5 h-5" strokeWidth={1.8} />
          </button>
          {onClose && (
            <button onClick={onClose} aria-label="Bağla" className="lg:hidden w-11 h-11 flex items-center justify-center rounded text-ink-muted hover:bg-sidebar-active transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const hasChildren = 'children' in item && !!item.children
          const isChildActive = hasChildren && item.children!.some(c => pathname.startsWith(c.href))
          const isActive = !hasChildren && pathname.startsWith(item.href)
          const isOpen = hasChildren && openMenu === item.href

          if (hasChildren) {
            return (
              <div key={item.href}>
                <button
                  type="button"
                  onClick={() => setOpenMenu(isOpen ? null : item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors min-h-[42px] border-l-2 ${
                    isChildActive
                      ? 'bg-sidebar-active text-cream border-sidebar-accent'
                      : 'text-ink-muted hover:bg-sidebar-active/60 hover:text-cream border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={isChildActive ? 2.25 : 1.8} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
                </button>
                {/* max-height transition — content stays mounted (no pop-in)
                    and slides open/closed. 220px comfortably fits all 4
                    finance sub-items. */}
                <div className={`overflow-hidden transition-[max-height] duration-200 ease-in-out ${isOpen ? 'max-h-[220px]' : 'max-h-0'}`}>
                  <div className="flex flex-col gap-0.5 mt-0.5 mb-1">
                    {item.children!.map(child => {
                      const childActive = pathname.startsWith(child.href)
                      return (
                        <Link
                          key={child.href}
                          to={child.href}
                          onClick={onClose}
                          className={`flex items-center pl-11 pr-3 py-2 text-sm font-medium transition-colors min-h-[38px] border-l-2 ${
                            childActive
                              ? 'bg-sidebar-active text-cream border-sidebar-accent'
                              : 'text-ink-muted/90 hover:bg-sidebar-active/60 hover:text-cream border-transparent'
                          }`}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          }

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
    </aside>
  )
}
