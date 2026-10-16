import api from '@/lib/axios'
import { Order, PaginatedResponse, ServiceTemplate } from '@/types'

export const getOrders = (params?: {
  page?: number
  status?: string
  payment_status?: string
  date_from?: string
  date_to?: string
  search?: string
  all?: string
}) => api.get<PaginatedResponse<Order>>('/api/orders', { params })

export const getOrder = (id: number) => api.get<Order>(`/api/orders/${id}`)

export const createOrder = (data: Omit<Partial<Order>, 'products'> & { products?: { id?: number; product?: number; quantity: number }[]; customer_products?: { name: string; quantity: number }[]; expense_record_ids?: number[] }) =>
  api.post<Order>('/api/orders', data)

export const updateOrder = (id: number, data: Omit<Partial<Order>, 'products' | 'services'> & { products?: { id?: number; product?: number; quantity: number }[]; customer_products?: { name: string; quantity: number }[]; services?: import('@/types').OrderService[]; bought_now_actions?: Record<string, 'cancel_purchase' | 'keep'> }) =>
  api.patch<Order>(`/api/orders/${id}`, data)

/** `boughtNowAction` decides what happens to parts bought just for this order:
 * 'cancel_purchase' undoes those purchases too, 'keep' (default) leaves them in stock. */
export const deleteOrder = (id: number, boughtNowAction?: 'cancel_purchase' | 'keep') =>
  api.delete(`/api/orders/${id}`, { params: boughtNowAction ? { bought_now_action: boughtNowAction } : undefined })

export const assignMechanic = (orderId: number, mechanicId: number) =>
  api.patch<Order>(`/api/orders/${orderId}`, { mechanic: mechanicId })

export const changeOrderStatus = (
  orderId: number,
  status: 'pending' | 'in_progress' | 'done'
) => api.patch<Order>(`/api/orders/${orderId}`, { status })

export const recordPayment = (orderId: number, paid_amount: number, discount_amount?: number) =>
  api.post<Order>(`/api/orders/${orderId}/payment`, {
    paid_amount,
    ...(discount_amount !== undefined && discount_amount > 0 ? { discount_amount } : {}),
  })

export const addProductToOrder = (orderId: number, productId: number, quantity: number) =>
  api.post<Order>(`/api/orders/${orderId}/products`, { product: productId, quantity })

/** "Anbarda yoxdur": buy the part from a store now and put it on the order.
 * An existing product with the same name is reused, not duplicated. */
export const purchaseProductForOrder = (orderId: number, data: {
  name: string
  quantity: number
  purchase_price: number
  sell_price: number
  store_name: string
  on_credit: boolean
  product_id?: number
}) => api.post<Order>(`/api/orders/${orderId}/products/purchase`, data)

export const updateOrderProduct = (orderId: number, orderProductId: number, data: { quantity?: number; sell_price?: number; bought_now_action?: 'cancel_purchase' | 'keep' }) =>
  api.patch<Order>(`/api/orders/${orderId}/products/${orderProductId}`, data)

/** Customer brings a part back after the order was completed. `refund`
 * is what was handed back from Kassa (0 if the order wasn't overpaid). */
export const returnOrderProduct = (orderId: number, orderProductId: number, quantity: number) =>
  api.post<Order & { refund: number }>(`/api/orders/${orderId}/products/${orderProductId}/return`, { quantity })

/** `boughtNowAction` only matters for a part bought just for this order:
 * 'cancel_purchase' also cancels that purchase, 'keep' (default) leaves it. */
export const removeProductFromOrder = (orderId: number, orderProductId: number, boughtNowAction?: 'cancel_purchase' | 'keep') =>
  api.delete<Order>(`/api/orders/${orderId}/products/${orderProductId}`, { params: boughtNowAction ? { bought_now_action: boughtNowAction } : undefined })


export const addServiceToOrder = (orderId: number, name: string, price: number, mechanic?: number | null, mechanic_amount?: number | null, template?: number | null) =>
  api.post<Order>(`/api/orders/${orderId}/services`, { name, price, mechanic: mechanic ?? null, mechanic_amount: mechanic_amount ?? null, template: template ?? null })

export const updateOrderService = (orderId: number, serviceId: number, data: { name: string; price: number; mechanic: number | null; mechanic_amount: number | null; template?: number | null }) =>
  api.patch<Order>(`/api/orders/${orderId}/services/${serviceId}`, data)

export const removeServiceFromOrder = (orderId: number, serviceId: number) =>
  api.delete<Order>(`/api/orders/${orderId}/services/${serviceId}`)

export const uploadOrderImage = (orderId: number, file: File) => {
  const form = new FormData()
  form.append('image', file)
  return api.post<Order>(`/api/orders/${orderId}/images`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
}

export const deleteOrderImage = (orderId: number, imageId: number) =>
  api.delete<Order>(`/api/orders/${orderId}/images/${imageId}`)

// Customer link (/s/<token>): create-or-get, replace, and the public read.
export const shareOrder = (orderId: number) =>
  api.post<{ token: string }>(`/api/orders/${orderId}/share`)

export const resetOrderShare = (orderId: number) =>
  api.post<{ token: string }>(`/api/orders/${orderId}/share/reset`)

export const getPublicOrder = (token: string) =>
  api.get<import('@/types').PublicOrder>(`/api/public/orders/${encodeURIComponent(token)}`)

// "Hazır işlər" (owner only).
export type ServiceTemplateInput = { name: string; price: number; mechanic_amount: number }

export const getServiceTemplates = () =>
  api.get<ServiceTemplate[]>('/api/orders/service-templates/')

export const createServiceTemplate = (data: ServiceTemplateInput) =>
  api.post<ServiceTemplate>('/api/orders/service-templates/', data)

export const updateServiceTemplate = (id: number, data: ServiceTemplateInput) =>
  api.patch<ServiceTemplate>(`/api/orders/service-templates/${id}/`, data)

export const deleteServiceTemplate = (id: number) =>
  api.delete(`/api/orders/service-templates/${id}/`)
