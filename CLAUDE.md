# CLAUDE.md — Servo Frontend (repo: Avtoservis CRM)

SaaS CRM for auto-service businesses in Azerbaijan. Roles: **BUSINESS_OWNER**, **MECHANIC**, **SUPER_ADMIN** — each gets its own layout.
This repo is the SPA; the API is the Django backend in `avtoservisBack` (read its CLAUDE.md for the accounting rules the screens reflect).

## Stack
- **Vite + React 18 + TypeScript (strict)** — a client-side SPA, *not* Next.js
- react-router-dom v6, Tailwind CSS, axios, recharts, lucide-react; pdfmake / html2pdf for printouts
- Deployed on Vercel: `vercel.json` proxies `/api` and `/media` to the backend so everything is same-origin (cookies + CSRF depend on this)
- Local dev: `.env.local` `VITE_API_URL` points at `http://localhost:8000`; vite also proxies `/api`

## Structure
```
src/
  App.tsx              routes (role guards: RoleGuard / AuthGate)
  layouts/             BusinessLayout (sidebar), MechanicLayout (bottom nav)
  pages/business/      route-level pages (thin)
  pages/mechanic/, pages/admin/
  components/<area>/   screens and pieces: orders, warehouse, finance, mechanics, customers, ui
  services/*.service.ts  every API call — components never call axios directly
  lib/                 axios (interceptors), auth (CSRF token), utils, chartColors, formDraft
  types/index.ts       all API types
```
Business navigation (dark sidebar, accordion groups): Ana səhifə, Sifarişlər, Rezervasiyalar, Müştərilər, Ustalar, **Stok** (Məhsullar, Alışlar, Hərəkətlər, Tədarükçülər, Anbar hesabatı), **Maliyyə** (Kassa, Kreditorlar, Debitorlar, Hesabat), Tənzimləmələr. "Mağazalar" was merged into Tədarükçülər (same `stores.Store` data); `/business/shops` redirects.

## Rules
- **All UI text in Azerbaijani**; API errors go through `mapApiError` (Azerbaijani, human-readable).
- Status = color + text (Badge), never color alone.
- Main records (order, customer, mechanic, product, purchase, supplier) open as their own full page with a "← Geri" link — not side panels. Short actions use `ui/Modal`; quick add/edit forms use a Modal or right drawer.
- Loading and error states on every fetch; empty states explain what to do next.
- Dates: use `toLocalISODate()` from `lib/utils`, never `toISOString().slice(0, 10)` (UTC → wrong day in Baku after midnight).
- Money comes from the API as strings or numbers — wrap in `Number()` / `formatCurrency()` before math.
- Stock, cost and finance numbers are computed by the backend; the UI shows them, it doesn't re-derive them.
- Mechanic views never show purchase prices.
- Run `npm run typecheck && npm run lint` before committing; don't silence `react-hooks/exhaustive-deps` without a comment saying why.

## Auth
Access/refresh JWTs live in httpOnly cookies set by the backend. `lib/auth.ts` reads the `csrf_token` cookie and axios sends it as `X-CSRF-Token` on writes; `lib/axios.ts` refreshes on 401 (queued requests are settled either way) and replays once on a stale-CSRF 403. Requests time out after 30 s (uploads 120 s).

## Visual style
Servo design system — brand book `design/brandbook/servo_brand-book_v2.pdf` (brand fonts: Archivo + IBM Plex Mono; the app has not switched yet), implementation spec `design/REDESIGN_SPEC.md` (both in the parent `avtoservis` folder). Tokens in `tailwind.config.ts`: ink `#090909`, paper `#F4F4F4`, surface `#FFFFFF`, surface-2 `#EBEBEB`, border `#E0E0E0`, text-1..4, signal red `#D1442F` (**accent only**: logo, active nav line, one highlighted number — never a background or status colour), semantic success/warning/danger/info (+subtle/strong). Old token names (`ink-muted`, `rule`, `accent`, …) are aliases kept for compatibility. Fonts: Libre Franklin (headings, `font-display`), Source Sans 3 (UI), JetBrains Mono (plates, numbers, money — tabular). Building blocks in `components/ui/`: Button, StatusBadge (9 fixed status words), Money (never colour-only: +/− or Alınacaq/Ödəniləcək), Plate (AZ plate), Avatar, KpiCard, InkBand, PageHeader, Modal, Segmented, ServoLogo. Global classes in `index.css` (`card`, `input`, `label`, `btn-*`, `ledger-*`). Chart colours in `lib/chartColors.ts`. The order act PDF (`serviceActPdf.ts`) and the customer history PDF (`printCustomerPDF` in `printOrderPDF.ts`) follow the brand, sharing fonts (`public/fonts/`, registered at runtime), header, footer, plate box and table styles from `lib/pdfBrand.ts`; the FinanceClient print HTML keeps its own look.

## Commands
```bash
npm run dev          # localhost:5173
npm run typecheck    # tsc --noEmit (strict + noUnusedLocals/Parameters)
npm run lint         # ESLint (eslint.config.js): TS recommended + React hooks rules
npm run build        # tsc && vite build
```
