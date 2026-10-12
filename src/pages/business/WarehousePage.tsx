import { Outlet, useLocation } from 'react-router-dom'

const TITLES: Record<string, string> = {
  products: 'Məhsullar',
  purchases: 'Alışlar',
  movements: 'Hərəkətlər',
  report: 'Anbar hesabatı',
}

export default function WarehousePage() {
  const { pathname } = useLocation()
  const segment = pathname.split('/').filter(Boolean)[2] ?? ''
  const title = TITLES[segment] ?? 'Stok'

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="page-title">{title}</h1>
      </div>
      <Outlet />
    </div>
  )
}
