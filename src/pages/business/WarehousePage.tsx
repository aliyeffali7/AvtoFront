import { Outlet } from 'react-router-dom'

/** Stok section frame. Switching between Məhsullar / Alışlar / Hərəkətlər / Anbar hesabatı
 * happens in the sidebar dropdown; each page renders its own PageHeader. */
export default function WarehousePage() {
  return <Outlet />
}
