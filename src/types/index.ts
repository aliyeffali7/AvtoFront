export type Role = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'MECHANIC'

export interface User {
  id: number
  email: string
  role: Role
  business?: number
}

export interface OrderService {
  id?: number
  name: string
  price: string | number
  mechanic_amount?: string | number | null
}

export interface Order {
  id: number
  car_brand: string
  car_model: string
  car_year?: string
  vin_code?: string
  plate_number: string
  description: string
  estimated_days: number
  mechanic: number | null
  mechanic_name?: string
  mechanic_email?: string
  status: 'pending' | 'in_progress' | 'done'
  payment_status: 'unpaid' | 'partial' | 'paid'
  paid_amount: number
  products: OrderProduct[]
  services: OrderService[]
  images?: OrderImage[]
  customer?: number | null
  customer_name?: string
  customer_surname?: string
  customer_phone?: string
  notes?: string
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
}

export interface Product {
  id: number
  name: string
  purchase_price: number
  sell_price: number
  stock_quantity: number
}

export interface FinanceRecord {
  id: number
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
}

export interface Mechanic {
  id: number
  full_name?: string
  phone?: string
  is_active: boolean
  work_percent: number
  total_earnings: number
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

export interface SupplierDebt {
  id: number
  supplier_name: string
  description: string
  total_amount: number
  paid_amount: number
  remaining: number
  is_paid: boolean
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
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface JWTPayload {
  user_id: number
  email: string
  role: Role
  exp: number
  iat: number
}
