// Lightweight per-browser draft persistence for create forms — so a half-filled
// "Yeni sifariş" / "Yeni müştəri" form survives navigating away (e.g. to Maliyyə)
// and coming back. Drafts live only in this browser's localStorage, are cleared
// on a successful save or an explicit "Ləğv et", and self-expire after a while
// so a long-abandoned draft doesn't resurface weeks later.

const DEFAULT_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000 // 2 days

interface Envelope<T> {
  _ts: number
  data: T
}

export function loadDraft<T>(key: string, maxAgeMs: number = DEFAULT_MAX_AGE_MS): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Envelope<T>
    if (!parsed || typeof parsed !== 'object' || parsed.data == null) return null
    if (parsed._ts && Date.now() - parsed._ts > maxAgeMs) {
      localStorage.removeItem(key)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

export function saveDraft<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ _ts: Date.now(), data } satisfies Envelope<T>))
  } catch {
    /* private mode / quota / disabled storage — a lost draft is acceptable */
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const ORDER_DRAFT_KEY = 'avtoservis:draft:order:v1'
export const CUSTOMER_DRAFT_KEY = 'avtoservis:draft:customer:v1'
