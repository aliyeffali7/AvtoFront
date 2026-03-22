import { useParams } from 'react-router-dom'
import MechanicOrderDetailClient from '@/components/orders/MechanicOrderDetailClient'

export default function MechanicOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  if (!id) return <div className="p-8"><p className="text-red-600">Sifariş ID tapılmadı.</p></div>
  return <MechanicOrderDetailClient id={id} />
}
