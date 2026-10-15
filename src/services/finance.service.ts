import api from '@/lib/axios'
import { FinanceRecord, ManualDebt, FinanceReport, DebtorGroup, DashboardStats, WeeklyIncome, ActivityEvent, ActivityDayPage, OwnerMove } from '@/types'

export interface KassaPage {
  count: number
  page: number
  total_pages: number
  totals: { income: number; income_count: number; expense: number; expense_count: number }
  /** Per-person Sahibkar götürdü / qoydu totals for the range. */
  owner_moves: OwnerMove[]
  /** Names used before on those records (suggestions for "Kim"). */
  owner_people: string[]
  results: FinanceRecord[]
}

/** Kassa records filtered and totalled on the server (100 per page; `all`
 * returns every row in range — for PDF and the day close). */
export const getFinanceRecords = (params: {
  from?: string | null
  to?: string | null
  type?: 'income' | 'expense'
  page?: number
  all?: boolean
}) => api.get<KassaPage>('/api/finance', {
  params: {
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
    ...(params.type ? { type: params.type } : {}),
    ...(params.page ? { page: params.page } : {}),
    ...(params.all ? { all: 'true' } : {}),
  },
})

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

export type DebtorStatus = 'open' | 'paid' | 'all'

export const getDebtors = (status: DebtorStatus = 'open') =>
  api.get<DebtorGroup[]>('/api/finance/debtors/', { params: { status } })

export const getWeeklyIncome = (date: string) =>
  api.get<WeeklyIncome>('/api/finance/weekly-income/', { params: { date } })

export const getDashboardStats = () =>
  api.get<DashboardStats>('/api/finance/dashboard/')

export const getRecentActivity = () =>
  api.get<ActivityEvent[]>('/api/finance/activity/')

/** Every event of one day (YYYY-MM-DD), oldest first, 50 per page. */
export const getActivityDay = (date: string, page = 1) =>
  api.get<ActivityDayPage>('/api/finance/activity/', { params: { date, page } })
