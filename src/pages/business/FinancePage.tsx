import { Outlet, useLocation } from 'react-router-dom'

const TITLES: Record<string, string> = {
  kassa: 'Kassa',
  kreditorlar: 'Kreditorlar',
  debitorlar: 'Debitorlar',
  hesabat: 'Hesabat',
}

export default function FinancePage() {
  const { pathname } = useLocation()
  const segment = pathname.split('/').filter(Boolean).pop() ?? ''
  const title = TITLES[segment] ?? 'Maliyyə'

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="page-title">{title}</h1>
      </div>
      <Outlet />
    </div>
  )
}
