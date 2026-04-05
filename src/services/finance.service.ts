import api from '@/lib/axios'
import { FinanceRecord } from '@/types'

export const getFinanceRecords = () =>
  api.get<FinanceRecord[]>('/api/finance')

export const createFinanceRecord = (data: Partial<FinanceRecord>) =>
  api.post<FinanceRecord>('/api/finance', data)

export const deleteFinanceRecord = (id: number) =>
  api.delete(`/api/finance/${id}`)

export const getDayNote = (date: string) =>
  api.get<{ date: string; note: string }>('/api/finance/note', { params: { date } })

export const saveDayNote = (date: string, note: string) =>
  api.put<{ date: string; note: string }>('/api/finance/note', { note }, { params: { date } })
