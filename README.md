# Tsudori — Education Management Platform

A production-grade foundation for managing educational institutes (tuition centers,
coaching centers, academies). It starts as a tuition management system but is
architected to grow into a full education-management ERP: the database is
multi-tenant from day one, access control is data-driven, and every feature is a
self-contained vertical slice.

> **Status — V1 foundation.** The platform shell, authentication, multi-tenancy,
> role-based access control, the dashboard, and the **Student Management** module
> are fully built and working. Attendance, Fees, and Reports are scaffolded in the
> navigation and are built by mirroring the Student Management slice
> (see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)).

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript (strict) |
| Backend | Next.js Route Handlers + a separated service layer |
| Database | PostgreSQL (Neon) |
| ORM | Prisma 7 (driver adapter) |
| Auth | Clerk (identity only — institutes, memberships & roles live in our DB) |
| Authorization | Data-driven RBAC (`Role` + `Permission` tables) |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI primitives) |
| Data fetching | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| Locale | INR / en-IN (₹, lakh grouping, DD/MM/YYYY) |

## Features (V1)

- **Dashboard** — total students, today's attendance (present/absent/leave/not-marked),
  fees collected this month, outstanding balance, and recent payments.
- **Student Management** — add, edit, archive (soft-delete), search, filter by
  status/class, paginate, and view a full profile with fee & attendance summaries.
- **Attendance / Fees / Reports / Settings** — scaffolded placeholders that mirror
  the spec and document what each will do.

## Prerequisites

- Node.js 20+ and [pnpm](https://pnpm.io)
- A [Neon](https://neon.tech) Postgres database (free tier is fine)
- A [Clerk](https://dashboard.clerk.com) application (free tier is fine)

## Setup

```bash
# 1. Install dependencies (runs `prisma generate` automatically)
pnpm install

# 2. Configure environment
cp .env.example .env
#    then fill in:
#    - DATABASE_URL / DIRECT_URL  → from the Neon dashboard
#    - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY → from Clerk → API Keys
#    - BOOTSTRAP_ADMIN_EMAIL      → your Clerk login email (becomes the first admin)

# 3. Create the schema and seed demo data
pnpm db:migrate      # applies migrations to your database
pnpm db:seed         # permissions, roles, a demo institute + sample students

# 4. Run it
pnpm dev             # http://localhost:3000
```

Sign up / sign in with the email you set as `BOOTSTRAP_ADMIN_EMAIL`. On first
load you're automatically linked to the seeded institute as **Institute Admin**
(and **Super Admin**), so the dashboard and students are immediately populated.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres connection (runtime) |
| `DIRECT_URL` | Direct Postgres connection (migrations) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk auth |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `..._SIGN_UP_URL` | Auth route paths |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` / `..._SIGN_UP_...` | Post-auth redirect |
| `BOOTSTRAP_ADMIN_EMAIL` | First user with this email becomes super/institute admin |

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Create & apply a dev migration |
| `pnpm db:deploy` | Apply migrations (production) |
| `pnpm db:seed` | Seed permissions, roles, and demo data |
| `pnpm db:studio` | Open Prisma Studio |

## Project structure

```
prisma/
  schema.prisma          # Multi-tenant schema + data-driven RBAC
  seed.ts                # Permissions, roles, demo institute & students
prisma.config.ts         # Prisma 7 connection/migration config
src/
  app/
    (auth)/              # Clerk sign-in / sign-up
    (dashboard)/         # Authenticated app shell + module pages
    api/                 # Route handlers (students, classes)
    layout.tsx           # ClerkProvider + React Query + Toaster
    page.tsx             # Marketing landing
  components/
    ui/                  # shadcn/ui primitives
    layout/              # App shell, sidebar, nav
    shared/              # PageHeader, StatCard, EmptyState, ConfirmDialog…
    providers/           # React Query provider
  features/              # Feature-based vertical slices
    students/            # schema · service · api · hooks · components
    dashboard/           # service
    classes/             # service
  lib/                   # prisma, auth, tenant, rbac, api, http, format, errors
  middleware.ts          # Clerk route protection
```

## Architecture & extending

See **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** for how multi-tenancy, RBAC,
and the request lifecycle work, and a step-by-step guide to building the next
module (Attendance, Fees, …) by mirroring the Student Management slice.
