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
}

export interface Order {
  id: number
  car_brand: string
  car_model: string
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
  customer_name?: string
  customer_surname?: string
  customer_phone?: string
  notes?: string
  created_at: string
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
