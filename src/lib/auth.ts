import { User } from '@/types'

// Access/refresh tokens live in httpOnly cookies set directly by the backend
// (accounts.views._set_auth_cookies) — this SPA never sees the raw JWTs, so
// there's nothing here to read/store/decode for them.

const CSRF_COOKIE = 'csrf_token'

// The csrf_token the backend hands back in the login/refresh response body,
// kept in memory. This is the value actually used — a cookie the API set for
// its own host is invisible to document.cookie on a different origin (e.g.
// a Vercel-hosted frontend calling a separate API domain), so relying on the
// cookie alone would silently break CSRF on every real cross-origin deploy.
let csrfToken: string | null = null

export function setCsrfToken(token: string | null): void {
  csrfToken = token
}

export function getCsrfToken(): string | null {
  if (csrfToken) return csrfToken
  // Same-origin (or same-registrable-domain) dev fallback only.
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

// The authenticated user, cached in memory for the lifetime of the page.
// Populated by fetchCurrentUser() (backed by GET /api/auth/me) after login,
// on app boot, and after a successful silent refresh.
let currentUser: User | null = null

export function getCurrentUser(): User | null {
  return currentUser
}

export function setCurrentUser(user: User | null): void {
  currentUser = user
}
