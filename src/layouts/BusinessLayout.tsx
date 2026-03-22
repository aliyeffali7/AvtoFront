import { Outlet } from 'react-router-dom'
import BusinessSidebar from '@/components/layout/BusinessSidebar'
import SubscriptionBanner from '@/components/layout/SubscriptionBanner'

export default function BusinessLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <BusinessSidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <SubscriptionBanner />
        <main className="flex-1"><Outlet /></main>
      </div>
    </div>
  )
}
