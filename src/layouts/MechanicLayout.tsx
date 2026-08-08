import { Outlet } from 'react-router-dom'
import MechanicBottomNav from '@/components/layout/MechanicBottomNav'

export default function MechanicLayout() {
  return (
    <div className="min-h-screen bg-cream pb-20 font-sans">
      <main><Outlet /></main>
      <MechanicBottomNav />
    </div>
  )
}
