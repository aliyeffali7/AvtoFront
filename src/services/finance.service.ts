import api from '@/lib/axios'
import { FinanceRecord } from '@/types'

export const getFinanceRecords = () =>
  api.get<FinanceRecord[]>('/api/finance')

export const createFinanceRecord = (data: Partial<FinanceRecord>) =>
  api.post<FinanceRecord>('/api/finance', data)
