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
  { href: '/business/warehouse',    label: 'Stok',            icon: Package },
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

  useEffect(() => {
    getBusinessProfile().then(r => setBusiness(r.data)).catch(() => {})
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <aside className="w-60 bg-slate-900 min-h-screen flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {business?.logo ? (
            <img
              src={business.logo.startsWith('http') ? business.logo : (import.meta.env.VITE_API_URL ?? '') + business.logo}
              alt="logo"
              className="w-14 rounded-xl object-contain shrink-0"
            />
          ) : (
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 .001M13 16H9m4 0h2m2 0h1a1 1 0 001-1v-5l-3-4H13" />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-base font-bold text-white leading-tight truncate">{business?.name ?? 'Avtoservis'}</p>
            <p className="text-xs text-slate-500 mt-0.5">CRM Panel</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[42px] group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all min-h-[42px] group"
        >
          <LogOut className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-red-400 transition-colors" strokeWidth={2} />
          Çıxış
        </button>
      </div>
    </aside>
  )
}
