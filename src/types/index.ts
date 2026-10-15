export type Role = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'MECHANIC'

export interface Business {
  id: number
  name: string
  phone?: string
  address?: string
  logo?: string | null
  signature?: string | null
  guarantee_text?: string
  // One exclusion per line; printed beside the guarantee on the order PDF.
  guarantee_exclusions?: string
  slogan?: string
  // Bare handle, no "@" — the backend strips URLs and "@".
  instagram?: string
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
  is_suspended: boolean
  access_state: AccessState
  access_ends_at: string | null
  crm_lead_id: number | null
  created_at: string
}

export type AccessState = 'active' | 'suspended' | 'expired'

export interface SubscriptionStatus {
  is_active: boolean
  state: AccessState
  read_only: boolean
  ends_at: string | null
  days_left: number | null
}

export type LeadStage = 'prospect' | 'interested' | 'demo' | 'trial' | 'customer' | 'lost'
export type LeadSource = '' | 'visit' | 'referral' | 'instagram' | 'customer' | 'other'
export type LeadObjection = 'expensive' | 'excel_enough' | 'no_time' | 'other_software' | 'mechanics_against' | 'not_needed'
export type LeadNoteKind = 'visit' | 'call' | 'whatsapp' | 'note'

export interface LeadNote {
  id: number
  kind: LeadNoteKind
  text: string
  created_at: string
}

export interface Lead {
  id: number
  name: string
  contact_person: string
  phone: string
  district: string
  address: string
  stage: LeadStage
  next_action_date: string | null
  next_action: string
  offered_price: number | null
  source: LeadSource
  objections: LeadObjection[]
  referrer: number | null
  referrer_name: string | null
  commission_percent: number
  business: number | null
  business_name: string | null
  /** paid subscription end of the linked business */
  paid_until: string | null
  last_note: LeadNote | null
  created_at: string
  updated_at: string
}

export interface BusinessHealth {
  business_id: number
  business_name: string
  access_state: AccessState
  ends_at: string | null
  days_left: number | null
  last_activity: string | null
  orders_14d: number
  risk: string[]
}

export interface ReferralCommission {
  id: number
  lead: number | null
  lead_name: string | null
  payment_amount: number
  payment_date: string
  /** how many days that payment covered (30, 90, 365…) */
  payment_days: number
  percent: number
  amount: number
  created_at: string
}

export interface LeadDetail extends Lead {
  notes: LeadNote[]
  health: BusinessHealth | null
  commissions: ReferralCommission[]
}

export interface CrmAgenda {
  today: Lead[]
  overdue: Lead[]
  at_risk: { lead: Lead; health: BusinessHealth }[]
  objections: [LeadObjection, number][]
  stages: Partial<Record<LeadStage, number>>
}

export interface Referrer {
  id: number
  name: string
  phone: string
  note: string
  created_at: string
  earned: number
  paid: number
  owed: number
  lead_count?: number
}

export interface ReferrerDetail extends Referrer {
  leads: Lead[]
  commissions: ReferralCommission[]
  payouts: { id: number; amount: number; date: string; note: string; created_at: string }[]
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
  // Mechanic-role responses only: is this job assigned to the viewer.
  is_mine?: boolean
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
  diagnosis?: string
  recommendations?: string
  // Day the order was booked as done ("Təhvil tarixi"); null while open.
  completed_on?: string | null
  mileage_unit?: 'km' | 'mil'
  fuel_type?: string
  total?: number
  // Gross − discount − paid, computed by the backend (never negative).
  amount_due?: number
  created_at: string
}

export interface OrderImage {
  id: number
  image: string
  uploaded_at: string
}

export interface OrderProduct {
  id: number
  // null for a part the customer brought (source 'customer') or a deleted product.
  product: number | null
  product_name: string
  // 'customer' = brought by the customer: no price, no stock movement.
  source: 'service' | 'customer'
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
  is_archived?: boolean
  low_stock_threshold?: number
}

export type FinanceCategory =
  | 'parts' | 'salary' | 'rent' | 'utilities' | 'other'
  | 'cogs' | 'write_off' | 'service' | 'parts_sale' | 'discount' | 'goods_purchase'
  | 'owner_draw' | 'owner_deposit'

export type FinanceSource =
  | 'manual' | 'order_completion' | 'order_payment' | 'discount' | 'purchase'
  | 'supplier_payment' | 'supplier_return' | 'write_off' | 'debtor_payment'
  | 'salary' | 'mechanic_payout' | 'customer_return' | 'customer_refund'

export interface FinanceRecord {
  id: number
  type: 'income' | 'expense'
  category?: FinanceCategory
  amount: number
  description: string
  date: string
  order?: number | null
  purchase?: number | null
  /** Mechanic (user id) a salary / payout record belongs to. */
  mechanic?: number | null
  source?: FinanceSource
}

export interface FinanceReport {
  from: string
  to: string
  total_income: number
  total_expense: number
  net: number
  income_by_category: { category: FinanceCategory; amount: number }[]
  expense_by_category: { category: FinanceCategory; amount: number }[]
  daily: { date: string; income: number; expense: number }[]
  movements: {
    purchases_cash: number
    purchases_credit: number
    supplier_payments: number
    customer_payments: number
    cash_in: number
    cash_out: number
    owner_draws: number
    owner_deposits: number
  }
  balances: { stock_value: number; creditors: number; debtors: number }
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

export interface WeeklyIncome {
  week_start: string
  week_end: string
  total: number
  previous_total: number
  change_percent: number | null
  days: { date: string; total: number; is_today: boolean; is_future: boolean }[]
}

export interface DashboardStats {
  today: { income: number; expense: number; net: number }
  active_orders_count: number
  debtor_customers_count: number
  in_stock_count: number
  weekly_income: WeeklyIncome
  /** Real Kassa (all cash records), goods spend as its own series */
  kassa_14d: { daily: { date: string; income: number; expense: number; goods: number }[]; income: number; expense: number; goods: number; net: number }
  low_stock_count: number
  out_of_stock_count: number
  reservations: { total: number; converted: number; no_show: number; conversion_rate: number | null }
  top_customers: { id: number; full_name: string; total_paid: number }[]
  new_customers_this_month: number
  creditors_remaining: number
  debtors_remaining: number
}

export type MechanicPayType = 'percent' | 'salary' | 'mixed'

export interface Mechanic {
  id: number
  full_name?: string
  phone?: string
  is_active: boolean
  work_percent: number
  total_earnings: number
  image?: string | null
  pay_type?: MechanicPayType
  salary?: number
  hired_at?: string | null
  left_at?: string | null
  pay_immediately?: boolean
  balance?: number
}

export interface MechanicAccount {
  earned: number
  paid: number
  balance: number
  this_month_salary: number
  months: { month: string; earned: number; paid: number }[]
  entries: {
    id: number
    date: string
    amount: number
    description: string
    source: string
    order: number | null
    earned: boolean
    paid: boolean
  }[]
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

export interface CarBrand {
  id: number
  name: string
  logo_url: string
  models: string[]
}

export interface Store {
  id: number
  name: string
  phone?: string
  contact_person?: string
  total_purchased?: number
  debt_remaining?: number
  created_at: string
}

export interface StorePurchase {
  id: number
  purchase: number
  product: number | null
  product_name: string
  quantity: number
  returned_quantity: number
  purchase_price: number
  line_total: number
  on_credit: boolean
  date: string
}

export interface StorePurchases {
  store: Store
  total_purchased: number
  credit_total: number
  cash_total: number
  debt_remaining: number
  purchases: StorePurchase[]
}

export interface PurchaseLine {
  id: number
  product: number
  product_name: string
  product_code: string
  unit: string
  quantity: number
  unit_cost: number
  sell_price: number
  line_total: number
  returned_quantity: number
  remaining_quantity: number
}

export interface Purchase {
  id: number
  store: number
  store_name: string
  date: string
  on_credit: boolean
  invoice_no: string
  note: string
  source: 'manual' | 'excel' | 'order' | 'migration'
  order: number | null
  order_number: number | null
  total: number
  is_cancelled: boolean
  debt_id: number | null
  debt_remaining: number | null
  lines?: PurchaseLine[]
  line_count?: number
  created_at: string
}

export interface Paginated<T> {
  count: number
  page: number
  total_pages: number
  results: T[]
}

export type StockMovementKind =
  | 'purchase' | 'purchase_cancel' | 'order_out' | 'order_return' | 'supplier_return'
  | 'write_off' | 'count_adjust' | 'opening' | 'merge'

export interface StockMovement {
  id: number
  date: string
  kind: StockMovementKind
  kind_label: string
  product: number
  product_name: string
  quantity: number
  unit_cost: number
  unit_price: number | null
  store: number | null
  store_name: string | null
  purchase: number | null
  order: number | null
  order_number: number | null
  plate_number: string | null
  customer_name: string | null
  note: string
  created_at: string
}

export interface ProductBatchInfo {
  id: number
  purchase_price: number
  quantity: number
  remaining_quantity: number
  date: string
  store: number | null
  store_name: string | null
  /** The purchase (qaimə) this batch came from; null for opening stock. */
  purchase: number | null
  purchase_line: number | null
  invoice_no: string
  /** null when the batch has no purchase. */
  on_credit: boolean | null
  /** Kreditor state of an on-credit batch; null for cash / unknown. */
  payment_status: SupplierPaymentStatus | null
}

export type SupplierPaymentStatus = 'paid' | 'partial' | 'unpaid'

export interface ProductCard {
  product: Product
  batches: ProductBatchInfo[]
  purchases: {
    purchase_id: number
    invoice_no: string
    payment_status: SupplierPaymentStatus | null
    /** Units of this line still on the shelf (what can be returned). */
    remaining_quantity: number
    line_id: number
    date: string
    store: number
    store_name: string
    on_credit: boolean
    quantity: number
    returned_quantity: number
    unit_cost: number
    sell_price: number
  }[]
  sales: {
    order_id: number
    order_number: number
    date: string
    status: 'pending' | 'in_progress' | 'done'
    plate: string
    customer_name: string
    quantity: number
    sell_price: number
    unit_cost: number
    profit: number
  }[]
  movements: StockMovement[]
  totals: {
    bought_quantity: number
    sold_quantity: number
    revenue: number
    cost: number
    profit: number
    stock_value: number
  }
}

export interface StockReportRow {
  product: number
  name: string
  code: string
  unit: string
  opening_qty: number
  opening_value: number
  in_qty: number
  in_value: number
  out_qty: number
  out_value: number
  closing_qty: number
  closing_value: number
}

export interface StockReport {
  from: string
  to: string
  rows: StockReportRow[]
  totals: Omit<StockReportRow, 'product' | 'name' | 'code' | 'unit'>
  stock_value: number
  top_sold: { product: number; name: string; quantity: number; revenue: number; cost: number; profit: number }[]
  top_profit: { product: number; name: string; quantity: number; revenue: number; cost: number; profit: number }[]
  dead_stock: { product: number; name: string; stock_quantity: number }[]
}

export interface ExcelPreviewRow {
  row: number
  name: string
  code: string
  unit: string
  quantity: number
  unit_cost: number
  sell_price: number
  discount_percent: number
  match: {
    id: number
    name: string
    code: string
    unit: string
    stock_quantity: number
    sell_price: number
    is_archived: boolean
  } | null
}

export interface MechanicEarnings {
  from: string
  to: string
  total: number
  daily: { date: string; amount: number }[]
  today?: number
  this_month?: number
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
  unit: string
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
  store: number | null
  purchase: number | null
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

// Read-only order behind the customer link — no ids, costs or internal notes.
export interface PublicOrder {
  business: {
    name: string
    phone: string
    address: string
    instagram: string
    slogan: string
    logo: string | null
  }
  number: number
  created_at: string
  completed_on: string | null
  status: 'pending' | 'in_progress' | 'done'
  customer_name: string
  car_brand: string
  car_model: string
  car_year: string
  plate_number: string
  mileage: number | null
  mileage_unit: 'km' | 'mil'
  description: string
  diagnosis: string
  recommendations: string
  services: { name: string; price: number }[]
  products: { name: string; quantity: number; customer_supplied: boolean; sell_price: number }[]
  total: number
  discount_amount: number
  paid_amount: number
  amount_due: number
  payment_status: 'unpaid' | 'partial' | 'paid'
  has_guarantee: boolean
  guarantee_text: string
  guarantee_exclusions: string
}

export type ActivityKind =
  | 'order_created' | 'order_done' | 'payment' | 'purchase'
  | 'supplier_payment' | 'supplier_return' | 'write_off' | 'mechanic_payout'

/** One line of the dashboard "Son hərəkətlər" feed. */
export interface ActivityEvent {
  id: string
  kind: ActivityKind
  /** ISO timestamp. */
  at: string
  text: string
  /** SPA path to the source page. */
  link: string
  amount: number | string | null
}
