import api from '@/lib/axios'
import { Mechanic, Order, MechanicEarnings, MechanicAccount, MechanicPayType } from '@/types'

export const getMechanics = () => api.get<Mechanic[]>('/api/mechanics')

export const getMechanicOrders = (id: number) =>
  api.get<Order[]>(`/api/mechanics/${id}/orders/`)

export const getMechanicEarnings = (id: number, from: string, to: string) =>
  api.get<MechanicEarnings>(`/api/mechanics/${id}/earnings/`, { params: { from, to } })

export const getMyEarnings = (from?: string, to?: string) =>
  api.get<MechanicEarnings>('/api/mechanics/me/earnings/', { params: { from, to } })

export const getMyAccount = () =>
  api.get<MechanicAccount>('/api/mechanics/me/account/')

export const getMechanicAccount = (id: number) =>
  api.get<MechanicAccount>(`/api/mechanics/${id}/account/`)

/** Hand money to a mechanic (goes out of Kassa, lowers what the shop owes). */
export const payMechanic = (id: number, amount: number, note?: string) =>
  api.post<MechanicAccount>(`/api/mechanics/${id}/payout/`, { amount, note })

export const updateMechanicPayTerms = (id: number, data: {
  pay_type: MechanicPayType
  work_percent: number
  salary: number
  hired_at: string | null
  left_at: string | null
  pay_immediately: boolean
}) => api.patch<Mechanic>(`/api/mechanics/${id}`, data)

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
    timeout: 120000,
  })

export const updateMechanic = (id: number, data: MechanicUpdateData) =>
  api.patch<Mechanic>(`/api/mechanics/${id}`, buildMechanicFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })

export const deactivateMechanic = (id: number) =>
  api.patch<Mechanic>(`/api/mechanics/${id}`, { is_active: false })

export const activateMechanic = (id: number) =>
  api.patch<Mechanic>(`/api/mechanics/${id}`, { is_active: true })
