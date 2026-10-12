/**
 * The one place the backend's address is read. Empty (the default) means
 * same-origin relative URLs (`/api/…`, `/media/…`): the Vite dev proxy
 * forwards them locally, `vercel.json` rewrites them in production. Set
 * `VITE_API_URL` only to call a backend on another origin directly.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || ''

/** URL of a backend file (logo, photo); absolute URLs pass through unchanged. */
export function mediaUrl(path: string) {
  return /^https?:\/\//.test(path) ? path : `${API_BASE_URL}${path}`
}
