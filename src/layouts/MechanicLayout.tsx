import { Outlet } from 'react-router-dom'
import MechanicBottomNav from '@/components/layout/MechanicBottomNav'

export default function MechanicLayout() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main><Outlet /></main>
      <MechanicBottomNav />
    </div>
  )
}
