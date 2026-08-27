import api from '@/lib/axios'
import { FinanceRecord, ManualDebt, FinanceReport, DebtorGroup, DashboardStats } from '@/types'

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

export const getFinanceReport = (from: string, to: string) =>
  api.get<FinanceReport>('/api/finance/report/', { params: { from, to } })

export const getDebtors = () =>
  api.get<DebtorGroup[]>('/api/finance/debtors/')

export const getDashboardStats = () =>
  api.get<DashboardStats>('/api/finance/dashboard/')
