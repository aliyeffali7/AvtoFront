import api from '@/lib/axios'
import {
  Product, SupplierDebt, LowStockData, Purchase, Paginated, StockMovement, ProductCard,
  StockReport, ExcelPreviewRow,
} from '@/types'

export type ProductTab = 'stock' | 'out' | 'order' | 'archived' | 'all'

export const getProducts = (search?: string, tab?: ProductTab) =>
  api.get<Product[]>('/api/products', { params: { ...(search ? { search } : {}), ...(tab ? { tab } : {}) } })

export const lookupProduct = (name: string, code?: string) =>
  api.get<{ match: Product | null }>('/api/products/lookup/', { params: { name, code } })

export const getLowStock = () =>
  api.get<LowStockData>('/api/products/low-stock/')

export const createProduct = (data: Partial<Product> & { store_id?: number; store_name?: string; on_credit?: boolean; force_new?: boolean }) =>
  api.post<Product>('/api/products', data)

export const updateProduct = (id: number, data: Partial<Product>) =>
  api.patch<Product>(`/api/products/${id}`, data)

/** Deletes a product with no history; archives one with history. */
export const deleteProduct = (id: number) =>
  api.delete<{ result: 'deleted' | 'archived' }>(`/api/products/${id}`)

export const bulkDeleteProducts = (ids: number[]) =>
  api.delete<{ deleted: number; archived: number; protected: string[] }>('/api/products/bulk-delete/', { data: { ids } })

export const getProductCard = (id: number) =>
  api.get<ProductCard>(`/api/products/${id}/card/`)

export const writeOffProduct = (id: number, quantity: number, note: string) =>
  api.post<Product>(`/api/products/${id}/write-off/`, { quantity, note })

export const countProduct = (id: number, counted: number, note: string) =>
  api.post<Product>(`/api/products/${id}/count/`, { counted, note })

export const mergeProduct = (id: number, intoId: number) =>
  api.post<Product>(`/api/products/${id}/merge/`, { into_id: intoId })

export type DuplicateProduct = Product & { order_count: number }

/** Groups of the same item entered more than once; first = suggested keeper. */
export const getDuplicates = () =>
  api.get<DuplicateProduct[][]>('/api/products/duplicates/')

export interface ProductUsage {
  order_id: number
  order_number: number
  plate: string
  car: string
  status: 'pending' | 'in_progress' | 'done'
  date: string
  quantity: number
  sell_price: string
}

export const getProductUsage = (id: number) =>
  api.get<ProductUsage[]>(`/api/products/${id}/usage/`)

// ---- purchases (qaimə)

export interface PurchaseLineInput {
  product_id?: number
  name?: string
  code?: string
  unit?: string
  quantity: number
  unit_cost: number | string
  sell_price?: number | string
  low_stock_threshold?: number
}

export interface PurchaseInput {
  store_id?: number
  store_name?: string
  date?: string
  on_credit: boolean
  invoice_no?: string
  note?: string
  source?: 'manual' | 'excel'
  lines: PurchaseLineInput[]
}

export const getPurchases = (params: { page?: number; store?: number; from?: string; to?: string; on_credit?: boolean; search?: string }) =>
  api.get<Paginated<Purchase>>('/api/products/purchases/', { params })

export const getPurchase = (id: number) =>
  api.get<Purchase>(`/api/products/purchases/${id}/`)

export const createPurchase = (data: PurchaseInput) =>
  api.post<Purchase>('/api/products/purchases/', data)

export const cancelPurchase = (id: number) =>
  api.post<Purchase>(`/api/products/purchases/${id}/cancel/`)

export const returnPurchaseLine = (lineId: number, quantity: number) =>
  api.post<Purchase>(`/api/products/purchases/lines/${lineId}/return/`, { quantity })

export const previewExcel = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<{ rows: ExcelPreviewRow[]; errors: string[] }>('/api/products/import-excel/preview/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
}

// ---- ledger & report

export const getMovements = (params: { page?: number; product?: number; kind?: string; store?: number; from?: string; to?: string; search?: string }) =>
  api.get<Paginated<StockMovement>>('/api/products/movements/', { params })

export const getStockReport = (from: string, to: string) =>
  api.get<StockReport>('/api/products/report/', { params: { from, to } })

// ---- kreditor

export const getSupplierDebts = (showPaid = false) =>
  api.get<SupplierDebt[]>(`/api/products/supplier-debts/?paid=${showPaid}`)

export const createSupplierDebt = (data: {
  supplier_name: string
  store_id?: number
  phone?: string
  description?: string
  total_amount: number
  date?: string
}) => api.post<SupplierDebt>('/api/products/supplier-debts/', data)

export const paySupplierDebt = (id: number, amount: number) =>
  api.post<SupplierDebt>(`/api/products/supplier-debts/${id}/pay/`, { amount })

/** Pay selected products across any of the business's debts in one go. */
export const paySupplierItems = (items: { item_id: number; quantity: number }[]) =>
  api.post<SupplierDebt[]>('/api/products/supplier-debts/pay-items/', { items })

export const updateSupplierDebt = (id: number, data: { description?: string; phone?: string }) =>
  api.patch(`/api/products/supplier-debts/${id}/`, data)

export const deleteSupplierDebt = (id: number) =>
  api.delete(`/api/products/supplier-debts/${id}/`)
