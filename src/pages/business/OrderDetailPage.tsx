import { useParams } from 'react-router-dom'
import OrderDetailClient from '@/components/orders/OrderDetailClient'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  if (!id) return <div className="p-8"><p className="text-red-600">Sifariş ID tapılmadı.</p></div>
  return <OrderDetailClient id={id} />
}
