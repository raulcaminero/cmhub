# CMHub Frontend

Sistema de gestión contable para empresas dominicanas. Interfaz web construida con Next.js 15 y App Router.

## Stack

- **Next.js 15** — App Router, Server Components, middleware
- **TypeScript** — strict mode
- **Tailwind CSS v3** — utility-first styling
- **shadcn/ui** — Radix UI component primitives
- **Redux Toolkit** — global state management
- **RTK Query** — data fetching, caching, and cache invalidation

## Prerequisites

- Node.js 20 or later
- npm 10 or later

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:3001/api` | Base URL for the CMHub backend REST API |

## Project structure

```
src/
  app/
    (auth)/               # Auth route group (no sidebar layout)
      login/page.tsx
    (dashboard)/          # Authenticated route group (sidebar + header)
      accounting/page.tsx
      layout.tsx
      page.tsx            # Redirects to /dashboard/accounting
    layout.tsx            # Root layout with Redux Provider
    page.tsx              # Redirects to /dashboard
  components/
    features/
      accounting/         # AccountsView, AccountsTable
      layout/             # Sidebar, Header, CompanySwitcher
    ui/                   # shadcn/ui primitives (Button, Card, Input, …)
    providers.tsx         # Redux Provider wrapper
  lib/
    utils.ts              # cn() helper
  middleware.ts           # Auth guard — redirects unauthenticated users to /login
  services/
    api.ts                # RTK Query base API (auth header, tag types)
    accounting.api.ts     # Accounts and journal-entry endpoints
    auth.api.ts           # Login and register endpoints
    companies.api.ts      # Company CRUD endpoints
  store/
    hooks.ts              # Typed useAppDispatch / useAppSelector
    index.ts              # Redux store configuration
    slices/
      auth.slice.ts       # Token storage and isAuthenticated flag
      company.slice.ts    # Active company and company list
  types/
    accounting.types.ts   # Shared domain types (AccountType, NcfType, …)
```

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
