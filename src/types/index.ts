export type Role = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'MECHANIC'

export interface Business {
  id: number
  name: string
  phone?: string
  address?: string
  logo?: string | null
  signature?: string | null
  guarantee_text?: string
  owner_email?: string | null
  login_code?: string | null
  is_subscription_active?: boolean
  trial_ends_at?: string | null
  subscription_ends_at?: string | null
  created_at?: string
}

export interface BusinessAdmin {
  id: number
  name: string
  phone?: string
  address?: string
  owner_email: string | null
  owner_active: boolean | null
  login_code: string | null
  member_count: number
  mechanic_count: number
  order_count: number
  is_subscription_active: boolean
  trial_ends_at: string | null
  subscription_ends_at: string | null
  created_at: string
}

export interface BusinessExpiringSoon extends BusinessAdmin {
  expires_at: string
  days_left: number
}

export interface PlatformPayment {
  id: number
  business: number
  business_name: string
  amount: number
  days_extended: number
  note: string
  recorded_by_email: string | null
  date: string
  created_at: string
}

export interface AdminDashboardStats {
  total_businesses: number
  active_businesses: number
  total_revenue: number
  revenue_this_month: number
  expiring_soon: BusinessExpiringSoon[]
  recent_payments: PlatformPayment[]
}

export interface User {
  id: number
  email: string
  role: Role
  business?: Business
  impersonating?: boolean
}

export interface OrderService {
  id?: number
  name: string
  price: string | number
  mechanic?: number | null
  mechanic_name?: string | null
  mechanic_amount?: string | number | null
}

export interface Order {
  id: number
  number?: number | null
  car_brand: string
  car_model: string
  car_year?: string
  vin_code?: string
  plate_number: string
  mileage?: number | null
  description: string
  estimated_days: number
  mechanic: number | null
  mechanic_name?: string
  mechanic_email?: string
  status: 'pending' | 'in_progress' | 'done'
  payment_status: 'unpaid' | 'partial' | 'paid'
  paid_amount: number
  discount_amount?: number
  products: OrderProduct[]
  services: OrderService[]
  images?: OrderImage[]
  customer?: number | null
  customer_name?: string
  customer_surname?: string
  customer_phone?: string
  notes?: string
  has_guarantee?: boolean
  mileage_unit?: 'km' | 'mil'
  fuel_type?: string
  total?: number
  created_at: string
}

export interface OrderImage {
  id: number
  image: string
  uploaded_at: string
}

export interface OrderProduct {
  id: number
  product: number
  product_name: string
  quantity: number
  sell_price: number
  // null for a MECHANIC-role response — cost data isn't theirs to see.
  purchase_price: number | null
}

export interface Product {
  id: number
  name: string
  code: string
  unit: string
  // Omitted by the API for MECHANIC-role requests (cost data isn't theirs to see).
  purchase_price?: number
  sell_price: number
  discount_percent: number
  stock_quantity: number
  is_warehouse?: boolean
}

export type FinanceCategory = 'parts' | 'salary' | 'rent' | 'utilities' | 'other'

export interface FinanceRecord {
  id: number
  type: 'income' | 'expense'
  category?: FinanceCategory
  amount: number
  description: string
  date: string
  order?: number | null
}

export interface FinanceReport {
  from: string
  to: string
  total_income: number
  total_expense: number
  net: number
  expense_by_category: { category: FinanceCategory; amount: number }[]
  daily: { date: string; income: number; expense: number }[]
}

export interface DebtorOrder {
  id: number
  plate_number: string
  car: string
  status: 'pending' | 'in_progress' | 'done'
  payment_status: 'unpaid' | 'partial' | 'paid'
  total: number
  paid_amount: number
  remaining: number
  date: string
}

export interface DebtorGroup {
  customer_id: number | null
  customer_name: string
  phone: string
  total_charged: number
  paid_amount: number
  remaining: number
  is_paid: boolean
  orders: DebtorOrder[]
}

export interface LowStockData {
  low_stock_count: number
  out_of_stock_count: number
  low_stock: Product[]
  out_of_stock: Product[]
}

export interface DashboardStats {
  today: { income: number; expense: number; net: number }
  low_stock_count: number
  out_of_stock_count: number
  reservations: { total: number; converted: number; no_show: number; conversion_rate: number | null }
  top_customers: { id: number; full_name: string; total_paid: number }[]
  new_customers_this_month: number
  creditors_remaining: number
  debtors_remaining: number
}

export interface Mechanic {
  id: number
  full_name?: string
  phone?: string
  is_active: boolean
  work_percent: number
  total_earnings: number
  image?: string | null
}

export interface PaginatedResponse<T> {
  count: number
  results: T[]
  page: number
  total_pages: number
}

export interface Customer {
  id: number
  full_name: string
  phone: string
  car_brand: string
  car_model: string
  car_year: string
  car_plate: string
  vin_code?: string
  notes?: string
  plates: string[]
  order_count: number
  total_paid: number
  total_debt: number
  last_visit: string | null
  created_at: string
}

export interface CustomerDetail extends Customer {
  orders: Order[]
}

export interface Store {
  id: number
  name: string
  phone?: string
  contact_person?: string
  total_purchased?: number
  created_at: string
}

export interface StorePurchase {
  id: number
  product: number | null
  product_name: string
  quantity: number
  purchase_price: number
  line_total: number
  on_credit: boolean
  debt: number | null
  date: string
}

export interface StorePurchases {
  store: Store
  total_purchased: number
  credit_total: number
  cash_total: number
  purchases: StorePurchase[]
}

export interface MechanicEarnings {
  from: string
  to: string
  total: number
  daily: { date: string; amount: number }[]
}

export interface ManualDebt {
  id: number
  name: string
  amount: number
  paid_amount: number
  remaining: number
  is_paid: boolean
  created_at: string
}

export interface SupplierDebtItem {
  id: number
  product: number | null
  product_name: string
  quantity: number
  purchase_price: number
  line_total: number
  paid_quantity: number
  remaining_quantity: number
  paid_amount: number
  remaining_amount: number
  is_paid: boolean
}

export interface SupplierDebt {
  id: number
  supplier_name: string
  phone: string
  description: string
  total_amount: number
  paid_amount: number
  remaining: number
  is_paid: boolean
  items: SupplierDebtItem[]
  date: string
  created_at: string
}

export type ReservationStatus = 'gozlenilir' | 'sifarise_cevrildi' | 'gelmedi' | 'legv_edildi'

export interface Reservation {
  id: number
  customer_name: string
  customer_phone: string
  plate_number: string
  car_brand: string
  car_model: string
  description: string
  mechanic: number | null
  mechanic_name: string | null
  scheduled_at: string
  status: ReservationStatus
  order: number | null
  created_at: string
}

export interface ReservationStats {
  total: number
  converted: number
  no_show: number
  cancelled: number
  pending: number
  overdue: number
  conversion_rate: number | null
}

export interface LoginCredentials {
  email: string
  password: string
  business_code?: string
}
