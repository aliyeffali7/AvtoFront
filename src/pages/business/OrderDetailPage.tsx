import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import OrderDetailClient from '@/components/orders/OrderDetailClient'
import OrderForm from '@/components/orders/OrderForm'

/** `/business/orders/:id` shows the order; `/business/orders/new` is the create form. */
export default function OrderDetailPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  if (id) return <OrderDetailClient key={id} />
  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={() => navigate('/business/orders')} className="btn-ghost !min-h-[36px] !px-2 -ml-2 self-start text-text-2">
        <ArrowLeft size={18} strokeWidth={1.75} /> Sifarişlər
      </button>
      <OrderForm
        onDone={orderId => navigate(`/business/orders/${orderId}`, { replace: true })}
        onCancel={() => navigate('/business/orders')}
      />
    </div>
  )
}
