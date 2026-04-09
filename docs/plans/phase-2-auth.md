# Phase 2 — Auth & RBAC

| Field | Value |
|-------|-------|
| **Scope** | Google OAuth, domain restriction, RBAC, route protection, sign-in page |
| **Detail level** | High-level |
| **Status** | Planned |

## What This Phase Covers

Implement authentication and authorization so that users can sign in with Google, are restricted to `@thoughtlab.studio`, and routes are protected based on role. By the end of this phase, the app has a working sign-in flow and role-based access control.

## Key Deliverables

- **Auth.js setup** — `src/auth.ts` with Google provider, JWT strategy, PrismaAdapter
- **Domain restriction** — `signIn` callback rejects non-`@thoughtlab.studio` emails
- **Auto-create user** — First login creates User record with `EMPLOYEE` role
- **Sign-in page** — `/sign-in` with Google OAuth button
- **Session provider** — `src/app/providers.tsx` wrapping the app with SessionProvider
- **Route protection** — `src/proxy.ts` (Next.js 16 pattern) checking session cookie, redirecting unauthenticated users
- **RBAC permission map** — `src/lib/rbac/roles.ts` with `ADMIN`/`EMPLOYEE` permissions
- **Permission helpers** — `hasPermission()`, `useRbac()` hook for client-side checks
- **Route-level RBAC** — `proxy.ts` role checks for `/admin` routes
- **Server-side session helper** — `src/lib/auth/session.ts` for API route auth

## Entry Criteria

- Phase 1 complete (Prisma schema with User model, dev server running)

## Exit Criteria

- Google OAuth sign-in works with `@thoughtlab.studio` accounts
- Non-company emails are rejected at sign-in
- Unauthenticated users are redirected to `/sign-in`
- Admin routes are inaccessible to employees
- `useRbac()` hook returns correct `can()` / `isAdmin` values
