import { AxiosError } from 'axios'
import api from '@/lib/axios'
import { setCurrentUser, setCsrfToken } from '@/lib/auth'
import { LoginCredentials, User, Business, BusinessAdmin, AdminDashboardStats } from '@/types'

export async function login(credentials: LoginCredentials): Promise<User> {
  const response = await api.post<{ user: User; csrf_token: string }>('/api/auth/login', credentials)
  setCurrentUser(response.data.user)
  setCsrfToken(response.data.csrf_token)
  return response.data.user
}

export async function register(data: {
  email: string
  password: string
  password_confirm: string
  business_name: string
}): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/api/auth/register', data)
  await login({ email: data.email, password: data.password })
  return response.data
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await api.get<User & { csrf_token: string }>('/api/auth/me')
  const { csrf_token, ...user } = response.data
  setCurrentUser(user)
  setCsrfToken(csrf_token)
  return user
}

// Used on app boot (AuthGate/HomeRedirect). A true network failure — offline,
// timeout, server unreachable, no HTTP response at all — might just be a
// transient blip, so it's worth one retry before treating the visitor as
// logged out. An actual response (e.g. 401) means the server was reached and
// said no; no point retrying that.
export async function fetchCurrentUserResilient(): Promise<User> {
  try {
    return await fetchCurrentUser()
  } catch (err) {
    if ((err as AxiosError).response) throw err
    await new Promise(resolve => setTimeout(resolve, 1000))
    return fetchCurrentUser()
  }
}

export const getBusinessProfile = () =>
  api.get<Business>('/api/auth/business/profile')

export const updateBusinessProfile = (data: FormData) =>
  api.patch<Business>('/api/auth/business/profile', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const requestPasswordReset = (email: string) =>
  api.post<{ detail: string }>('/api/auth/password-reset/request', { email })

export const confirmPasswordReset = (data: {
  email: string
  code: string
  new_password: string
  new_password_confirm: string
}) => api.post<{ detail: string }>('/api/auth/password-reset/confirm', data)

// --- SuperAdmin panel ---

export const getBusinesses = () =>
  api.get<BusinessAdmin[]>('/api/auth/businesses')

export const getAdminDashboard = () =>
  api.get<AdminDashboardStats>('/api/auth/admin/dashboard')

export const extendSubscription = (businessId: number, days: number, amount?: string, note?: string) =>
  api.post<BusinessAdmin>(`/api/auth/businesses/${businessId}/extend`, {
    days,
    ...(amount ? { amount } : {}),
    ...(note ? { note } : {}),
  })

export const toggleBusinessActive = (businessId: number) =>
  api.post<BusinessAdmin>(`/api/auth/businesses/${businessId}/toggle-active`)

export const resetOwnerPassword = (businessId: number) =>
  api.post<{ detail: string }>(`/api/auth/businesses/${businessId}/reset-owner-password`)

export async function impersonateBusiness(businessId: number): Promise<User> {
  const response = await api.post<{ user: User; impersonating: boolean; csrf_token: string }>(
    `/api/auth/businesses/${businessId}/impersonate`
  )
  setCurrentUser({ ...response.data.user, impersonating: response.data.impersonating })
  setCsrfToken(response.data.csrf_token)
  return response.data.user
}

export async function stopImpersonating(): Promise<User> {
  const response = await api.post<{ user: User; csrf_token: string }>('/api/auth/stop-impersonating')
  setCurrentUser(response.data.user)
  setCsrfToken(response.data.csrf_token)
  return response.data.user
}

export async function logout(): Promise<void> {
  setCurrentUser(null)
  setCsrfToken(null)
  try {
    await api.post('/api/auth/logout')
  } catch {
    // Cookies may already be expired/invalid — logging out client-side still
    // succeeds regardless of whether the server-side blacklist call landed.
  }
}
