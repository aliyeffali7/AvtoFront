import api from '@/lib/axios'
import { Product, SupplierDebt } from '@/types'

export const getProducts = (search?: string) =>
  api.get<Product[]>('/api/products', { params: search ? { search } : undefined })

export const createProduct = (data: Partial<Product> & { order_id?: number; supplier_name?: string }) =>
  api.post<Product & { finance_record_id?: number; supplier_debt_id?: number }>('/api/products', data)

export const updateProduct = (id: number, data: Partial<Product>) =>
  api.patch<Product>(`/api/products/${id}`, data)

export const adjustStock = (id: number, quantity: number) =>
  api.patch<Product>(`/api/products/${id}`, { stock_quantity: quantity })

export const deleteProduct = (id: number) =>
  api.delete(`/api/products/${id}`)

export interface ProductUsage {
  order_id: number
  plate: string
  car: string
  status: 'pending' | 'in_progress' | 'done'
  date: string
  quantity: number
  sell_price: string
}

export const getProductUsage = (id: number) =>
  api.get<ProductUsage[]>(`/api/products/${id}/usage/`)

export const bulkDeleteProducts = (ids: number[]) =>
  api.delete<{ deleted: number; protected: string[] }>('/api/products/bulk-delete/', { data: { ids } })

export const importProductsExcel = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<{ created: number; errors: string[]; detail: string }>('/api/products/import-excel/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const getSupplierNames = () =>
  api.get<string[]>('/api/products/supplier-names/')

export const getSupplierDebts = (showPaid = false) =>
  api.get<SupplierDebt[]>(`/api/products/supplier-debts/?paid=${showPaid}`)

export const createSupplierDebt = (data: {
  supplier_name: string
  phone?: string
  description?: string
  total_amount: number
  date?: string
}) => api.post<SupplierDebt>('/api/products/supplier-debts/', data)

export const paySupplierDebt = (id: number, amount: number) =>
  api.post<SupplierDebt>(`/api/products/supplier-debts/${id}/pay/`, { amount })

export const updateSupplierDebt = (id: number, data: { supplier_name?: string; description?: string; phone?: string }) =>
  api.patch(`/api/products/supplier-debts/${id}/`, data)

export const deleteSupplierDebt = (id: number) =>
  api.delete(`/api/products/supplier-debts/${id}/`)
