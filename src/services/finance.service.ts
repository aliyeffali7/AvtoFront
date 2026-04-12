import api from '@/lib/axios'
import { FinanceRecord, ManualDebt } from '@/types'

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

export const getManualDebts = () =>
  api.get<ManualDebt[]>('/api/finance/manual-debts/')

export const createManualDebt = (data: { name: string; amount: number }) =>
  api.post<ManualDebt>('/api/finance/manual-debts/', data)

export const payManualDebt = (id: number, amount: number) =>
  api.post<ManualDebt>(`/api/finance/manual-debts/${id}/pay/`, { amount })

export const deleteManualDebt = (id: number) =>
  api.delete(`/api/finance/manual-debts/${id}/`)
