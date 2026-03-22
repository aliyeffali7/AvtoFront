# CLAUDE.md — Autoservice CRM Frontend

## Project Overview

A SaaS CRM platform for auto service businesses.
Three user roles: **SuperAdmin**, **BusinessOwner**, **Mechanic**.

This is the frontend repo. It consumes the Django REST API backend.
The UI is role-based — each role sees a completely different dashboard.

---

## UX/UI Philosophy

**Core rule: the user should never have to think.**

Target users are auto service business owners and mechanics in Azerbaijan. Most have low digital literacy. They are not sitting at a desk with time to read — they are in a garage, hands dirty, glancing at a phone or a cheap laptop. If the UI is confusing for even 10 seconds, they will stop using it.

Every design decision must serve this constraint.

---

## Design Principles

### 1. One action per screen
Never put two important actions on the same screen competing for attention.
- The mechanic opens the app → sees their orders immediately. Nothing else.
- The business owner opens orders → sees a list. One button: "Yeni Sifariş" (New Order). That's it.

### 2. Use Azerbaijani for all UI labels
All button text, labels, placeholders, status names, navigation items must be in Azerbaijani.
Do NOT use English labels in the UI. Users will not understand "Dashboard", "Warehouse", "Pending".

Translations to use:
```
Orders          → Sifarişlər
New Order       → Yeni Sifariş
Warehouse       → Anbar
Products        → Məhsullar
Mechanics       → Ustalar
Finance         → Maliyyə
Cash Register   → Kassa
Income          → Gəlir
Expense         → Xərc
Pending         → Gözləyir
In Progress     → İcrada
Done            → Tamamlandı
Assign          → Təyin et
Save            → Saxla
Cancel          → Ləğv et
Logout          → Çıxış
Stock           → Stok
Plate Number    → Dövlət nişanı
Car Brand       → Marka
Car Model       → Model
Description     → Tapşırıq
Estimated Days  → Təxmini müddət (gün)
```

### 3. Status must be color + text, never just text
A mechanic or business owner should see order status in 1 second without reading.

```
Gözləyir   → yellow badge   🟡
İcrada     → blue badge     🔵
Tamamlandı → green badge    🟢
```

Never use only a word. Always combine color with the word.

### 4. Big tap targets
Minimum button height: 48px. This is used on mobile too.
Avoid small icon-only buttons. If it's clickable, it must have a visible label.

### 5. Forms must be short and vertical
Never put two inputs side by side. One field per row.
Label above the input, always. Placeholder text inside the input as a hint.
Keep forms to maximum 6 fields. If more is needed, split into steps.

### 6. Errors must be human-readable in Azerbaijani
No English error messages. No technical codes.
- Wrong: `"non_field_errors": ["Unable to log in with provided credentials."]`
- Right: `"Email və ya şifrə yanlışdır"`

Map all API error codes to friendly Azerbaijani strings in the frontend.

### 7. Empty states must explain what to do
If there are no orders yet, don't show a blank page.
Show: "Hələ sifariş yoxdur. Yeni sifariş yaratmaq üçün + düyməsini basın."

### 8. No modals for complex actions
Modals are acceptable for simple confirmations ("Silmək istəyirsiniz?").
For order creation or product addition — use a full page or a slide-in panel (drawer), not a cramped modal.

---

## Visual Style

- **Font**: Use a clean, readable sans-serif. Recommended: `Inter` (available via Google Fonts).
- **Font sizes**: Never go below 14px for any visible text. Body text minimum 16px.
- **Color palette**: Keep it neutral and professional. Suggested:
  - Primary: `#2563EB` (blue) — buttons, active states
  - Background: `#F9FAFB` (light gray) — page background
  - Surface: `#FFFFFF` — cards, tables
  - Text: `#111827` — primary text
  - Muted text: `#6B7280` — labels, hints
  - Success: `#16A34A` (green)
  - Warning: `#D97706` (yellow/amber)
  - Danger: `#DC2626` (red)
- **Border radius**: `rounded-lg` (8px) for cards and inputs. `rounded-full` for badges only.
- **Shadows**: Use subtle shadow (`shadow-sm`) on cards. No heavy drop shadows.
- **Spacing**: Be generous. Padding inside cards: 24px. Gap between sections: 32px.

---

## Layout per Role

### Mechanic layout
- Mobile-first. Most mechanics will use a phone.
- Full screen order list. Each order is a card showing: car plate, car brand/model, task summary, status badge.
- Tap a card → full order detail page. Show task, products to use, estimated days.
- No sidebar. Bottom navigation bar with max 2 items: Sifarişlər, Çıxış.

### BusinessOwner layout
- Desktop + tablet. Business owners will use a laptop or tablet at a desk.
- Left sidebar navigation (fixed width ~240px): Sifarişlər, Ustalar, Anbar, Kassa.
- Main content area takes the rest.
- Top bar: business name on the left, logout button on the right.
- Sidebar collapses to icons on mobile.

### SuperAdmin layout
- Desktop only.
- Simple table-based overview. No need to over-design this — only you will use it.

---

## Component-Level UX Notes

### Order Card (in list)
Show these fields at a glance:
- Car plate number (large, bold — this is the primary identifier)
- Car brand + model
- Assigned mechanic name (or "Təyin edilməyib" if none)
- Status badge
- Created date

### Order Creation Form
Fields in this order:
1. Dövlət nişanı (plate number) — autofocus here
2. Marka (brand) — text input
3. Model — text input
4. Tapşırıq (task description) — textarea
5. Təxmini müddət (estimated days) — number input
6. Usta (mechanic) — dropdown, optional at creation time

Products can be added after the order is created, from the order detail page.

### Finance / Kassa page
Top of the page: 3 large summary cards for TODAY.
```
[ Gəlir: 1,240 ₼ ]   [ Xərc: 320 ₼ ]   [ Xalis: 920 ₼ ]
```
Below: table of individual records.
Add income/expense: a simple drawer from the right side with 3 fields (type, amount, description).

### Warehouse page
Simple table: Product name | Purchase price | Sell price | Stock quantity | Actions.
"Məhsul əlavə et" button top right.
Low stock warning: if stock_quantity < 3, highlight that row in amber.

---

## What to Tell Claude Code When Building UI

When instructing Claude Code to build a page, always say:
- All labels in Azerbaijani
- Status badges must use color (yellow/blue/green)
- Minimum button height 48px
- No modals for forms — use a drawer/side panel
- Mobile-first for mechanic pages, desktop-first for business owner pages
- Empty states must have a helpful message in Azerbaijani

---

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Axios (for all API calls)
- JWT auth (access + refresh tokens, stored in httpOnly cookies via middleware)

---

## Folder Structure

```
autoservice_crm_frontend/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # shared dashboard shell (sidebar, header)
│   │   ├── business/
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx        # order list
│   │   │   │   └── [id]/page.tsx   # order detail
│   │   │   ├── mechanics/
│   │   │   │   └── page.tsx
│   │   │   ├── warehouse/
│   │   │   │   └── page.tsx
│   │   │   └── finance/
│   │   │       └── page.tsx
│   │   ├── mechanic/
│   │   │   └── orders/
│   │   │       └── page.tsx
│   │   └── admin/
│   │       └── page.tsx            # SuperAdmin overview
│   └── layout.tsx                  # root layout
├── components/
│   ├── ui/                         # reusable base components (Button, Input, Modal, Table, Badge)
│   ├── orders/                     # order-specific components
│   ├── warehouse/
│   ├── finance/
│   └── mechanics/
├── lib/
│   ├── axios.ts                    # Axios instance with base URL + interceptors
│   ├── auth.ts                     # token helpers (get, set, clear, decode role)
│   └── utils.ts                    # general helpers
├── services/
│   ├── auth.service.ts
│   ├── orders.service.ts
│   ├── warehouse.service.ts
│   ├── finance.service.ts
│   └── mechanics.service.ts
├── types/
│   └── index.ts                    # all TypeScript interfaces/types
├── middleware.ts                    # route protection by role
├── .env.local
└── tailwind.config.ts
```

---

## Auth Flow

- On login: call `POST /api/auth/login/` → receive `access` + `refresh` tokens.
- Store `access` token in memory (React state or a module-level variable) — NOT in localStorage.
- Store `refresh` token in an httpOnly cookie (set from Next.js middleware or a server action).
- On every API request: attach `Authorization: Bearer <access_token>` header via Axios interceptor.
- On 401: automatically call `POST /api/auth/token/refresh/`, get new access token, retry original request.
- On logout: clear tokens, redirect to `/login`.

---

## Role-Based Routing

Handle in `middleware.ts`. Logic:

```
/login                → public, redirect to dashboard if already logged in
/business/*           → only BUSINESS_OWNER
/mechanic/*           → only MECHANIC
/admin/*              → only SUPER_ADMIN
```

Decode the JWT payload (base64) client-side to read the `role` field — no extra API call needed for this.

---

## Axios Setup (`lib/axios.ts`)

- Base URL from `NEXT_PUBLIC_API_URL` env var (e.g., `http://localhost:8000`)
- Request interceptor: attach Bearer token
- Response interceptor: handle 401 → refresh token → retry

---

## TypeScript Types (`types/index.ts`)

Define interfaces for every API entity:

```ts
type Role = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'MECHANIC'

interface User {
  id: number
  email: string
  role: Role
  business?: number
}

interface Order {
  id: number
  car_brand: string
  car_model: string
  plate_number: string
  description: string
  estimated_days: number
  mechanic: number | null
  status: 'pending' | 'in_progress' | 'done'
  products: OrderProduct[]
  created_at: string
}

interface Product {
  id: number
  name: string
  purchase_price: number
  sell_price: number
  stock_quantity: number
}

interface FinanceRecord {
  id: number
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
}

interface Mechanic {
  id: number
  email: string
  is_active: boolean
}
```

---

## Services Pattern

All API calls live in `services/`. Never call Axios directly from a component.

```ts
// services/orders.service.ts
import api from '@/lib/axios'
import { Order } from '@/types'

export const getOrders = () => api.get<Order[]>('/api/orders/')
export const createOrder = (data: Partial<Order>) => api.post('/api/orders/', data)
export const assignMechanic = (orderId: number, mechanicId: number) =>
  api.patch(`/api/orders/${orderId}/`, { mechanic: mechanicId })
```

---

## Component Rules

- One component per file. No exceptions.
- All components are in `components/`. No inline component definitions inside page files.
- Page files (`page.tsx`) only handle data fetching and layout — no raw JSX business logic.
- Use `'use client'` only when needed (event handlers, hooks). Default to server components.
- No inline styles. Tailwind only.
- All forms: controlled inputs with local state. No uncontrolled refs for forms.

---

## BusinessOwner Pages — Feature Checklist

### Orders (`/business/orders`)
- [ ] List all orders with status badge (pending / in_progress / done)
- [ ] Create order modal: car brand, model, plate number, task description, estimated days
- [ ] Assign mechanic dropdown inside order detail
- [ ] Add products to order (select from warehouse, enter quantity)
- [ ] Change order status

### Mechanics (`/business/mechanics`)
- [ ] List mechanics
- [ ] Create mechanic (email + password form → calls backend)
- [ ] Deactivate mechanic

### Warehouse (`/business/warehouse`)
- [ ] List products with stock quantity
- [ ] Add product: name, purchase price, sell price, initial stock
- [ ] Stock adjustments (manual add)

### Finance (`/business/finance`)
- [ ] Today's summary: total income, total expenses, net
- [ ] List of finance records (date, type, amount, description)
- [ ] Add manual income/expense record

---

## Mechanic Pages — Feature Checklist

### Orders (`/mechanic/orders`)
- [ ] List orders assigned to the logged-in mechanic
- [ ] View order detail (car info, task, products)

---

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Dev Commands

```bash
npm install
npm run dev        # starts on localhost:3000
npm run build
npm run lint
```

---

## Code Style Rules

- TypeScript strict mode on. No `any`.
- Async data fetching in server components where possible. Use `useEffect` + `useState` only in client components when necessary.
- Loading states: every data fetch must have a loading skeleton or spinner.
- Error states: every data fetch must handle errors and show a message.
- No hardcoded API URLs — always use `NEXT_PUBLIC_API_URL`.
- Currency display: assume AZN (₼). Format numbers with 2 decimal places.

---

## What to Build First (suggested order)

1. Axios instance + auth service + login page
2. Middleware for role-based route protection
3. Dashboard layout with role-aware sidebar
4. BusinessOwner: Warehouse (simplest CRUD)
5. BusinessOwner: Mechanics (create + list)
6. BusinessOwner: Orders (full feature)
7. BusinessOwner: Finance
8. Mechanic: assigned orders view
9. SuperAdmin: overview page
