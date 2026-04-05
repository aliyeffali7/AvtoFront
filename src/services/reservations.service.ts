import api from '@/lib/axios'
import { Reservation, ReservationStats } from '@/types'

export const getReservations = () =>
  api.get<Reservation[]>('/api/reservations/')

export const getReservationStats = () =>
  api.get<ReservationStats>('/api/reservations/stats/')

export const createReservation = (data: {
  customer_name?: string
  customer_phone?: string
  plate_number?: string
  car_brand?: string
  car_model?: string
  description?: string
  mechanic?: number | null
  scheduled_at: string
}) => api.post<Reservation>('/api/reservations/', data)

export const updateReservationStatus = (id: number, status: string) =>
  api.patch<Reservation>(`/api/reservations/${id}/`, { status })

export const convertReservation = (id: number) =>
  api.post<{ reservation: Reservation; order_id: number }>(`/api/reservations/${id}/convert/`)

export const deleteReservation = (id: number) =>
  api.delete(`/api/reservations/${id}/`)
