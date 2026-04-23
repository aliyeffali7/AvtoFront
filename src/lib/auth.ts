import { JWTPayload, Role } from '@/types'

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_KEY, token)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function decodeJWT(token: string): JWTPayload | null {
  try {
    const payload = token.split('.')[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded) as JWTPayload
  } catch {
    return null
  }
}

export function getRoleFromToken(token: string): Role | null {
  const payload = decodeJWT(token)
  return payload?.role ?? null
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token)
  if (!payload) return true
  return Date.now() >= payload.exp * 1000
}
