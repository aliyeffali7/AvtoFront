import api from '@/lib/axios'
import { CrmAgenda, Lead, LeadDetail, LeadNote, LeadNoteKind, Referrer, ReferrerDetail } from '@/types'

export type LeadInput = Partial<Omit<Lead, 'id' | 'referrer_name' | 'business_name' | 'last_note' | 'created_at' | 'updated_at'>> & {
  /** pick an existing referrer by name, or create one */
  referrer_name?: string
}

export const getAgenda = () => api.get<CrmAgenda>('/api/crm/agenda/')

export const getLeads = (params: { stage?: string; q?: string; due?: 'today' | 'overdue' } = {}) =>
  api.get<Lead[]>('/api/crm/leads/', { params })

export const getLead = (id: number) => api.get<LeadDetail>(`/api/crm/leads/${id}/`)

/** Create a card; `note` adds its first note (quick capture). */
export const createLead = (data: LeadInput & { note?: string; note_kind?: LeadNoteKind }) =>
  api.post<Lead>('/api/crm/leads/', data)

export const updateLead = (id: number, data: LeadInput) => api.patch<LeadDetail>(`/api/crm/leads/${id}/`, data)

export const deleteLead = (id: number) => api.delete(`/api/crm/leads/${id}/`)

export const addLeadNote = (id: number, text: string, kind: LeadNoteKind) =>
  api.post<LeadNote>(`/api/crm/leads/${id}/notes/`, { text, kind })

export const deleteLeadNote = (noteId: number) => api.delete(`/api/crm/notes/${noteId}/`)

/** Open the card of a registered business, creating it the first time. */
export const leadFromBusiness = (businessId: number) =>
  api.post<{ id: number }>(`/api/crm/from-business/${businessId}/`)

export const getReferrers = () => api.get<Referrer[]>('/api/crm/referrers/')

export const createReferrer = (data: { name: string; phone?: string; note?: string }) =>
  api.post<Referrer>('/api/crm/referrers/', data)

export const getReferrer = (id: number) => api.get<ReferrerDetail>(`/api/crm/referrers/${id}/`)

export const payReferrer = (id: number, amount: number, note?: string) =>
  api.post<ReferrerDetail>(`/api/crm/referrers/${id}/payouts/`, { amount, note })
