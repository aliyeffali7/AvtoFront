import { Link, useLocation, useNavigate } from 'react-router-dom'
import { logout } from '@/services/auth.service'

export default function MechanicBottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-stretch h-16 shadow-lg z-50">
      <Link
        to="/mechanic/orders"
        className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
          pathname.startsWith('/mechanic/orders') ? 'text-blue-600' : 'text-gray-500'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Sifarişlər
      </Link>

      <div className="w-px bg-gray-100" />

      <button
        onClick={handleLogout}
        className="flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium text-gray-500 hover:text-red-500 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Çıxış
      </button>
    </nav>
  )
}
