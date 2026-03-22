import api from '@/lib/axios'
import { Order } from '@/types'

export const getOrders = () => api.get<Order[]>('/api/orders')

export const getOrder = (id: number) => api.get<Order>(`/api/orders/${id}`)

export const createOrder = (data: Omit<Partial<Order>, 'products'> & { products?: { product: number; quantity: number }[] }) =>
  api.post<Order>('/api/orders', data)

export const updateOrder = (id: number, data: Partial<Order>) =>
  api.patch<Order>(`/api/orders/${id}`, data)

export const assignMechanic = (orderId: number, mechanicId: number) =>
  api.patch<Order>(`/api/orders/${orderId}`, { mechanic: mechanicId })

export const changeOrderStatus = (
  orderId: number,
  status: 'pending' | 'in_progress' | 'done'
) => api.patch<Order>(`/api/orders/${orderId}`, { status })

export const recordPayment = (orderId: number, paid_amount: number) =>
  api.post<Order>(`/api/orders/${orderId}/payment`, { paid_amount })

export const addProductToOrder = (
  orderId: number,
  productId: number,
  quantity: number
) =>
  api.post(`/api/orders/${orderId}/products`, {
    product: productId,
    quantity,
  })
