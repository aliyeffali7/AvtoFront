import { Outlet } from 'react-router-dom'
import MechanicBottomNav from '@/components/layout/MechanicBottomNav'
import SubscriptionBanner from '@/components/layout/SubscriptionBanner'

export default function MechanicLayout() {
  return (
    <div className="min-h-screen bg-cream pb-20 font-sans">
      <SubscriptionBanner />
      <main><Outlet /></main>
      <MechanicBottomNav />
    </div>
  )
}
