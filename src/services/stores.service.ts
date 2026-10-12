import api from '@/lib/axios'
import { Store, StorePurchases } from '@/types'

export const getStores = () => api.get<Store[]>('/api/stores')

export const getStorePurchases = (id: number) =>
  api.get<StorePurchases>(`/api/stores/${id}/purchases/`)

export const createStore = (data: { name: string; phone?: string; contact_person?: string }) =>
  api.post<Store>('/api/stores', data)

export const updateStore = (id: number, data: { name?: string; phone?: string; contact_person?: string }) =>
  api.patch<Store>(`/api/stores/${id}`, data)

export const deleteStore = (id: number) => api.delete(`/api/stores/${id}`)

/** Fold this supplier into another one (duplicates like "Avto ehtiyat" / "Avtoehtiyat"). */
export const mergeStore = (id: number, intoId: number) =>
  api.post<Store>(`/api/stores/${id}/merge/`, { into_id: intoId })
