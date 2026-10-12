# CLAUDE.md — Avtoservis CRM Frontend

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
Business navigation: Dashboard, Sifarişlər, Müştərilər, Ustalar, **Stok** (Məhsullar, Alışlar, Hərəkətlər, Tədarükçülər, Anbar hesabatı), **Maliyyə** (Kassa, Kreditorlar, Debitorlar, Hesabat), Rezervasiyalar, Mağazalar, Tənzimləmələr.

## Rules
- **All UI text in Azerbaijani**; API errors go through `mapApiError` (Azerbaijani, human-readable).
- Status = color + text (Badge), never color alone.
- Master–detail screens use `MasterDetailShell`; forms are inline panels, not modals (modals only for confirmations).
- Loading and error states on every fetch; empty states explain what to do next.
- Dates: use `toLocalISODate()` from `lib/utils`, never `toISOString().slice(0, 10)` (UTC → wrong day in Baku after midnight).
- Money comes from the API as strings or numbers — wrap in `Number()` / `formatCurrency()` before math.
- Stock, cost and finance numbers are computed by the backend; the UI shows them, it doesn't re-derive them.
- Mechanic views never show purchase prices.
- Run `npm run typecheck && npm run lint` before committing; don't silence `react-hooks/exhaustive-deps` without a comment saying why.

## Auth
Access/refresh JWTs live in httpOnly cookies set by the backend. `lib/auth.ts` reads the `csrf_token` cookie and axios sends it as `X-CSRF-Token` on writes; `lib/axios.ts` refreshes on 401 (queued requests are settled either way) and replays once on a stale-CSRF 403. Requests time out after 30 s (uploads 120 s).

## Visual style
Tailwind tokens in `tailwind.config.ts` (`ink`, `surface`, `rule`, `accent` #1F4D36, `warning`, `danger`, `success`, …) and component classes in `index.css` (`card`, `input`, `btn-primary`, `ledger-table`, `section-label`, …). Fonts: IBM Plex Sans / Mono, Newsreader for headings. Chart colours live in `lib/chartColors.ts` (palette validated with the dataviz skill).

## Commands
```bash
npm run dev          # localhost:5173
npm run typecheck    # tsc --noEmit (strict + noUnusedLocals/Parameters)
npm run lint         # ESLint (eslint.config.js): TS recommended + React hooks rules
npm run build        # tsc && vite build
```
