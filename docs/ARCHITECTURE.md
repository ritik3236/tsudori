# Architecture

Tsudori is built so that **new modules plug in without refactoring** the core.
This document explains the foundations and shows exactly how to add the next
feature by mirroring the Student Management slice.

## Principles

1. **Tenant-first.** Every domain row carries an `instituteId`. Data access is
   scoped through one place (`getTenantContext`), so a query can never
   accidentally cross tenants.
2. **Data-driven authorization.** Roles and permissions are rows, not code. A new
   capability is a new permission key + a re-seed — no `if (role === …)` branching.
3. **Feature-based vertical slices.** Each feature owns its schema, service, API,
   hooks, and components under `src/features/<feature>/`. Features depend on
   `src/lib`, never on each other.
4. **Business logic out of the UI.** Route handlers and pages are thin; all rules
   live in `service.ts` files that take `instituteId` explicitly and know nothing
   about HTTP or React.

## Layers

```
UI (pages, components)
   │  React Query hooks ─────► fetch ─────►  Route Handler (src/app/api/**)
   │                                            │  getTenantContext()  ← auth + tenancy
   │                                            │  requirePermission() ← RBAC
   ▼                                            ▼
Server Components ───────────────────────►  Service (src/features/**/service.ts)
                                               │  takes instituteId, returns DTOs
                                               ▼
                                           Prisma (src/lib/prisma.ts) ─► Postgres
```

- **Server Components** (dashboard, student list/profile pages) call services
  directly for fast first paint.
- **Client interactions** (create/edit/archive, search/filter/paginate) go through
  Route Handlers via React Query hooks, for caching and optimistic UX.
- Both paths funnel through the **same service functions** — one source of truth.

## Multi-tenancy

- `Institute` is the tenant. `User` (mirrored from Clerk) joins institutes through
  `Membership`, which carries the user's `Role` in that institute.
- [`getTenantContext()`](../src/lib/tenant.ts) resolves the active institute
  (cookie → first membership → super-admin fallback) and loads the user's
  effective permissions into a `Set`. It returns `{ user, institute, membership,
  permissions, isSuperAdmin }`.
- Services receive `ctx.institute.id` as their first argument. The tenant boundary
  is therefore explicit and impossible to forget.

To flip on full SaaS multi-tenancy later: add institute selection UI (the
`tsudori.active_institute` cookie is already honored) and a Clerk-Org or invite
flow — no schema migration required.

## Authentication & onboarding

1. Clerk handles sign-up/sign-in. [`middleware.ts`](../src/middleware.ts) protects
   everything except `/`, `/sign-in`, `/sign-up`.
2. On the first authenticated request, [`getCurrentUser()`](../src/lib/auth.ts)
   lazily creates a local `User` row keyed by `clerkUserId`.
3. If that user's email matches `BOOTSTRAP_ADMIN_EMAIL` and no admin exists yet,
   `getTenantContext` promotes them to super admin + Institute Admin of the seeded
   institute (idempotent). This makes the first run usable with zero manual setup.

Wiring a Clerk webhook to `syncCurrentUser` later keeps profiles live-synced; the
core flow doesn't require it.

## Authorization (RBAC)

[`src/lib/rbac.ts`](../src/lib/rbac.ts) is the single source of truth:

- `PERMISSIONS` — every capability as `module:action` (e.g. `student:create`).
- `SYSTEM_ROLES` — role templates (`SUPER_ADMIN`, `INSTITUTE_ADMIN`, `TEACHER`)
  mapping to permission lists or `"*"`.

The seed writes these into `Permission`, `Role`, and `RolePermission`. At runtime,
`getTenantContext` loads the user's granted permission keys; `requirePermission(ctx,
PERMISSIONS.X)` guards services/routes and `can(ctx, …)` gates UI. Super admins
bypass the check.

Add a role from the UI later by inserting `Role` + `RolePermission` rows — the
runtime needs no changes.

## Error handling

Services throw typed errors from [`src/lib/errors.ts`](../src/lib/errors.ts)
(`NotFoundError`, `ForbiddenError`, `ValidationError`, …). The
[`route()`](../src/lib/api.ts) wrapper maps each to an HTTP status and a consistent
`{ error: { code, message, details } }` envelope. On the client,
[`http.ts`](../src/lib/http.ts) unwraps `{ data }` / throws `ApiError`, which React
Query surfaces to toasts.

---

## Adding a new module (worked example: Attendance)

Every module follows the same five steps. Use `src/features/students/` as the
reference implementation.

### 1. Schema (already modeled)

The `Attendance` model exists in [`prisma/schema.prisma`](../prisma/schema.prisma)
with `instituteId`, a `@@unique([studentId, date])` to prevent duplicates, and a
`status` enum. New columns? Edit the schema and run `pnpm db:migrate`.

### 2. Validation — `src/features/attendance/schema.ts`

Define Zod schemas for the API and a form model, mirroring
[`students/schema.ts`](../src/features/students/schema.ts):

```ts
export const markAttendanceSchema = z.object({
  date: z.coerce.date(),
  entries: z.array(z.object({
    studentId: z.string(),
    status: z.enum(["PRESENT", "ABSENT", "LEAVE"]),
  })),
})
```

### 3. Service — `src/features/attendance/service.ts`

Pure, tenant-scoped business logic. First arg is always `instituteId`:

```ts
export async function markAttendance(instituteId: string, input: MarkAttendanceInput) {
  // upsert per (studentId, date); the unique constraint enforces no duplicates
}
export async function getAttendanceForDate(instituteId: string, date: Date) { … }
```

Return JSON-safe DTOs (normalize Prisma `Decimal`/`Date`), as the student service does.

### 4. API — `src/app/api/attendance/route.ts`

Thin handlers wrapped in `route()`, guarded by the new permission:

```ts
export const POST = route(async (req) => {
  const ctx = await getTenantContext()
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_MARK)
  const input = await parseJson(req, markAttendanceSchema)
  return ok(await markAttendance(ctx.institute.id, input))
})
```

### 5. Client + UI

- `hooks.ts` — React Query hooks (`useAttendanceForDate`, `useMarkAttendance`)
  mirroring [`students/hooks.ts`](../src/features/students/hooks.ts).
- `components/` — the marking grid, filters, etc., using shared components
  (`PageHeader`, `EmptyState`, `StatusBadge`).
- `src/app/(dashboard)/attendance/page.tsx` — replace the `ModulePlaceholder`
  with the real page (server-side `requirePermission`, then render the client UI).

### 6. Permissions

`ATTENDANCE_READ` / `ATTENDANCE_MARK` already exist in `rbac.ts` and are seeded.
A brand-new module just adds keys there and re-seeds.

That's it — no core files change. The new feature is isolated, tenant-safe, and
permission-gated by construction.

---

## Future expansion (designed-for, not yet built)

The schema and layering already accommodate the roadmap without restructuring:

| Future feature | How it fits |
| --- | --- |
| Parent portal | New `Role` + permissions; parents link to students via a join table |
| Teacher management | `Membership` + `Role` already model staff; add a management UI |
| Multiple branches | `Institute` is the tenant; branches = additional institutes or a `Branch` sub-entity |
| Exams & marks, Homework | New feature slices + models FK'd to `Student`/`Class` |
| Notifications (WhatsApp/SMS) | A `notifications` service slice; contact fields already on `Student` |
| Expense tracking, Payroll | New tenant-scoped models alongside `FeePayment` |
| Multi-tenant SaaS | Already tenant-ready; add billing + institute provisioning |
| Multi-language | Formatting helpers in `lib/format.ts` already take a locale |

## Deliverables map

| Spec deliverable | Where |
| --- | --- |
| Project folder structure | README → Project structure |
| Database schema (Prisma) | `prisma/schema.prisma` |
| API endpoints | `src/app/api/**` (students, classes) |
| UI / component hierarchy | `src/components/**`, `src/features/**/components` |
| Authentication flow | This doc → Authentication; `src/lib/auth.ts`, `middleware.ts` |
| Implementation plan | This doc → Adding a new module |
| Module-by-module code | Student Management slice (reference); others scaffolded |
| README / setup | `README.md` |
