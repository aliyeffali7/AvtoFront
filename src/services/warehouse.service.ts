import api from '@/lib/axios'
import { Product } from '@/types'

export const getProducts = () => api.get<Product[]>('/api/products')

export const createProduct = (data: Partial<Product>) =>
  api.post<Product>('/api/products', data)

export const updateProduct = (id: number, data: Partial<Product>) =>
  api.patch<Product>(`/api/products/${id}`, data)

export const adjustStock = (id: number, quantity: number) =>
  api.patch<Product>(`/api/products/${id}`, { stock_quantity: quantity })
