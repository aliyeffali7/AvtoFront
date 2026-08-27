import api from '@/lib/axios'
import { Mechanic, Order, MechanicEarnings } from '@/types'

export const getMechanics = () => api.get<Mechanic[]>('/api/mechanics')

export const getMechanicOrders = (id: number) =>
  api.get<Order[]>(`/api/mechanics/${id}/orders/`)

export const getMechanicEarnings = (id: number, from: string, to: string) =>
  api.get<MechanicEarnings>(`/api/mechanics/${id}/earnings/`, { params: { from, to } })

type MechanicCreateData = {
  full_name: string
  phone: string
  password: string
  password_confirm: string
  work_percent: number
  image?: File | null
}

type MechanicUpdateData = Partial<Pick<Mechanic, 'full_name' | 'phone' | 'work_percent'>> & {
  image?: File | null
}

function buildMechanicFormData(data: Record<string, unknown>) {
  const form = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (value instanceof File) {
      form.append(key, value)
      return
    }
    form.append(key, String(value))
  })
  return form
}

export const createMechanic = (data: MechanicCreateData) =>
  api.post<Mechanic>('/api/mechanics', buildMechanicFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const updateMechanic = (id: number, data: MechanicUpdateData) =>
  api.patch<Mechanic>(`/api/mechanics/${id}`, buildMechanicFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const deactivateMechanic = (id: number) =>
  api.patch<Mechanic>(`/api/mechanics/${id}`, { is_active: false })

export const activateMechanic = (id: number) =>
  api.patch<Mechanic>(`/api/mechanics/${id}`, { is_active: true })
