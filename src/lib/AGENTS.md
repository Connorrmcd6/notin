# src/lib Conventions

## Directory Layout

- `db/` — Prisma client singleton
- `rbac/` — Role enum permissions map (`ROLE_PERMISSIONS`), `hasPermission()` helper, `Permission` type
- `validators/` — Zod v4 schemas for leave requests, cancellation, approval, decline, history filters, balance adjustments
- `auth/` — Server-side session verification (`getSession`, `requireSession`, `requirePermission`, `requireAdmin`)
- `api/` — API route utilities (`withErrorHandler` — maps errors to HTTP status codes), client-side fetch helpers (`client.ts` — typed wrappers for leave, balance, and user API routes)
- `leave/` — Leave business logic: `calculations.ts` (pure functions for day counting, balance math, holiday overlap), `notifications.ts` (admin/employee notification helpers), `service.ts` (submit, cancel, approve, decline, history, pending)
- `balances/` — Balance management: `service.ts` (get balances, adjust with audit trail), `carryover.ts` (year-end balance carryover utility)
- `utils.ts` — Shared utility functions (shadcn cn() helper)

## Conventions

- Domain modules export via index files
- Colocate tests as `*.test.ts` next to source
- Mock Prisma client globally in `src/tests/setup.ts`
- Use `@/*` import aliases

---

When adding new modules to src/lib, update this file accordingly.
