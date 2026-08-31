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

/** Merge Store names with Kreditorlar's own supplier names (SupplierDebt.supplier_name).
 * A debt entered by hand on the Kreditorlar page ("+ Borc yarat") never creates a Store
 * record — it only has a free-text supplier_name — so without this merge, every other
 * "mağaza" picker (order creation, warehouse restock) is blind to suppliers the business
 * owner already considers known, and re-typing that name there creates a *second*,
 * disconnected Store instead of matching the one already used in Kreditorlar. */
export function mergeStoreNames(stores: Store[], supplierDebtNames: string[]): string[] {
  const seen = new Set<string>()
  const merged: string[] = []
  for (const name of [...stores.map(s => s.name), ...supplierDebtNames]) {
    const key = name.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(name)
  }
  return merged.sort((a, b) => a.localeCompare(b))
}
