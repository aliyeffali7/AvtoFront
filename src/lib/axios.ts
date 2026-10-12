import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { getCsrfToken, setCsrfToken, setCurrentUser } from '@/lib/auth'
import { API_BASE_URL } from '@/lib/apiUrl'


const SAFE_METHODS = new Set(['get', 'head', 'options'])
// A 401 from these means "not logged in" / "bad credentials" / "no session to
// refresh" — never something the refresh-and-retry flow below should react to.
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/auth/token/refresh', '/api/auth/logout']

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send/receive the httpOnly access/refresh cookies
  // Without a limit a request to a stuck server never settles and its
  // spinner/button stays busy forever. Long uploads override this per call.
  timeout: 30000,
})

const CSRF_ERROR_DETAIL = 'CSRF token missing or invalid.'

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
let pendingRequests: Array<{ retry: () => void; fail: (err: unknown) => void }> = []

// Every request that queued up behind an in-flight refresh must be settled
// either way — leaving them pending on a failed refresh is what froze pages.
function settlePending(err: unknown | null) {
  const queued = pendingRequests
  pendingRequests = []
  queued.forEach(p => (err ? p.fail(err) : p.retry()))
}

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _csrfRetry?: boolean }
    const isAuthEndpoint = !!originalRequest?.url && AUTH_ENDPOINTS.some(p => originalRequest.url!.includes(p))

    // Stale CSRF token (e.g. another tab re-seeded it): fetch the current one
    // via /me and replay the request once instead of surfacing the error.
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail
    if (error.response?.status === 403 && detail === CSRF_ERROR_DETAIL && originalRequest && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true
      try {
        const me = await axios.get<{ csrf_token?: string }>(`${API_BASE_URL}/api/auth/me`, { withCredentials: true })
        if (me.data.csrf_token) setCsrfToken(me.data.csrf_token)
        return api(originalRequest)
      } catch {
        return Promise.reject(error)
      }
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({ retry: () => resolve(api(originalRequest)), fail: reject })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshResponse = await axios.post<{ csrf_token?: string }>(
          `${API_BASE_URL}/api/auth/token/refresh`, null, { withCredentials: true }
        )
        if (refreshResponse.data.csrf_token) {
          setCsrfToken(refreshResponse.data.csrf_token)
        }
        isRefreshing = false
        settlePending(null)
        return api(originalRequest)
      } catch (refreshErr) {
        const e = refreshErr as AxiosError
        isRefreshing = false
        settlePending(error)
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
      }
    }

    return Promise.reject(error)
  }
)

export default api
