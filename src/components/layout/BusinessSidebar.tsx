import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { logout, getBusinessProfile } from '@/services/auth.service'
import { Business } from '@/types'
import { useCurrentUser } from '@/App'
import ServoLogo from '@/components/ui/ServoLogo'
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Users,
  Wrench,
  Package,
  Banknote,
  Settings,
  LogOut,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react'
import { mediaUrl } from '@/lib/apiUrl'

interface NavChild {
  href: string
  label: string
}
interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  children?: NavChild[]
}

const stockChildren: NavChild[] = [
  { href: '/business/warehouse/products', label: 'Məhsullar' },
  { href: '/business/warehouse/purchases', label: 'Alışlar' },
  { href: '/business/warehouse/movements', label: 'Hərəkətlər' },
  { href: '/business/stores', label: 'Tədarükçülər' },
  { href: '/business/warehouse/report', label: 'Anbar hesabatı' },
]

const financeChildren: NavChild[] = [
  { href: '/business/finance/kassa', label: 'Kassa' },
  { href: '/business/finance/kreditorlar', label: 'Kreditorlar' },
  { href: '/business/finance/debitorlar', label: 'Debitorlar' },
  { href: '/business/finance/hesabat', label: 'Hesabat' },
]

const navItems: NavItem[] = [
  { href: '/business/dashboard', label: 'Ana səhifə', icon: LayoutDashboard },
  { href: '/business/orders', label: 'Sifarişlər', icon: ClipboardList },
  { href: '/business/reservations', label: 'Rezervasiyalar', icon: CalendarDays },
  { href: '/business/customers', label: 'Müştərilər', icon: Users },
  { href: '/business/mechanics', label: 'Ustalar', icon: Wrench },
  { href: '/business/warehouse', label: 'Stok', icon: Package, children: stockChildren },
  { href: '/business/finance', label: 'Maliyyə', icon: Banknote, children: financeChildren },
  { href: '/business/settings', label: 'Tənzimləmələr', icon: Settings },
]

const rowBase =
  'w-full flex items-center gap-2.5 h-11 px-3 rounded-md border-l-[3px] text-[15px] transition-colors duration-[120ms] ease-servo'
const subBase =
  'flex items-center h-10 pl-[30px] pr-3 rounded-md border-l-[3px] text-sm transition-colors duration-[120ms] ease-servo'

export default function BusinessSidebar({ onClose }: { onClose?: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = useCurrentUser()
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
    const parent = navItems.find(item => item.children?.some(c => pathname.startsWith(c.href)))
    setOpenMenu(parent ? parent.href : null)
  }, [pathname])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <aside className="w-[232px] bg-ink border-r border-ink-up h-screen flex flex-col shrink-0">
      {/* Business (the shop's own brand on top) */}
      <div className="px-4 pt-5 pb-4 flex items-start justify-between gap-2">
        <Link to="/business/dashboard" onClick={onClose} className="flex flex-col gap-3 min-w-0">
          {business?.logo && !logoError ? (
            <img
              src={mediaUrl(business.logo)}
              alt={business.name}
              className="w-24 h-24 rounded-md object-contain bg-paper shrink-0"
              onError={() => setLogoError(true)}
            />
          ) : null}
          <span className="font-display font-semibold text-[17px] leading-tight tracking-[-0.02em] text-paper break-words">
            {business?.name ?? user?.business?.name ?? ''}
          </span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Bağla"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-md text-text-4 hover:bg-ink-up hover:text-paper transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 px-2 py-1 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const hasChildren = !!item.children
          const isChildActive = hasChildren && item.children!.some(c => pathname.startsWith(c.href))
          const isActive = !hasChildren && pathname.startsWith(item.href)
          const isOpen = hasChildren && openMenu === item.href

          if (hasChildren) {
            return (
              <div key={item.href} className="flex flex-col">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenMenu(isOpen ? null : item.href)}
                  className={`${rowBase} border-transparent hover:bg-ink-up hover:text-paper ${
                    isChildActive ? 'text-paper font-semibold' : 'text-text-4 font-normal'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform duration-[160ms] ease-servo ${isOpen ? 'rotate-90' : ''}`}
                    strokeWidth={1.75}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-[max-height] duration-[160ms] ease-servo ${isOpen ? 'max-h-[260px]' : 'max-h-0'}`}
                >
                  <div className="flex flex-col gap-0.5 pt-0.5 pb-1.5">
                    {item.children!.map(child => {
                      const childActive = pathname.startsWith(child.href)
                      return (
                        <Link
                          key={child.href}
                          to={child.href}
                          onClick={onClose}
                          tabIndex={isOpen ? 0 : -1}
                          className={`${subBase} hover:bg-ink-up hover:text-paper ${
                            childActive
                              ? 'bg-ink-up text-paper font-semibold border-signal'
                              : 'text-text-4 font-normal border-transparent'
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
              className={`${rowBase} hover:bg-ink-up hover:text-paper ${
                isActive ? 'bg-ink-up text-paper font-semibold border-signal' : 'text-text-4 font-normal border-transparent'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 p-4 border-t border-ink-up flex flex-col gap-3">
        <p className="text-small text-text-4 truncate">{user?.email}</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 h-9 px-2 -mx-2 rounded-md text-small text-text-4 hover:bg-ink-up hover:text-paper transition-colors duration-[120ms]"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
          Çıxış
        </button>
        {/* Servo brand at the bottom */}
        <div className="pt-3 border-t border-ink-up">
          <ServoLogo variant="white" className="h-8" />
        </div>
      </div>
    </aside>
  )
}
