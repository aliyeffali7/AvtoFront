import { Store } from '@/types'
import { createStore } from '@/services/stores.service'

/** Resolve a typed store name to a real Store id — reuses an existing store
 * (case-insensitive match) or creates a new one. Returns undefined for a
 * blank name. */
export async function resolveStoreId(stores: Store[], name: string): Promise<number | undefined> {
  const trimmed = name.trim()
  if (!trimmed) return undefined
  const existing = stores.find(s => s.name.toLowerCase() === trimmed.toLowerCase())
  if (existing) return existing.id
  const res = await createStore({ name: trimmed })
  return res.data.id
}
