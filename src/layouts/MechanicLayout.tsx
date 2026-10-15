import { Outlet } from 'react-router-dom'
import MechanicBottomNav from '@/components/layout/MechanicBottomNav'
import SubscriptionBanner from '@/components/layout/SubscriptionBanner'

export default function MechanicLayout() {
  return (
    <div className="min-h-screen bg-surface-2 pb-[68px] font-sans text-body-l text-text-2">
      <SubscriptionBanner />
      <main className="max-w-xl mx-auto"><Outlet /></main>
      <MechanicBottomNav />
    </div>
  )
}
