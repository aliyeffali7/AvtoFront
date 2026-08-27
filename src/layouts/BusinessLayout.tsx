import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import BusinessSidebar from '@/components/layout/BusinessSidebar'
import SubscriptionBanner from '@/components/layout/SubscriptionBanner'
import ImpersonationBanner from '@/components/layout/ImpersonationBanner'

const PAGE_TITLES: Record<string, string> = {
  '/business/dashboard':    'Dashboard',
  '/business/orders':       'Sifarişlər',
  '/business/customers':    'Müştərilər',
  '/business/mechanics':    'Ustalar',
  '/business/warehouse':    'Anbar',
  '/business/finance':      'Maliyyə',
  '/business/reservations': 'Rezervasiyalar',
  '/business/stores':       'Mağazalar',
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
    <div className="min-h-screen bg-bg flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-ink/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <BusinessSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden lg:pl-72">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-surface border-b border-rule sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded text-ink hover:bg-surface-alt transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-serif font-semibold text-base text-ink">{pageTitle}</span>
        </div>

        <ImpersonationBanner />
        <SubscriptionBanner />
        <main className="flex-1 p-6 lg:p-10"><Outlet /></main>
      </div>
    </div>
  )
}
