import api from '@/lib/axios'
import { Customer, CustomerDetail, PaginatedResponse } from '@/types'

export const getCustomers = (params?: { page?: number; search?: string }) =>
  api.get<PaginatedResponse<Customer>>('/api/customers', { params })

export const getCustomer = (id: number) =>
  api.get<CustomerDetail>(`/api/customers/${id}`)

export const createCustomer = (data: { full_name: string; phone?: string }) =>
  api.post<Customer>('/api/customers', data)

export const updateCustomer = (id: number, data: { full_name?: string; phone?: string }) =>
  api.patch<CustomerDetail>(`/api/customers/${id}`, data)

export const deleteCustomer = (id: number) =>
  api.delete(`/api/customers/${id}`)
