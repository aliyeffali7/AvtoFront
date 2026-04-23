import api from '@/lib/axios'
import { Store } from '@/types'

export const getStores = () => api.get<Store[]>('/api/stores')

export const createStore = (data: { name: string; phone?: string; contact_person?: string }) =>
  api.post<Store>('/api/stores', data)

export const updateStore = (id: number, data: { name?: string; phone?: string; contact_person?: string }) =>
  api.patch<Store>(`/api/stores/${id}`, data)

export const deleteStore = (id: number) => api.delete(`/api/stores/${id}`)
