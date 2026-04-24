import api from '@/lib/axios'
import { Order, PaginatedResponse } from '@/types'

export const getOrders = (params?: {
  page?: number
  status?: string
  date_from?: string
  date_to?: string
  search?: string
}) => api.get<PaginatedResponse<Order>>('/api/orders', { params })

export const getOrder = (id: number) => api.get<Order>(`/api/orders/${id}`)

export const createOrder = (data: Omit<Partial<Order>, 'products'> & { products?: { product: number; quantity: number }[]; expense_record_ids?: number[] }) =>
  api.post<Order>('/api/orders', data)

export const updateOrder = (id: number, data: Omit<Partial<Order>, 'products' | 'services'> & { products?: { product: number; quantity: number }[]; services?: import('@/types').OrderService[] }) =>
  api.patch<Order>(`/api/orders/${id}`, data)

export const deleteOrder = (id: number) =>
  api.delete(`/api/orders/${id}`)

export const assignMechanic = (orderId: number, mechanicId: number) =>
  api.patch<Order>(`/api/orders/${orderId}`, { mechanic: mechanicId })

export const changeOrderStatus = (
  orderId: number,
  status: 'pending' | 'in_progress' | 'done'
) => api.patch<Order>(`/api/orders/${orderId}`, { status })

export const recordPayment = (orderId: number, paid_amount: number) =>
  api.post<Order>(`/api/orders/${orderId}/payment`, { paid_amount })

export const addProductToOrder = (orderId: number, productId: number, quantity: number) =>
  api.post<Order>(`/api/orders/${orderId}/products`, { product: productId, quantity })

export const removeProductFromOrder = (orderId: number, orderProductId: number) =>
  api.delete<Order>(`/api/orders/${orderId}/products/${orderProductId}`)

export const addServiceToOrder = (orderId: number, name: string, price: number, mechanic?: number | null, mechanic_amount?: number | null) =>
  api.post<Order>(`/api/orders/${orderId}/services`, { name, price, mechanic: mechanic ?? null, mechanic_amount: mechanic_amount ?? null })

export const removeServiceFromOrder = (orderId: number, serviceId: number) =>
  api.delete<Order>(`/api/orders/${orderId}/services/${serviceId}`)

export const uploadOrderImage = (orderId: number, file: File) => {
  const form = new FormData()
  form.append('image', file)
  return api.post<Order>(`/api/orders/${orderId}/images`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const deleteOrderImage = (orderId: number, imageId: number) =>
  api.delete<Order>(`/api/orders/${orderId}/images/${imageId}`)
