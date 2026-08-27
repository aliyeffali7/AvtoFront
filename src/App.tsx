import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { createContext, useContext, useEffect, useState } from 'react'
import { fetchCurrentUserResilient } from '@/services/auth.service'
import { User } from '@/types'

import LandingPage from '@/pages/LandingPage'
import BusinessLayout from '@/layouts/BusinessLayout'
import MechanicLayout from '@/layouts/MechanicLayout'
import DashboardPage from '@/pages/business/DashboardPage'
import OrdersPage from '@/pages/business/OrdersPage'
import OrderDetailPage from '@/pages/business/OrderDetailPage'
import MechanicsPage from '@/pages/business/MechanicsPage'
import WarehousePage from '@/pages/business/WarehousePage'
import FinancePage from '@/pages/business/FinancePage'
import FinanceClient from '@/components/finance/FinanceClient'
import CreditorsPage from '@/pages/business/CreditorsPage'
import DebitorlarTab from '@/components/finance/DebitorlarTab'
import HesabatTab from '@/components/finance/HesabatTab'
import ReservationsPage from '@/pages/business/ReservationsPage'
import CustomersPage from '@/pages/business/CustomersPage'
import CustomerDetailPage from '@/pages/business/CustomerDetailPage'
import SettingsPage from '@/pages/business/SettingsPage'
import StoresPage from '@/pages/business/StoresPage'
import MechanicOrdersPage from '@/pages/mechanic/MechanicOrdersPage'
import MechanicOrderDetailPage from '@/pages/mechanic/MechanicOrderDetailPage'
import AdminPage from '@/pages/admin/AdminPage'

// The access/refresh tokens are httpOnly cookies the SPA can't read, so
// "who's logged in and what's their role" now only comes from the server
// (GET /api/auth/me) — fetched once per app load and shared via context
// rather than decoded out of a JWT sitting in localStorage.
const CurrentUserContext = createContext<User | null>(null)
export function useCurrentUser() {
  return useContext(CurrentUserContext)
}

export function dashboardPathFor(role: string | undefined) {
  if (role === 'BUSINESS_OWNER') return '/business/dashboard'
  if (role === 'MECHANIC') return '/mechanic/orders'
  if (role === 'SUPER_ADMIN') return '/admin'
  return '/'
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'fail'>('loading')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetchCurrentUserResilient()
      .then(u => {
        setUser(u)
        setStatus('ok')
      })
      .catch(() => setStatus('fail'))
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-4 border-rule border-t-accent rounded-full animate-spin" />
      </div>
    )
  }
  if (status === 'fail') return <Navigate to="/" replace />
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>
}

function HomeRedirect() {
  const [status, setStatus] = useState<'loading' | 'authed' | 'anon'>('loading')
  const [role, setRole] = useState<string | undefined>(undefined)

  useEffect(() => {
    fetchCurrentUserResilient()
      .then(u => { setRole(u.role); setStatus('authed') })
      .catch(() => setStatus('anon'))
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-4 border-rule border-t-accent rounded-full animate-spin" />
      </div>
    )
  }
  if (status === 'authed') return <Navigate to={dashboardPathFor(role)} replace />
  return <LandingPage />
}

function RoleGuard({ role }: { role: string }) {
  const user = useCurrentUser()
  if (user?.role !== role) {
    return <Navigate to={dashboardPathFor(user?.role)} replace />
  }
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route element={<AuthGate><Outlet /></AuthGate>}>
          <Route element={<RoleGuard role="BUSINESS_OWNER" />}>
            <Route element={<BusinessLayout />}>
              <Route path="/business/dashboard" element={<DashboardPage />} />
              <Route path="/business/orders" element={<OrdersPage />} />
              <Route path="/business/orders/:id" element={<OrderDetailPage />} />
              <Route path="/business/mechanics" element={<MechanicsPage />} />
              <Route path="/business/warehouse" element={<WarehousePage />} />
              <Route path="/business/finance" element={<FinancePage />}>
                <Route index element={<Navigate to="kassa" replace />} />
                <Route path="kassa" element={<FinanceClient />} />
                <Route path="kreditorlar" element={<CreditorsPage />} />
                <Route path="debitorlar" element={<DebitorlarTab />} />
                <Route path="hesabat" element={<HesabatTab />} />
              </Route>
              <Route path="/business/reservations" element={<ReservationsPage />} />
              <Route path="/business/customers" element={<CustomersPage />} />
              <Route path="/business/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/business/stores" element={<StoresPage />} />
              <Route path="/business/settings" element={<SettingsPage />} />
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
