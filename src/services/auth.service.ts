import api from '@/lib/axios'
import { setTokens, clearTokens } from '@/lib/auth'
import { LoginCredentials, AuthTokens, Business } from '@/types'

export async function login(credentials: LoginCredentials): Promise<AuthTokens> {
  const response = await api.post<AuthTokens>('/api/auth/login', credentials)
  const { access, refresh } = response.data
  setTokens(access, refresh)
  return response.data
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

export const getBusinessProfile = () =>
  api.get<Business>('/api/auth/business/profile')

export const updateBusinessProfile = (data: FormData) =>
  api.patch<Business>('/api/auth/business/profile', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export async function logout(): Promise<void> {
  try {
    await api.post('/api/auth/logout')
  } catch {
    // ignore
  } finally {
    clearTokens()
  }
}
