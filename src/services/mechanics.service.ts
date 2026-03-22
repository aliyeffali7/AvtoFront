import api from '@/lib/axios'
import { Mechanic } from '@/types'

export const getMechanics = () => api.get<Mechanic[]>('/api/mechanics')

export const createMechanic = (data: { full_name: string; phone: string; password: string; password_confirm: string }) =>
  api.post<Mechanic>('/api/mechanics', data)

export const deactivateMechanic = (id: number) =>
  api.patch<Mechanic>(`/api/mechanics/${id}`, { is_active: false })
