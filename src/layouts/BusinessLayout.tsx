import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import BusinessSidebar from '@/components/layout/BusinessSidebar'
import SubscriptionBanner from '@/components/layout/SubscriptionBanner'
import ImpersonationBanner from '@/components/layout/ImpersonationBanner'
import ServoLogo from '@/components/ui/ServoLogo'

const PAGE_TITLES: Record<string, string> = {
  '/business/dashboard':    'Ana səhifə',
  '/business/orders':       'Sifarişlər',
  '/business/customers':    'Müştərilər',
  '/business/mechanics':    'Ustalar',
  '/business/warehouse':    'Stok',
  '/business/finance':      'Maliyyə',
  '/business/reservations': 'Rezervasiyalar',
  '/business/stores':       'Tədarükçülər',
  '/business/settings':     'Tənzimləmələr',
}

function getPageTitle(pathname: string) {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path)) return title
  }
  return 'Panel'
}

export default function BusinessLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const pageTitle = getPageTitle(pathname)

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-ink/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 transition-transform duration-[160ms] ease-servo ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <BusinessSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden lg:pl-[232px]">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-3 h-14 bg-ink sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Menyu"
            className="w-10 h-10 flex items-center justify-center rounded-md text-paper hover:bg-ink-up transition-colors"
          >
            <Menu className="w-5 h-5" strokeWidth={1.75} />
          </button>
          <ServoLogo variant="white" className="h-5" />
          <span className="ml-auto text-small text-text-4 truncate">{pageTitle}</span>
        </div>

        <ImpersonationBanner />
        <SubscriptionBanner />
        <main className="flex-1 p-4 lg:px-8 lg:py-6"><Outlet /></main>
      </div>
    </div>
  )
}
