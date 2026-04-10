# Phase 6 — Polish & Launch

| Field            | Value                                                                              |
| ---------------- | ---------------------------------------------------------------------------------- |
| **Scope**        | Performance caching, Google Calendar integration, testing, CI/CD, deployment, polish |
| **Detail level** | Detailed                                                                           |
| **Status**       | Planned                                                                            |

## What This Phase Covers

Final phase — add server-side caching to make the app feel snappy, optionally integrate Google Calendar sync, write a comprehensive test suite, set up CI/CD and deployment infrastructure, and polish the app for production. By the end of this phase, the app is deployed and ready for the ~12 person team to use.

## Architecture

Follows the established patterns from prior phases. New additions:

```
src/lib/cache/tags.ts                      # NEW — cache tag constants
src/lib/cache/index.ts                     # NEW — barrel export

src/lib/google-calendar/service.ts         # NEW — Google Calendar event creation/deletion
src/lib/google-calendar/index.ts           # NEW — barrel export

.github/workflows/ci.yml                   # NEW — GitHub Actions CI pipeline
.githooks/pre-commit                       # MODIFY — ensure lint + typecheck + test

prisma/seed.mts                            # MODIFY — production seed mode (admin + holidays only)

src/lib/leave/service.ts                   # MODIFY — add cache wrappers + invalidation
src/lib/leave/calculations.ts              # Already has tests — add any missing edge cases
src/lib/holidays/service.ts                # MODIFY — add cache wrappers + invalidation
src/lib/notifications/service.ts           # MODIFY — add cache wrappers + invalidation
src/lib/balances/service.ts                # MODIFY — add cache wrappers + invalidation
src/lib/users/service.ts                   # MODIFY — add cache wrappers + invalidation
src/app/api/*/route.ts                     # MODIFY — add revalidation calls on mutations

src/app/(app)/dashboard/page.tsx           # MODIFY — loading state
src/app/(app)/admin/page.tsx               # MODIFY — loading state
src/app/(app)/calendar/page.tsx            # MODIFY — loading state
src/app/(app)/dashboard/history/page.tsx   # MODIFY — loading state
src/app/(app)/admin/users/page.tsx         # MODIFY — loading state
src/app/(app)/admin/holidays/page.tsx      # MODIFY — loading state

next.config.ts                             # MODIFY — verify security headers for production
```

## Existing State

Already built (Phase 1–5):
- **All features functional** — leave request/approve/decline/cancel, balances, team calendar, holidays, notifications, account deletion
- **All pages built** — employee dashboard, admin dashboard, leave request form, history, calendar, user management, holiday management, settings
- **101+ tests** across 9+ test files (Phase 3 services + Phase 5 services)
- **Security headers** already in `next.config.ts` (CSP, HSTS, X-Frame-Options, etc.)
- **Pre-commit hook** already exists at `.githooks/pre-commit`
- **No caching** — all server component data fetches hit the database directly every time
- **`router.refresh()`** used after mutations in client components (7 files)

---

## Step 1: Performance — Server-Side Caching

The app currently makes a DB call on every page load. For ~12 users, this is fine for correctness but adding `unstable_cache` (Next.js) with tag-based invalidation will make navigation feel instant while keeping data fresh after mutations.

### 1a. Cache Tag Constants (`src/lib/cache/tags.ts`)

Define all cache tags in one place so invalidation is consistent:

```typescript
// src/lib/cache/tags.ts

// Per-user tags
export const userBalancesTag = (userId: string) => `balances:${userId}`;
export const userHistoryTag = (userId: string) => `history:${userId}`;
export const userNotificationsTag = (userId: string) => `notifications:${userId}`;

// Global tags (shared data)
export const PENDING_REQUESTS_TAG = "pending-requests";
export const TEAM_STATS_TAG = "team-stats";
export const CALENDAR_TAG = "calendar";
export const HOLIDAYS_TAG = "holidays";
export const USERS_TAG = "users";
```

### 1b. Wrap Service Functions with `unstable_cache`

For each read operation called from server components, wrap with `unstable_cache` and assign tags. The cached function is called from the server component page; the underlying service function stays unchanged for use in transactions and tests.

**Pattern:**

```typescript
import { unstable_cache } from "next/cache";
import { getBalances } from "@/lib/balances/service";
import { userBalancesTag } from "@/lib/cache/tags";

export const getCachedBalances = (userId: string) =>
  unstable_cache(
    () => getBalances(userId),
    [`balances`, userId],
    { tags: [userBalancesTag(userId)] }
  )();
```

**Functions to cache:**

| Function | File | Cache Tags |
|----------|------|------------|
| `getBalances(userId)` | `balances/service.ts` | `balances:{userId}` |
| `getLeaveHistory(userId, query)` | `leave/service.ts` | `history:{userId}` |
| `getPendingRequests()` | `leave/service.ts` | `pending-requests` |
| `getTeamStats()` | `leave/service.ts` | `team-stats` |
| `getTeamLeaveForMonth(year, month)` | Calendar service | `calendar` |
| `getHolidaysByYear(year)` | `holidays/service.ts` | `holidays` |
| `getUnreadNotifications(userId)` | `notifications/service.ts` | `notifications:{userId}` |
| `getUnreadCount(userId)` | `notifications/service.ts` | `notifications:{userId}` |
| All users list | `users` route | `users` |

### 1c. Invalidate Caches on Mutations

After each mutation, call `revalidateTag()` for the affected tags. This is done in the service layer after the DB write succeeds.

| Mutation | Tags to Invalidate |
|----------|-------------------|
| Submit leave request | `pending-requests`, `team-stats`, `history:{userId}` |
| Approve leave request | `pending-requests`, `team-stats`, `balances:{userId}`, `history:{userId}`, `calendar`, `notifications:{userId}` |
| Decline leave request | `pending-requests`, `team-stats`, `history:{userId}`, `notifications:{userId}` |
| Cancel leave request | `pending-requests`, `team-stats`, `balances:{userId}`, `history:{userId}`, `calendar`, `notifications:{userId}` |
| Adjust balance | `balances:{userId}`, `users` |
| Update user role | `users` |
| Delete user | `users`, `pending-requests`, `team-stats`, `calendar` |
| Create/delete holiday | `holidays`, `calendar` |
| Mark notifications read | `notifications:{userId}` |

### 1d. Update Server Component Pages

Replace direct service calls with cached versions in all server component pages:

```typescript
// Before (e.g., dashboard/page.tsx)
const balances = await getBalances(session.user.id);

// After
const balances = await getCachedBalances(session.user.id);
```

Pages to update:
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/admin/page.tsx`
- `src/app/(app)/calendar/page.tsx`
- `src/app/(app)/dashboard/history/page.tsx`
- `src/app/(app)/admin/users/page.tsx`
- `src/app/(app)/admin/holidays/page.tsx`

---

## Step 2: Loading States & Error Boundaries

### 2a. Loading States

Create `loading.tsx` files for each route that fetches data. These render instantly while the server component awaits data.

```
src/app/(app)/dashboard/loading.tsx
src/app/(app)/admin/loading.tsx
src/app/(app)/calendar/loading.tsx
src/app/(app)/dashboard/history/loading.tsx
src/app/(app)/admin/users/loading.tsx
src/app/(app)/admin/holidays/loading.tsx
```

Each loading file renders skeleton versions of the page content using shadcn `Skeleton` component:

```bash
pnpm dlx shadcn@latest add skeleton --yes
```

**Pattern:**

```tsx
// src/app/(app)/dashboard/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Balance cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      {/* Content skeleton */}
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
```

Tailor each loading file to approximate the actual page layout (cards for dashboard, table rows for history/users, grid for calendar).

### 2b. Error Boundary

Create a shared `error.tsx` at the `(app)` route group level:

```tsx
// src/app/(app)/error.tsx
"use client";

import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm">
        {error.message || "An unexpected error occurred"}
      </p>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
```

### 2c. Empty States

Audit all list/table components and ensure they render a meaningful empty state when data is empty. Most were handled in Phase 4/5 — verify and fill any gaps:

- Calendar with no leave for the month → "No leave scheduled this month"
- Holiday table with no holidays → "No holidays for this year"
- Notification dropdown with no notifications → "You're all caught up"

---

## Step 3: Google Calendar Integration (Nice-to-Have)

This step is optional. If skipped, all leave management still works — the app is the source of truth.

### 3a. Update Auth.js Config — Add Calendar Scope

Modify `src/auth.ts` to request the `calendar.events` scope and store the OAuth refresh token:

```typescript
// In providers array
Google({
  authorization: {
    params: {
      scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
      access_type: "offline",
      prompt: "consent",
    },
  },
}),
```

The `access_type: "offline"` ensures we get a `refresh_token` stored in the `Account` model (already handled by PrismaAdapter). The `prompt: "consent"` forces the consent screen so we always get a refresh token.

### 3b. Google Calendar Service (`src/lib/google-calendar/service.ts`)

```typescript
import { prisma } from "@/lib/db/client";

interface CalendarEventInput {
  userId: string;
  summary: string;        // "PTO — Connor McDonald" or "Unpaid Leave — Connor McDonald"
  startDate: Date;
  endDate: Date;
  dayType: "FULL" | "MORNING" | "AFTERNOON";
}

/**
 * Get a valid access token for a user by refreshing their OAuth token.
 * Returns null if the user has no Google account linked or refresh fails.
 */
async function getAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { refresh_token: true, access_token: true, expires_at: true },
  });

  if (!account?.refresh_token) return null;

  // Check if current token is still valid (with 5min buffer)
  if (account.expires_at && account.expires_at * 1000 > Date.now() + 300_000) {
    return account.access_token;
  }

  // Refresh the token
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });

  if (!response.ok) return null;

  const tokens = await response.json();

  // Update stored tokens
  await prisma.account.updateMany({
    where: { userId, provider: "google" },
    data: {
      access_token: tokens.access_token,
      expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
    },
  });

  return tokens.access_token;
}

/**
 * Create a Google Calendar event for approved leave.
 * Returns the event ID for later deletion, or null if calendar API is unavailable.
 */
export async function createCalendarEvent(
  input: CalendarEventInput,
): Promise<string | null> {
  const accessToken = await getAccessToken(input.userId);
  if (!accessToken) return null;

  const event = buildEventBody(input);

  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      },
    );

    if (!response.ok) {
      console.error("Failed to create calendar event:", await response.text());
      return null;
    }

    const created = await response.json();
    return created.id;
  } catch (error) {
    console.error("Calendar API error:", error);
    return null;
  }
}

/**
 * Delete a Google Calendar event by ID.
 * Silently fails if the event doesn't exist or API is unavailable.
 */
export async function deleteCalendarEvent(
  userId: string,
  eventId: string,
): Promise<void> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) return;

  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  } catch (error) {
    console.error("Calendar event deletion error:", error);
  }
}

function buildEventBody(input: CalendarEventInput) {
  const { summary, startDate, endDate, dayType } = input;

  if (dayType === "FULL") {
    // All-day event(s)
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1); // Google all-day end is exclusive
    return {
      summary,
      start: { date: toDateString(startDate) },
      end: { date: toDateString(end) },
      transparency: "opaque",
    };
  }

  // Half-day event (single day guaranteed by validation)
  const dateStr = toDateString(startDate);
  const startTime = dayType === "MORNING" ? "08:00:00" : "12:00:00";
  const endTime = dayType === "MORNING" ? "12:00:00" : "17:00:00";

  return {
    summary,
    start: { dateTime: `${dateStr}T${startTime}`, timeZone: "Africa/Johannesburg" },
    end: { dateTime: `${dateStr}T${endTime}`, timeZone: "Africa/Johannesburg" },
    transparency: "opaque",
  };
}

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}
```

### 3c. Schema Change — Store Calendar Event ID

Add a `calendarEventId` field to `LeaveRequest` to track the Google Calendar event for deletion on cancel:

```prisma
model LeaveRequest {
  // ... existing fields ...
  calendarEventId String? @map("calendar_event_id")
}
```

Migration: `pnpm prisma migrate dev --name add-calendar-event-id`

### 3d. Integrate with Leave Approval/Cancel

Modify `src/lib/leave/service.ts`:

**In `approveLeaveRequest()`** — after setting status to APPROVED and deducting balance:

```typescript
// After the transaction, attempt calendar event creation (non-blocking)
const user = await prisma.user.findUnique({
  where: { id: request.userId },
  select: { name: true, email: true },
});

const eventId = await createCalendarEvent({
  userId: request.userId,
  summary: `${request.leaveType === "PAID_ANNUAL" ? "PTO" : "Unpaid Leave"} — ${user?.name ?? user?.email}`,
  startDate: request.startDate,
  endDate: request.endDate,
  dayType: request.dayType,
});

if (eventId) {
  await prisma.leaveRequest.update({
    where: { id: request.id },
    data: { calendarEventId: eventId },
  });
}
```

**In `cancelLeaveRequest()`** — if the request was APPROVED and has a `calendarEventId`:

```typescript
if (request.calendarEventId) {
  await deleteCalendarEvent(request.userId, request.calendarEventId);
}
```

### 3e. CSP Update

Add Google Calendar API to the CSP `connect-src` in `next.config.ts`:

```typescript
"connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
```

### 3f. Key Design Decisions (Google Calendar)

1. **Non-blocking.** If the Calendar API fails, the leave approval still succeeds. The app is the source of truth.
2. **Employee's primary calendar only.** No admin calendar copy — keeps scope simple and avoids needing admin tokens.
3. **Africa/Johannesburg timezone** for half-day events (team is SA-based).
4. **`prompt: "consent"`** forces refresh token issuance. Existing users will need to re-consent once.
5. **No opt-in per user.** The scope is requested at login. If this is too aggressive, this can be gated behind an env var `ENABLE_GOOGLE_CALENDAR=true`.

---

## Step 4: Testing Suite

### 4a. Vitest Configuration

Already configured in Phase 1 (`vitest.config.ts`). Verify coverage thresholds:

```typescript
// vitest.config.ts — update coverage section
coverage: {
  provider: "v8",
  include: ["src/lib/**/*.ts"],
  exclude: [
    "src/lib/db/client.ts",
    "src/lib/cache/**",
    "src/lib/google-calendar/**",
    "src/lib/api/client.ts",
  ],
},
```

Exclude cache wrappers (thin delegation), Google Calendar service (external API), and client-side API helpers (fetch wrappers) from coverage.

### 4b. Existing Tests (Phase 3 + Phase 5)

Already passing:
- `src/lib/api/utils.test.ts` — error handler mapping
- `src/lib/validators/leave.test.ts` — all 6 leave validation schemas
- `src/lib/leave/calculations.test.ts` — day counting, balance math, holiday overlap
- `src/lib/leave/notifications.test.ts` — notification creation helpers
- `src/lib/leave/service.test.ts` — all leave operations (submit, cancel, approve, decline, history, pending)
- `src/lib/balances/service.test.ts` — balance queries and adjustments
- `src/lib/balances/carryover.test.ts` — year-end carryover
- `src/lib/rbac/permissions.test.ts` — RBAC permission checks
- `src/lib/auth/session.test.ts` — session helpers
- Phase 5 validator + service tests (holidays, notifications, user deletion)

### 4c. New Tests to Add

Fill coverage gaps from Phase 4 and Phase 5 that weren't fully tested:

| Test File | What to Test |
|-----------|-------------|
| `src/lib/leave/calculations.test.ts` | Add edge cases: leap year handling, requests spanning year boundaries, half-day on public holiday |
| `src/lib/holidays/service.test.ts` | Verify: duplicate date rejection, year derivation from date, ordering by date asc |
| `src/lib/notifications/service.test.ts` | Verify: limit 20 enforcement, userId scoping on mark-as-read, markAllAsRead |
| `src/lib/users/service.test.ts` | Verify: last-admin protection, cascade delete expectation, self-delete vs admin-delete |
| `src/lib/validators/holidays.test.ts` | Valid/invalid inputs for HolidayQuerySchema, CreateHolidaySchema, CalendarQuerySchema |
| `src/lib/validators/notifications.test.ts` | MarkReadSchema with ids, with all, with neither (should fail) |
| `src/lib/validators/users.test.ts` | DeleteUserParamSchema, UpdateRoleSchema |

### 4d. Easter Calculation Tests

The Easter date algorithm in the seed script is critical for public holiday accuracy. Extract it to a testable module if not already:

**`src/lib/holidays/easter.ts`** — extract the Anonymous Gregorian algorithm from `prisma/seed.mts` into a reusable, testable function.

**`src/lib/holidays/easter.test.ts`:**

```typescript
import { describe, it, expect } from "vitest";
import { getEasterDate } from "./easter";

describe("getEasterDate", () => {
  it("returns correct Easter dates for known years", () => {
    // Known Easter Sunday dates
    expect(getEasterDate(2024)).toEqual(new Date(2024, 2, 31)); // March 31
    expect(getEasterDate(2025)).toEqual(new Date(2025, 3, 20)); // April 20
    expect(getEasterDate(2026)).toEqual(new Date(2026, 3, 5));  // April 5
    expect(getEasterDate(2027)).toEqual(new Date(2027, 2, 28)); // March 28
  });

  it("handles edge case years", () => {
    expect(getEasterDate(2000)).toEqual(new Date(2000, 3, 23)); // April 23
    expect(getEasterDate(2100)).toEqual(new Date(2100, 2, 28)); // March 28
  });
});
```

### 4e. Run All Tests

```bash
pnpm test
pnpm test:coverage
```

Target: all tests passing, >80% coverage on `src/lib/**/*.ts`.

---

## Step 5: CI Pipeline — GitHub Actions

### 5a. CI Workflow (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Test
        run: pnpm test:coverage
```

### 5b. Key CI Decisions

1. **No database in CI.** All tests use mocked Prisma (global mock in `src/tests/setup.ts`). No Docker/Postgres needed.
2. **pnpm 10** — matches local dev. Uses `pnpm/action-setup` for caching.
3. **Node 22** — matches local dev (LTS).
4. **`--frozen-lockfile`** — ensures CI uses the exact lockfile, no resolution drift.
5. **Coverage runs in CI** to catch untested code, but no enforced threshold initially.

---

## Step 6: Pre-Commit Hooks

The pre-commit hook already exists at `.githooks/pre-commit` from Phase 1. Verify it matches:

```bash
#!/bin/sh
set -e

echo "Running lint..."
pnpm lint

echo "Running type check..."
npx tsc --noEmit

echo "Running tests..."
pnpm test
```

The `prepare` script in `package.json` (`git config core.hooksPath .githooks`) ensures it's active after `pnpm install`.

No changes needed unless the hook is missing or incomplete.

---

## Step 7: Deployment — Vercel + Neon

### 7a. Neon Postgres Setup

1. Create a Neon project at neon.tech
2. Create a database named `notin`
3. Copy the connection string (pooled endpoint recommended for serverless)

### 7b. Vercel Project Setup

1. Import the GitHub repository into Vercel
2. Framework preset: Next.js (auto-detected)
3. Build command: `prisma generate && prisma migrate deploy && next build`
4. Output directory: `.next` (default)
5. Node.js version: 22.x

### 7c. Environment Variables (Vercel Dashboard)

Set these in the Vercel project settings:

```env
DATABASE_URL=postgresql://...@...neon.tech/notin?sslmode=require
AUTH_SECRET=<generate with `npx auth secret`>
AUTH_GOOGLE_ID=<production OAuth client ID>
AUTH_GOOGLE_SECRET=<production OAuth client secret>
AUTH_URL=https://notin.thoughtlab.studio
```

**Google OAuth production setup:**
1. In Google Cloud Console, add the production callback URL: `https://notin.thoughtlab.studio/api/auth/callback/google`
2. Move OAuth consent screen out of "Testing" mode to "In production" (or add all team members as test users)
3. If using Google Calendar scope, submit for verification or keep in testing mode with explicit test users

### 7d. Production Seed

The seed script should have a "production" mode that only creates:
1. Initial admin user(s)
2. SA public holidays for the current + next year

No sample employees or test leave requests in production.

Add a check to `prisma/seed.mts`:

```typescript
const isProduction = process.env.NODE_ENV === "production";

async function main() {
  // Always create: admin users + public holidays
  await seedAdminUsers();
  await seedPublicHolidays();

  // Dev only: sample employees, balances, leave requests
  if (!isProduction) {
    await seedSampleEmployees();
    await seedSampleLeaveRequests();
  }
}
```

### 7e. Vercel Auto-Deploy

- Push to `main` → automatic production deploy
- PR branches → automatic preview deploys (useful for review)
- Preview deploys use the same env vars unless overridden per branch

### 7f. DNS Setup

Point `notin.thoughtlab.studio` (or chosen domain) to Vercel:
- Add domain in Vercel project settings
- Add CNAME record: `notin` → `cname.vercel-dns.com`

---

## Step 8: Security Audit

### 8a. Verify Security Headers

The security headers from Phase 1 should already be in `next.config.ts`. Verify the final production-ready CSP:

```typescript
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://accounts.google.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
  "worker-src 'self'",
  "frame-src https://accounts.google.com",
  "frame-ancestors 'none'",
  "form-action 'self' https://accounts.google.com",
  "base-uri 'self'",
];
```

### 8b. Auth Security Checklist

- [ ] `AUTH_SECRET` is unique, random, and not committed to git
- [ ] Domain restriction rejects non-`@thoughtlab.studio` emails in production
- [ ] `DEV_EMAILS` array in `src/auth.ts` is only checked when `NODE_ENV === "development"`
- [ ] All API routes call `requireSession()` or `requirePermission()` — not just proxy
- [ ] Admin routes check `requireAdmin()` or `requirePermission("users:manage")` etc.
- [ ] Last-admin protection prevents locking out all admins
- [ ] CSRF protection via Auth.js (built-in with JWT strategy)

### 8c. Data Security

- [ ] `.env` is in `.gitignore`
- [ ] `src/generated` is in `.gitignore`
- [ ] No secrets in client-side code (all OAuth credentials server-only)
- [ ] Database connection uses SSL in production (`?sslmode=require`)

---

## Step 9: Final Polish

### 9a. Responsive Audit

Walk through every page on mobile (< 640px), tablet (768px), and desktop (1024px+):

- Dashboard balance cards: stack correctly
- Leave request form: full-width on mobile
- Tables: horizontal scroll on mobile
- Calendar: readable on mobile (may need simplified view)
- Dialogs: full-width on mobile
- Bottom nav: doesn't overlap content
- Sidebar: collapses correctly

### 9b. Favicon & Metadata

Verify `src/app/icon.svg` renders correctly as the browser tab icon. Update `src/app/layout.tsx` metadata:

```typescript
export const metadata: Metadata = {
  title: "NotIn — Leave Management",
  description: "Leave management for thoughtlab.studio",
};
```

### 9c. Sign-In Page Polish

- App logo/branding on sign-in page
- Clear error message if Google sign-in is rejected (domain restriction)
- Loading state on sign-in button click

### 9d. Accessibility Quick Pass

- All interactive elements keyboard-navigable
- Form labels associated with inputs (shadcn handles this)
- Color contrast meets WCAG AA (verify theme variables)
- Focus rings visible on all interactive elements

---

## Implementation Steps (Suggested Order)

### Step 1: Cache Layer (highest impact for UX)
1. Create `src/lib/cache/tags.ts` + `index.ts`
2. Add cached wrapper functions alongside existing service functions
3. Add `revalidateTag()` calls to all mutation service functions
4. Update server component pages to use cached functions
5. Verify data stays fresh after mutations

### Step 2: Loading States & Error Boundary
1. Install `skeleton` shadcn component
2. Create `loading.tsx` for all data-fetching routes
3. Create `error.tsx` at `(app)` level
4. Audit empty states

### Step 3: Testing (can parallel with Steps 1-2)
1. Extract Easter function to testable module
2. Write missing test cases
3. Run full coverage report
4. Fix any gaps

### Step 4: Google Calendar (optional, can be deferred)
1. Schema migration for `calendarEventId`
2. Create Google Calendar service
3. Integrate with approve/cancel flows
4. Update CSP
5. Test with real Google account

### Step 5: CI/CD
1. Create `.github/workflows/ci.yml`
2. Push and verify pipeline passes
3. Verify pre-commit hook

### Step 6: Deployment
1. Set up Neon database
2. Set up Vercel project
3. Configure env vars
4. Update seed script for production mode
5. Deploy and verify
6. Configure DNS

### Step 7: Final Polish
1. Responsive audit
2. Security audit
3. Metadata and favicon
4. Accessibility pass

---

## Files Created

```
src/lib/cache/tags.ts                      — Cache tag constants
src/lib/cache/index.ts                     — Barrel export
src/lib/google-calendar/service.ts         — Google Calendar event CRUD (optional)
src/lib/google-calendar/index.ts           — Barrel export (optional)
src/lib/holidays/easter.ts                 — Extracted Easter date algorithm
src/lib/holidays/easter.test.ts            — Easter calculation tests
.github/workflows/ci.yml                   — CI pipeline
src/app/(app)/dashboard/loading.tsx        — Dashboard skeleton
src/app/(app)/admin/loading.tsx            — Admin dashboard skeleton
src/app/(app)/calendar/loading.tsx         — Calendar skeleton
src/app/(app)/dashboard/history/loading.tsx — History skeleton
src/app/(app)/admin/users/loading.tsx      — User management skeleton
src/app/(app)/admin/holidays/loading.tsx   — Holiday management skeleton
src/app/(app)/error.tsx                    — Shared error boundary
```

## Files Modified

```
src/lib/leave/service.ts                   — Add cache invalidation on mutations
src/lib/balances/service.ts                — Add cache invalidation on mutations
src/lib/holidays/service.ts                — Add cache invalidation on mutations
src/lib/notifications/service.ts           — Add cache invalidation on mutations
src/lib/users/service.ts                   — Add cache invalidation on mutations
src/app/(app)/dashboard/page.tsx           — Use cached data fetching
src/app/(app)/admin/page.tsx               — Use cached data fetching
src/app/(app)/calendar/page.tsx            — Use cached data fetching
src/app/(app)/dashboard/history/page.tsx   — Use cached data fetching
src/app/(app)/admin/users/page.tsx         — Use cached data fetching
src/app/(app)/admin/holidays/page.tsx      — Use cached data fetching
src/auth.ts                                — Add calendar scope (if Google Calendar enabled)
next.config.ts                             — Update CSP connect-src (if Google Calendar enabled)
prisma/schema.prisma                       — Add calendarEventId field (if Google Calendar enabled)
prisma/seed.mts                            — Production seed mode
vitest.config.ts                           — Update coverage exclusions
src/app/layout.tsx                         — Verify metadata
.githooks/pre-commit                       — Verify complete
```

---

## Key Design Decisions

1. **`unstable_cache` with tag-based invalidation.** Next.js built-in, no extra dependencies. Tags allow surgical invalidation — approve a request and only the affected user's balance + the pending list are refreshed, not the entire app.
2. **Cache wrappers as separate functions.** The underlying service functions remain uncached for use in transactions, tests, and non-page contexts. Cached versions are thin wrappers used only in server component pages.
3. **Google Calendar is non-blocking.** Leave approval succeeds regardless of calendar API status. Event creation is fire-and-forget after the transaction commits.
4. **No database in CI.** Mocked Prisma is sufficient — the test suite validates business logic, not SQL queries. Integration tests against a real database would add complexity without proportional value for this app size.
5. **Production seed is minimal.** Only admin users + public holidays. Employees self-register via Google OAuth + domain restriction.
6. **Loading skeletons per route.** Next.js `loading.tsx` convention gives instant visual feedback while server components await data. Matches the layout of each page.
7. **Shared error boundary at `(app)` level.** Catches any server component errors within the authenticated shell. Individual pages don't need their own error boundaries at this scale.

---

## Entry Criteria

- Phase 5 complete (all features working, notifications live, calendar built)

## Exit Criteria

- Server-side caching active — page loads feel instant, data stays fresh after mutations
- Loading skeletons render during data fetches
- Error boundary catches and displays server component errors
- Google Calendar events created on leave approval (if implemented)
- Test suite passes with >80% coverage on `src/lib/**/*.ts`
- CI pipeline runs lint + typecheck + test on every PR
- Pre-commit hook runs lint + typecheck + test locally
- App deployed to Vercel and accessible at production URL
- Neon Postgres provisioned with production seed applied
- Security headers configured and verified
- All pages responsive on mobile, tablet, and desktop
- App usable by the ~12 person team
