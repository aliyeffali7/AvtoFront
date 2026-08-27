import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { getCsrfToken, setCsrfToken, setCurrentUser } from '@/lib/auth'

// Empty = use Vite proxy (same origin, no CORS). Set to full URL for production.
const BASE_URL = import.meta.env.VITE_API_URL || ''

const SAFE_METHODS = new Set(['get', 'head', 'options'])
// A 401 from these means "not logged in" / "bad credentials" / "no session to
// refresh" — never something the refresh-and-retry flow below should react to.
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/auth/token/refresh', '/api/auth/logout']

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send/receive the httpOnly access/refresh cookies
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = (config.method || 'get').toLowerCase()
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
  }
  return config
})

let isRefreshing = false
let pendingRequests: Array<() => void> = []

function onRefreshed() {
  pendingRequests.forEach(cb => cb())
  pendingRequests = []
}

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const isAuthEndpoint = !!originalRequest?.url && AUTH_ENDPOINTS.some(p => originalRequest.url!.includes(p))

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise(resolve => {
          pendingRequests.push(() => resolve(api(originalRequest)))
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshResponse = await axios.post<{ csrf_token?: string }>(
          `${BASE_URL}/api/auth/token/refresh`, null, { withCredentials: true }
        )
        if (refreshResponse.data.csrf_token) {
          setCsrfToken(refreshResponse.data.csrf_token)
        }
        onRefreshed()
        return api(originalRequest)
      } catch (refreshErr) {
        const e = refreshErr as AxiosError
        // Only stay logged in on a true network failure (no response at all —
        // offline, timeout, server unreachable). Any actual HTTP response means
        // the refresh attempt reached the server and failed, so log out rather
        // than silently leaving the app in a dead-session state.
        if (e.response) {
          setCurrentUser(null)
          // Avoid a reload loop for a visitor who was never logged in: only
          // force-navigate when we're not already sitting on the landing page.
          if (window.location.pathname !== '/') {
            window.location.replace('/')
          }
        }
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
export { BASE_URL }
