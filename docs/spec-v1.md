# NotIn — Technical Spec (V1)

This document maps every feature from the [product spec (V0)](./spec-v0.md) to the specific tools and patterns from the [Vibe-Spec stack reference](./vibe-spec.md).

---

## Stack Summary

| Layer | Tool | Vibe-Spec Section |
|-------|------|-------------------|
| Framework | Next.js 16 (App Router, TypeScript, pnpm) | Section 2 |
| Database | PostgreSQL 16 (Docker local, Neon prod) | Sections 3, 4, 16 |
| ORM | Prisma 7 | Section 5 |
| Auth | Auth.js with Google OAuth | Section 7 (Option A) |
| RBAC | Role enum + permission map + proxy.ts | Section 8 |
| Validation | Zod v4 | Section 9 |
| Testing | Vitest | Section 10 |
| UI | shadcn/ui + Tailwind v4 | Section 11 |
| CI/CD | GitHub Actions | Section 14 |
| Hooks | Native .githooks pre-commit | Section 15 |
| Deployment | Vercel + Neon Postgres | Section 16 |

**Sections NOT needed:** 6 (dbt), 12 (S3), 13 (Push Notifications), 17 (Scripts & CLI — beyond seed script)

---

## 1. Authentication — Google OAuth

**Tool:** Auth.js with Google provider (Vibe-Spec Section 7, Option A)

| Component | Implementation |
|-----------|---------------|
| Sign-in | Auth.js `Google` provider with JWT strategy |
| Domain restriction | Auth.js `signIn` callback — reject emails not ending in `@thoughtlab.studio` |
| Session | JWT stored as httpOnly cookie, `userId` and `role` in payload |
| Route protection | `proxy.ts` (Next.js 16 pattern) — check cookie, redirect to `/sign-in` |
| Auto-create user | Auth.js `signIn` callback — on first login, create User record with `EMPLOYEE` role |

**Key files:**
- `src/auth.ts` — Auth.js config
- `src/proxy.ts` — route protection
- `src/app/providers.tsx` — SessionProvider wrapper
- `src/lib/auth/session.ts` — server-side session verification

**Environment variables:**
```env
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_URL=http://localhost:3000
```

---

## 2. User Roles & RBAC

**Tool:** Prisma enum + permission map (Vibe-Spec Section 8)

### Data Model

```prisma
enum Role {
  EMPLOYEE
  ADMIN
}

model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  name      String?
  role      Role     @default(EMPLOYEE)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  leaveRequests  LeaveRequest[]
  leaveBalances  LeaveBalance[]

  @@map("users")
}
```

### Permissions

```typescript
// src/lib/rbac/roles.ts
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: [
    "leave:request",
    "leave:cancel",
    "leave:approve",
    "leave:decline",
    "users:read",
    "users:manage",
    "balances:read",
    "balances:adjust",
    "holidays:manage",
  ],
  EMPLOYEE: [
    "leave:request",
    "leave:cancel",
    "balances:read",
  ],
};
```

### Route Protection

```typescript
// In proxy.ts
const routeRoleMap: Record<string, Role[]> = {
  "/admin":     ["ADMIN"],
  "/dashboard": ["ADMIN", "EMPLOYEE"],
};
```

**Key files:**
- `src/lib/rbac/roles.ts` — role + permission definitions
- `src/lib/rbac/permissions.ts` — `hasPermission()` helper
- `src/hooks/useRbac.ts` — client-side `can()` / `isAdmin` checks
- `src/proxy.ts` — route-level enforcement

---

## 3. Database Schema

**Tool:** Prisma 7 + PostgreSQL 16 (Vibe-Spec Sections 3, 4, 5)

No dual-client pattern needed — Prisma alone is sufficient for this app.

### Models

```prisma
enum LeaveType {
  PAID_ANNUAL
  UNPAID
}

enum LeaveStatus {
  PENDING
  APPROVED
  DECLINED
  CANCELLED
}

enum DayType {
  FULL
  MORNING  // 08:00–12:00
  AFTERNOON // 12:00–17:00
}

model LeaveRequest {
  id        String      @id @default(uuid()) @db.Uuid
  createdAt DateTime    @default(now()) @map("created_at")
  updatedAt DateTime    @updatedAt @map("updated_at")

  userId    String      @map("user_id") @db.Uuid
  user      User        @relation(fields: [userId], references: [id])

  leaveType LeaveType   @map("leave_type")
  startDate DateTime    @map("start_date") @db.Date
  endDate   DateTime    @map("end_date") @db.Date
  dayType   DayType     @default(FULL) @map("day_type")
  note      String?

  status    LeaveStatus @default(PENDING)
  reviewedBy   String?  @map("reviewed_by") @db.Uuid
  reviewedAt   DateTime? @map("reviewed_at")
  declineReason String? @map("decline_reason")

  @@map("leave_requests")
}

model LeaveBalance {
  id        String   @id @default(uuid()) @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  userId    String   @map("user_id") @db.Uuid
  user      User     @relation(fields: [userId], references: [id])

  year             Int
  annualAllowance  Float  @map("annual_allowance")  // Total days granted for the year
  usedDays         Float  @default(0) @map("used_days")
  carriedOver      Float  @default(0) @map("carried_over") // From previous year

  @@unique([userId, year])
  @@map("leave_balances")
}

model PublicHoliday {
  id        String   @id @default(uuid()) @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  date        DateTime @db.Date
  name        String
  year        Int
  isCustom    Boolean  @default(false) @map("is_custom") // false = auto-populated SA holiday

  @@unique([date])
  @@map("public_holidays")
}

model BalanceAdjustment {
  id        String   @id @default(uuid()) @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  userId    String   @map("user_id") @db.Uuid
  adjustedBy String  @map("adjusted_by") @db.Uuid
  year      Int
  days      Float    // Positive = add, negative = subtract
  reason    String

  @@map("balance_adjustments")
}

model Notification {
  id        String   @id @default(uuid()) @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  userId    String   @map("user_id") @db.Uuid
  message   String
  link      String?
  read      Boolean  @default(false)

  @@map("notifications")
}
```

### Key Conventions (from Vibe-Spec Section 5)
- UUIDs for all IDs (`@db.Uuid`)
- `createdAt` + `updatedAt` on all models
- camelCase in Prisma → snake_case in Postgres via `@map()`
- PascalCase models → snake_case plural tables via `@@map()`
- Generated client outputs to `src/generated/prisma`
- `Float` for day counts to support half-days (0.5)

---

## 4. Leave Request Flow

**Tools:** Next.js API routes + Prisma + Zod validation (Vibe-Spec Sections 5, 9)

### API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/leave/request` | POST | Employee+ | Submit a leave request |
| `/api/leave/cancel` | POST | Employee+ | Cancel own pending/approved request |
| `/api/leave/approve` | POST | Admin | Approve a pending request |
| `/api/leave/decline` | POST | Admin | Decline a pending request (with reason) |
| `/api/leave/history` | GET | Employee+ | Get own leave history |
| `/api/leave/pending` | GET | Admin | Get all pending requests |

### Validation (Zod v4)

```typescript
// src/lib/validators/leave.ts
import { z } from "zod/v4";

export const LeaveRequestSchema = z.object({
  leaveType: z.enum(["PAID_ANNUAL", "UNPAID"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  dayType: z.enum(["FULL", "MORNING", "AFTERNOON"]).default("FULL"),
  note: z.string().max(500).optional(),
}).refine(data => data.endDate >= data.startDate, {
  message: "End date must be on or after start date",
});
```

### Business Logic
- On submit: validate dates, check minimum 1-day notice (except today for sick/emergency), check balance for paid leave, check no overlap with public holidays, create request with `PENDING` status, notify admins
- On approve: update status, deduct from `LeaveBalance.usedDays`, notify employee, create Google Calendar event (if enabled)
- On decline: update status + reason, notify employee
- On cancel: update status to `CANCELLED`, refund `usedDays` if was approved, remove calendar event (if enabled)

---

## 5. Leave Policies

**Tool:** Application logic + Prisma (no additional tools)

| Policy | Implementation |
|--------|---------------|
| Upfront annual grant | Seed script / admin action creates `LeaveBalance` record per user per year on Jan 1 |
| Per-person allowances | Admin sets `annualAllowance` individually per employee |
| Carryover (no cap) | On year rollover: new `LeaveBalance.carriedOver` = previous year's remaining balance |
| Minimum 1-day notice | Zod validation rejects `startDate` earlier than tomorrow (server-side) |
| Half-day support | `DayType` enum (FULL/MORNING/AFTERNOON), counts as 0.5 days against balance |
| Unpaid leave | No balance check — always requestable, tracked separately |

---

## 6. Dashboard & Views

**Tool:** shadcn/ui + Tailwind v4 (Vibe-Spec Section 11)

### Pages

| Page | Route | Role | Components |
|------|-------|------|------------|
| Employee Dashboard | `/dashboard` | All | Balance cards, upcoming leave, pending requests, "Request Leave" button |
| Admin Dashboard | `/admin` | Admin | Pending requests with approve/decline, team summary stats |
| Team Calendar | `/calendar` | All | Month view, approved leave per person, public holidays |
| Leave Request Form | `/dashboard/request` | All | Date picker, leave type select, day type toggle, note textarea |
| Leave History | `/dashboard/history` | All | Table of all own requests with status |
| User Management | `/admin/users` | Admin | User list, role toggle, set allowances |
| Public Holidays | `/admin/holidays` | Admin | Holiday list per year, add custom, remove |

### shadcn Components Needed
- `Card` — balance display, request cards
- `Calendar` — date picking, team calendar view
- `Table` — leave history, user management, holiday list
- `Dialog` — request form, approve/decline confirmation
- `Select` — leave type, day type
- `Textarea` — notes, decline reason
- `Badge` — leave status (Pending, Approved, Declined, Cancelled)
- `Sidebar` + `BottomNav` — navigation (desktop sidebar, mobile bottom nav)
- `Tooltip` — calendar day hover details
- `Toast` — action confirmations

### Client-Side RBAC

```tsx
const { isAdmin } = useRbac();

// Navigation
{isAdmin && <NavLink href="/admin">Admin</NavLink>}

// Admin actions on request cards
{isAdmin && <ApproveDeclineButtons requestId={id} />}
```

---

## 7. In-App Notifications

**Tool:** Prisma `Notification` model + polling (no push notifications needed)

| Event | Creates notification for |
|-------|-------------------------|
| Leave request submitted | All Admins |
| Request approved | Requesting employee |
| Request declined (with reason) | Requesting employee |
| Request cancelled | All Admins |
| Balance running low (<3 days) | Employee |

**Implementation:**
- `Notification` model in Prisma (see Section 3)
- API route `GET /api/notifications` — returns unread notifications for current user
- API route `POST /api/notifications/read` — mark as read
- Client polls every 30s or on page focus (no WebSocket/SSE needed at this scale)
- Bell icon in header with unread count badge

---

## 8. Public Holidays (South Africa)

**Tool:** Prisma + seed data (no external API dependency)

### Auto-Population
- SA public holidays are well-defined by law — store a static list per year in the seed script
- Movable holidays (Good Friday, Easter Monday, Family Day) are calculated using an Easter date algorithm
- On app startup or via admin action, populate `PublicHoliday` records for the current + next year
- `isCustom: false` for auto-populated, `isCustom: true` for admin-added

### Admin Management
- Admin can view holidays per year at `/admin/holidays`
- Admin can add custom off-days (e.g., company shutdown)
- Admin can remove/override auto-populated holidays
- Deleting an auto-populated holiday only soft-removes it for that year

### Calendar Integration
- Public holidays shown on team calendar (distinct color/style)
- Leave request form warns if selected dates overlap with public holidays

---

## 9. Google Calendar Integration (Nice-to-Have)

**Tool:** Google Calendar API (via existing Google OAuth credentials)

Since we already have Google OAuth, we can request the `calendar.events` scope to create events.

| Trigger | Action |
|---------|--------|
| Leave approved | Create event on employee's Google Calendar + copy to admin's calendar |
| Leave cancelled (was approved) | Delete the calendar events |

### Event Format
- **Full day:** All-day event titled "PTO — {Employee Name}" (or "Unpaid Leave — {Employee Name}")
- **Half day (morning):** Event 08:00–12:00
- **Half day (afternoon):** Event 12:00–17:00

### Implementation Notes
- Request `https://www.googleapis.com/auth/calendar.events` scope in Auth.js config
- Store the user's OAuth `refresh_token` to create events on their behalf
- Admin calendar events are informational (free, not busy)
- If calendar API fails, log the error but don't block the approval — leave tracking is the source of truth

**Key consideration:** This adds an OAuth scope request on first login. Users will see "NotIn wants to manage your Google Calendar events." If this is off-putting, it can be made opt-in per user.

---

## 10. Testing

**Tool:** Vitest (Vibe-Spec Section 10)

### Test Coverage

| Area | What to Test |
|------|-------------|
| Leave request validation | Zod schemas, date validation, balance checks |
| Approval/decline logic | Status transitions, balance deduction, notification creation |
| RBAC | Permission checks, route protection |
| Balance calculations | Half-day deductions, carryover, adjustments |
| Public holiday logic | Easter calculation, overlap detection |

### Mocking
- Prisma mocked globally (Vibe-Spec pattern)
- Auth mocked per test (`vi.mock("@/auth")`)
- No real database needed — all unit tests

---

## 11. CI/CD & Deployment

**Tool:** GitHub Actions + Vercel + Neon Postgres (Vibe-Spec Sections 14, 15, 16)

### CI Pipeline (on every PR)
1. `pnpm install --frozen-lockfile`
2. `npx prisma generate`
3. `pnpm lint`
4. `npx tsc --noEmit`
5. `pnpm test:coverage`

### Pre-commit Hooks
- Native `.githooks/pre-commit` — runs lint + typecheck + tests locally before commit

### Deployment
- Vercel auto-deploys on push to `main`
- Build: `prisma generate && prisma migrate deploy && next build`
- Database: Neon Postgres (serverless, free tier sufficient for ~12 users)

### Environment Variables (Production)
```env
DATABASE_URL=          # Neon connection string
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_URL=https://notin.yourcompany.com
```

---

## 12. Seed Script

**Tool:** Prisma seed (`prisma/seed.mts`) run via `tsx` (Vibe-Spec Section 5)

The seed script should:
1. Create an initial Admin user (seeded email)
2. Create sample employees with leave balances
3. Populate SA public holidays for current + next year
4. Create sample leave requests in various states (for development)

---

## Summary: Feature → Tool Map

| Feature | Primary Tool | Vibe-Spec Section |
|---------|-------------|-------------------|
| Google OAuth sign-in | Auth.js | 7 (Option A) |
| Domain restriction (`@thoughtlab.studio`) | Auth.js signIn callback | 7 |
| Route protection | proxy.ts | 7, 8 |
| Employee/Admin roles | Prisma enum + RBAC permission map | 8 |
| Leave request CRUD | Next.js API routes + Prisma | 5 |
| Input validation | Zod v4 | 9 |
| Leave balances | Prisma model + application logic | 5 |
| Half-day support | DayType enum + Float balances | 5 |
| Carryover | Application logic on year boundary | — |
| Team calendar | shadcn Calendar component | 11 |
| In-app notifications | Prisma model + client polling | — |
| SA public holidays | Prisma model + seed data | 5 |
| Google Calendar sync | Google Calendar API | — |
| UI components | shadcn/ui + Tailwind v4 | 11 |
| Testing | Vitest | 10 |
| CI/CD | GitHub Actions | 14 |
| Pre-commit hooks | Native .githooks | 15 |
| Deployment | Vercel + Neon | 16 |
