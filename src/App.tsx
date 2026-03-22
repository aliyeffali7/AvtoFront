import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getAccessToken, getRefreshToken, isTokenExpired, setAccessToken, clearTokens, getRoleFromToken } from '@/lib/auth'
import api from '@/lib/axios'

import LandingPage from '@/pages/LandingPage'
import BusinessLayout from '@/layouts/BusinessLayout'
import MechanicLayout from '@/layouts/MechanicLayout'
import OrdersPage from '@/pages/business/OrdersPage'
import OrderDetailPage from '@/pages/business/OrderDetailPage'
import MechanicsPage from '@/pages/business/MechanicsPage'
import WarehousePage from '@/pages/business/WarehousePage'
import FinancePage from '@/pages/business/FinancePage'
import DebtsPage from '@/pages/business/DebtsPage'
import MechanicOrdersPage from '@/pages/mechanic/MechanicOrdersPage'
import MechanicOrderDetailPage from '@/pages/mechanic/MechanicOrderDetailPage'
import AdminPage from '@/pages/admin/AdminPage'

function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'fail'>('loading')

  useEffect(() => {
    const access = getAccessToken()
    if (access && !isTokenExpired(access)) {
      setStatus('ok')
      return
    }
    const refresh = getRefreshToken()
    if (!refresh) { setStatus('fail'); return }

    api.post('/api/auth/token/refresh/', { refresh })
      .then(res => {
        setAccessToken(res.data.access)
        setStatus('ok')
      })
      .catch(() => {
        clearTokens()
        setStatus('fail')
      })
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }
  if (status === 'fail') return <Navigate to="/" replace />
  return <>{children}</>
}

function RoleGuard({ role }: { role: string }) {
  const token = getAccessToken()
  const userRole = token ? getRoleFromToken(token) : null
  if (userRole !== role) {
    if (userRole === 'BUSINESS_OWNER') return <Navigate to="/business/orders" replace />
    if (userRole === 'MECHANIC') return <Navigate to="/mechanic/orders" replace />
    if (userRole === 'SUPER_ADMIN') return <Navigate to="/admin" replace />
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<AuthGate><Outlet /></AuthGate>}>
          <Route element={<RoleGuard role="BUSINESS_OWNER" />}>
            <Route element={<BusinessLayout />}>
              <Route path="/business/orders" element={<OrdersPage />} />
              <Route path="/business/orders/:id" element={<OrderDetailPage />} />
              <Route path="/business/mechanics" element={<MechanicsPage />} />
              <Route path="/business/warehouse" element={<WarehousePage />} />
              <Route path="/business/finance" element={<FinancePage />} />
              <Route path="/business/debts" element={<DebtsPage />} />
            </Route>
          </Route>
          <Route element={<RoleGuard role="MECHANIC" />}>
            <Route element={<MechanicLayout />}>
              <Route path="/mechanic/orders" element={<MechanicOrdersPage />} />
              <Route path="/mechanic/orders/:id" element={<MechanicOrderDetailPage />} />
            </Route>
          </Route>
          <Route element={<RoleGuard role="SUPER_ADMIN" />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
