# Phase 4 — Dashboard & UI

| Field | Value |
|-------|-------|
| **Scope** | shadcn/ui components, app shell, all pages, leave request form, user management |
| **Detail level** | Detailed |
| **Status** | Planned |

## What This Phase Covers

Build the full UI layer on top of the Phase 3 APIs. Create the app shell (sidebar/bottom nav), implement all pages (employee dashboard, admin dashboard, leave request form, leave history, user management), and wire them to the existing API routes. By the end of this phase, employees and admins can use the app end-to-end through the browser.

## Architecture

Two-layer design: **server components** (data fetching via service layer) → **client components** (interactions, forms, toasts).

```
src/app/(app)/layout.tsx              — App shell with sidebar + bottom nav
src/app/(app)/dashboard/page.tsx      — Employee dashboard (balances, upcoming, pending)
src/app/(app)/dashboard/request/page.tsx — Leave request form
src/app/(app)/dashboard/history/page.tsx — Leave history table
src/app/(app)/admin/page.tsx          — Admin dashboard (pending approvals, team stats)
src/app/(app)/admin/users/page.tsx    — User management (role toggle, allowance)
src/components/layout/app-sidebar.tsx — Desktop sidebar navigation
src/components/layout/bottom-nav.tsx  — Mobile bottom navigation
src/components/layout/header.tsx      — Top header with user info + sign out
src/components/dashboard/balance-cards.tsx   — Leave balance display cards
src/components/dashboard/upcoming-leave.tsx  — Upcoming approved leave list
src/components/dashboard/pending-requests.tsx — Own pending requests
src/components/leave/request-form.tsx        — Leave request form (date picker, type, day type, note)
src/components/leave/history-table.tsx       — Leave history with status badges + cancel action
src/components/leave/status-badge.tsx        — Reusable status badge (PENDING/APPROVED/DECLINED/CANCELLED)
src/components/admin/pending-approvals.tsx   — Pending requests with approve/decline actions
src/components/admin/team-stats.tsx          — Team summary statistics
src/components/admin/user-table.tsx          — User list with role toggle + allowance setting
src/components/admin/approve-dialog.tsx      — Approve confirmation dialog
src/components/admin/decline-dialog.tsx      — Decline dialog with reason input
src/lib/api/client.ts                        — Client-side fetch helpers for API routes
```

## Existing State

Already built (Phase 1–3):
- **shadcn/ui initialized** — `components.json` (base-nova style, neutral base, CSS variables), `globals.css` with full theme
- **shadcn components installed** — `Button`, `Card`, `Badge`, `Separator`
- **Auth working** — `src/auth.ts`, `src/proxy.ts`, `useRbac` hook, `requireSession`/`requirePermission` helpers
- **All leave APIs** — request, cancel, approve, decline, history, pending, balances, balance adjust
- **Placeholder dashboard** — `src/app/dashboard/page.tsx` with static cards (to be replaced)

---

## Step 1: Install shadcn Components

```bash
pnpm dlx shadcn@latest add sidebar-01 --yes
pnpm dlx shadcn@latest add calendar dialog form input label select sheet table tabs textarea toast sonner --yes
```

Components needed and their purpose:

| Component | Used For |
|-----------|----------|
| `Sidebar` | Desktop navigation (from sidebar-01 block) |
| `Sheet` | Mobile sidebar drawer |
| `Calendar` | Date picker in leave request form |
| `Dialog` | Approve/decline confirmation dialogs |
| `Form` | Leave request form wrapper (react-hook-form integration) |
| `Input` | Text inputs (search, allowance) |
| `Label` | Form field labels |
| `Select` | Leave type, day type dropdowns |
| `Table` | Leave history, user management |
| `Tabs` | Dashboard section switching (if needed) |
| `Textarea` | Note field, decline reason |
| `Sonner` | Toast notifications |

Also install required peer dependencies:

```bash
pnpm add react-hook-form @hookform/resolvers sonner date-fns
```

- `react-hook-form` + `@hookform/resolvers` — form state management with Zod validation
- `sonner` — toast notification library (shadcn Toast uses it)
- `date-fns` — date formatting and manipulation for display

---

## Step 2: Client-Side API Helpers (`src/lib/api/client.ts`)

Thin fetch wrappers that call the Phase 3 API routes. All return parsed JSON or throw.

```typescript
// src/lib/api/client.ts

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

// Leave
export const submitLeaveRequest = (body: LeaveRequestPayload) =>
  api<{ data: LeaveRequest; warnings: string[] }>("/api/leave/request", {
    method: "POST", body: JSON.stringify(body),
  });

export const cancelLeaveRequest = (requestId: string) =>
  api<{ data: LeaveRequest }>("/api/leave/cancel", {
    method: "POST", body: JSON.stringify({ requestId }),
  });

export const approveLeaveRequest = (requestId: string) =>
  api<{ data: LeaveRequest }>("/api/leave/approve", {
    method: "POST", body: JSON.stringify({ requestId }),
  });

export const declineLeaveRequest = (requestId: string, reason: string) =>
  api<{ data: LeaveRequest }>("/api/leave/decline", {
    method: "POST", body: JSON.stringify({ requestId, reason }),
  });

export const fetchLeaveHistory = (params?: URLSearchParams) =>
  api<{ data: LeaveRequest[]; total: number }>(
    `/api/leave/history${params ? `?${params}` : ""}`
  );

export const fetchPendingRequests = () =>
  api<{ data: LeaveRequest[] }>("/api/leave/pending");

// Balances
export const fetchBalances = () =>
  api<{ data: LeaveBalance[] }>("/api/balances");

export const adjustBalance = (body: BalanceAdjustPayload) =>
  api<{ data: { balance: LeaveBalance; adjustment: BalanceAdjustment } }>(
    "/api/balances/adjust", { method: "POST", body: JSON.stringify(body) }
  );
```

Type definitions reference the Prisma types — import from `@/generated/prisma/client` or define lightweight client-side types matching the API response shapes.

### New API Route: User List

Phase 3 does not include a user list endpoint. Add one for the admin user management page:

**`src/app/api/users/route.ts`** — `GET`, requires `users:read` permission. Returns all users with their current-year leave balance.

**`src/app/api/users/[id]/role/route.ts`** — `PATCH`, requires `users:manage` permission. Updates a user's role.

```
src/app/api/users/route.ts            — GET: list all users with balances
src/app/api/users/[id]/role/route.ts  — PATCH: update user role
```

Validation schemas to add to `src/lib/validators/users.ts`:

| Schema | Purpose |
|--------|---------|
| `UpdateRoleSchema` | `{ role: z.enum(["ADMIN", "EMPLOYEE"]) }` |

---

## Step 3: Route Group + App Shell Layout

### 3a. Route Group `(app)`

Move all authenticated pages under a `(app)` route group to share the app shell layout without affecting URL paths.

```
src/app/(app)/layout.tsx          — App shell (sidebar + header + main content area)
src/app/(app)/dashboard/page.tsx  — /dashboard
src/app/(app)/dashboard/request/page.tsx  — /dashboard/request
src/app/(app)/dashboard/history/page.tsx  — /dashboard/history
src/app/(app)/admin/page.tsx      — /admin
src/app/(app)/admin/users/page.tsx — /admin/users
```

The existing `src/app/dashboard/page.tsx` moves into the route group. The root `src/app/page.tsx` redirects to `/dashboard`.

### 3b. App Shell Layout (`src/app/(app)/layout.tsx`)

Server component that reads the session and renders the shell:

```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "sonner";

export default async function AppLayout({ children }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar user={session.user} />
        <div className="flex flex-1 flex-col">
          <Header user={session.user} />
          <main className="flex-1 p-6">{children}</main>
          <BottomNav user={session.user} />
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}
```

### 3c. Root Page Redirect

Update `src/app/page.tsx` to redirect to `/dashboard`:

```tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/dashboard");
}
```

---

## Step 4: Navigation Components

### 4a. Sidebar (`src/components/layout/app-sidebar.tsx`)

Client component using shadcn `Sidebar`. Visible on `md:` breakpoint and above, hidden on mobile.

**Nav items (all roles):**
| Icon | Label | Href |
|------|-------|------|
| `LayoutDashboard` | Dashboard | `/dashboard` |
| `PlaneTakeoff` | Request Leave | `/dashboard/request` |
| `Clock` | History | `/dashboard/history` |

**Admin-only nav items** (shown when `role === "ADMIN"`):
| Icon | Label | Href |
|------|-------|------|
| `ShieldCheck` | Approvals | `/admin` |
| `Users` | Manage Users | `/admin/users` |

Active state: highlight current route using `usePathname()`.

Footer: App name "NotIn" + version/tagline.

### 4b. Bottom Nav (`src/components/layout/bottom-nav.tsx`)

Client component. Visible on mobile (`md:hidden`), fixed to bottom. Shows the same nav items as sidebar with icons only + active indicator.

### 4c. Header (`src/components/layout/header.tsx`)

Server component. Shows:
- Mobile sidebar trigger (hamburger menu on `md:hidden`)
- Page breadcrumb or title
- User name + role badge + `SignOutButton`

---

## Step 5: Employee Dashboard (`/dashboard`)

Server component that fetches data and renders client sub-components.

### Data Fetching

```typescript
const session = await auth();
const balances = await getBalances(session.user.id);
const historyResult = await getLeaveHistory(session.user.id, {
  status: "PENDING", page: 1, limit: 5,
});
const upcomingResult = await getLeaveHistory(session.user.id, {
  status: "APPROVED", page: 1, limit: 5,
});
```

Direct service calls (not fetch) since this is a server component.

### Sub-Components

**`BalanceCards`** — Displays current year balance as cards:
- **Total Allowance** — `annualAllowance + carriedOver`
- **Used** — `usedDays`
- **Remaining** — `annualAllowance + carriedOver - usedDays`
- **Carried Over** — `carriedOver` (if > 0)

Each card uses `Card` component with an icon, label, and large number. Use `chart-1` through `chart-4` color variables for card accents.

If no balance record exists for the current year, show a "No balance set" message.

**`UpcomingLeave`** — List of APPROVED requests with start/end dates, leave type, day type. Uses `Card` items. Shows "No upcoming leave" empty state.

**`PendingRequests`** — List of own PENDING requests with a cancel action button. Each item shows dates, type, and a "Cancel" button that calls the cancel API + shows toast. Shows "No pending requests" empty state.

**Quick action:** "Request Leave" button linking to `/dashboard/request`.

---

## Step 6: Leave Request Form (`/dashboard/request`)

Client component using `react-hook-form` with Zod resolver for client-side validation. Reuses the existing `LeaveRequestSchema` from `src/lib/validators/leave.ts`.

### Form Fields

| Field | Component | Details |
|-------|-----------|---------|
| Leave Type | `Select` | Options: "Paid Annual", "Unpaid" |
| Start Date | `Calendar` (popover) | Cannot select dates in the past or today (1-day notice) |
| End Date | `Calendar` (popover) | Must be >= start date |
| Day Type | `Select` | Options: "Full Day", "Morning (08:00–12:00)", "Afternoon (12:00–17:00)". Only enabled when start date = end date (half-day = single day per Phase 3 rule) |
| Note | `Textarea` | Optional, max 500 chars, placeholder "Reason for leave (optional)" |

### Behavior

1. Form validates with Zod on submit
2. Calls `POST /api/leave/request` via client-side fetch
3. On success: show toast ("Leave request submitted"), redirect to `/dashboard`
4. On success with warnings: show warning toast with the public holiday overlap message
5. On error: show error toast with the API error message (insufficient balance, minimum notice, etc.)
6. Submit button shows loading spinner during request

### Day Calculation Preview

Below the date fields, show a read-only "Days" preview that calculates the business days based on selected dates and day type. Uses the same logic as `calculateLeaveDays` — implement a lightweight client-side version or display after server validation.

---

## Step 7: Leave History (`/dashboard/history`)

Server component with client-side filtering.

### Data

Calls `getLeaveHistory()` server-side with pagination. Default: all statuses, current year, page 1, limit 20.

### Layout

**Filters bar** (client component):
- Status filter: `Select` with options All, Pending, Approved, Declined, Cancelled
- Leave type filter: `Select` with options All, Paid Annual, Unpaid
- Year filter: `Select` with current year default

Changing filters triggers a client-side fetch to `/api/leave/history?status=...&leaveType=...&year=...`.

**Table** using shadcn `Table`:

| Column | Content |
|--------|---------|
| Dates | `startDate – endDate` formatted as "10 Apr – 14 Apr 2026" |
| Type | "Paid Annual" or "Unpaid" |
| Day Type | "Full" / "Morning" / "Afternoon" |
| Days | Calculated day count |
| Status | `StatusBadge` component |
| Actions | "Cancel" button (only for PENDING/APPROVED requests) |

**Pagination:** Previous/Next buttons with page count.

### StatusBadge Component (`src/components/leave/status-badge.tsx`)

Maps `LeaveStatus` to badge variant:

| Status | Variant | Color intention |
|--------|---------|-----------------|
| PENDING | `outline` | Default/neutral |
| APPROVED | `default` | Primary/green |
| DECLINED | `destructive` | Red |
| CANCELLED | `secondary` | Muted/gray |

---

## Step 8: Admin Dashboard (`/admin`)

Server component. Only accessible to `ADMIN` role (enforced by `proxy.ts`).

### Data Fetching

```typescript
const pendingRequests = await getPendingRequests();
// Also fetch team stats: total employees, total pending, leave today count
const teamStats = await getTeamStats(); // New service function
```

### New Service Function: `getTeamStats()`

Add to `src/lib/leave/service.ts`:

```typescript
export async function getTeamStats(): Promise<{
  totalEmployees: number;
  pendingCount: number;
  onLeaveToday: number;
}> {
  // Count users, count PENDING requests, count APPROVED requests where today falls between start and end date
}
```

### Layout

**Stats cards row:**
- Total Employees (count)
- Pending Requests (count, links to section below)
- On Leave Today (count of people with approved leave covering today)

**Pending Approvals section** — `PendingApprovals` component:

For each pending request, show a card with:
- Employee name + avatar placeholder (first letter)
- Leave type + dates + day count
- Note (if present)
- "Approve" button → opens `ApproveDialog`
- "Decline" button → opens `DeclineDialog`

### ApproveDialog (`src/components/admin/approve-dialog.tsx`)

Client component. `Dialog` with:
- Request summary (employee name, dates, type)
- Confirm/Cancel buttons
- On confirm: calls `POST /api/leave/approve`, shows success toast, refreshes data

### DeclineDialog (`src/components/admin/decline-dialog.tsx`)

Client component. `Dialog` with:
- Request summary
- `Textarea` for decline reason (required, 1–500 chars — matches `LeaveDeclineSchema`)
- Confirm/Cancel buttons
- On confirm: calls `POST /api/leave/decline`, shows success toast, refreshes data

---

## Step 9: User Management (`/admin/users`)

Server component. Admin only.

### Data

Fetches all users with their current-year leave balances via `GET /api/users`.

### Layout

**Table** with columns:

| Column | Content |
|--------|---------|
| Name | User name |
| Email | User email |
| Role | `Select` inline toggle between "Admin" and "Employee" |
| Annual Allowance | Editable number (current year) |
| Used | `usedDays` (read-only) |
| Remaining | Calculated (read-only) |
| Actions | "Adjust Balance" button |

**Role Toggle:** Inline `Select` that calls `PATCH /api/users/[id]/role` on change. Shows toast on success.

**Adjust Balance:** Opens a dialog with:
- Current balance display
- Days input (positive = add, negative = subtract, `Float` for half-days)
- Reason input (required)
- Calls `POST /api/balances/adjust` on confirm

---

## Step 10: Toast Notifications

Use `sonner` (via shadcn Sonner component). The `<Toaster>` is rendered in the app shell layout.

| Action | Toast Type | Message |
|--------|-----------|---------|
| Leave request submitted | Success | "Leave request submitted" |
| Leave request submitted with warnings | Warning | "Leave request submitted. Note: {warning}" |
| Leave request cancelled | Success | "Leave request cancelled" |
| Leave request approved | Success | "Leave request approved" |
| Leave request declined | Success | "Leave request declined" |
| Role updated | Success | "{Name}'s role updated to {Role}" |
| Balance adjusted | Success | "Balance adjusted for {Name}" |
| API error | Error | Error message from API |

---

## Step 11: Responsive Design

### Breakpoint Strategy

| Breakpoint | Layout |
|-----------|--------|
| `< md` (mobile) | No sidebar, bottom nav visible, single-column layouts, stacked cards |
| `>= md` (tablet) | Sidebar visible, bottom nav hidden, two-column grids where appropriate |
| `>= lg` (desktop) | Full sidebar, three-column balance card grid |

### Key Responsive Patterns

- **Balance cards:** 1 col mobile → 2 col tablet → 3 col desktop (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- **Tables:** Horizontal scroll on mobile with `overflow-x-auto`
- **Forms:** Full-width on mobile, max-width constrained on desktop (`max-w-lg mx-auto`)
- **Dialogs:** Full-screen sheet on mobile, centered dialog on desktop (shadcn handles this via `Dialog` responsive behavior)
- **Admin stats cards:** Stack on mobile, row on desktop

---

## Files Created

```
src/lib/api/client.ts                          — Client-side API fetch helpers
src/lib/validators/users.ts                    — User management Zod schemas
src/app/api/users/route.ts                     — GET: list users with balances
src/app/api/users/[id]/role/route.ts           — PATCH: update user role
src/app/(app)/layout.tsx                       — App shell layout
src/app/(app)/dashboard/page.tsx               — Employee dashboard (replaces existing)
src/app/(app)/dashboard/request/page.tsx       — Leave request form page
src/app/(app)/dashboard/history/page.tsx       — Leave history page
src/app/(app)/admin/page.tsx                   — Admin dashboard
src/app/(app)/admin/users/page.tsx             — User management page
src/components/layout/app-sidebar.tsx          — Desktop sidebar
src/components/layout/bottom-nav.tsx           — Mobile bottom nav
src/components/layout/header.tsx               — App header
src/components/dashboard/balance-cards.tsx     — Balance card display
src/components/dashboard/upcoming-leave.tsx    — Upcoming approved leave list
src/components/dashboard/pending-requests.tsx  — Own pending requests list
src/components/leave/request-form.tsx          — Leave request form
src/components/leave/history-table.tsx         — Leave history table with filters
src/components/leave/status-badge.tsx          — Leave status badge
src/components/admin/pending-approvals.tsx     — Admin pending request list
src/components/admin/team-stats.tsx            — Team summary stats cards
src/components/admin/user-table.tsx            — User management table
src/components/admin/approve-dialog.tsx        — Approve confirmation dialog
src/components/admin/decline-dialog.tsx        — Decline dialog with reason
```

## Files Modified

```
src/app/page.tsx                — Redirect to /dashboard
src/app/layout.tsx              — Add Toaster if not in (app) layout
src/lib/leave/service.ts        — Add getTeamStats() function
src/lib/AGENTS.md               — Document new api/client module
```

## Files Removed

```
src/app/dashboard/page.tsx      — Replaced by src/app/(app)/dashboard/page.tsx
```

---

## Key Design Decisions

1. **Route group `(app)` for shared shell.** All authenticated pages share sidebar/header/bottom-nav via a layout. The `sign-in` page remains outside the group with no shell.
2. **Server components for data fetching, client components for interactions.** Dashboard pages are server components that call service functions directly (no fetch round-trip). Forms and interactive elements are client components that call API routes.
3. **`react-hook-form` + Zod resolver for forms.** Reuses the existing Zod schemas from `src/lib/validators/leave.ts` for client-side validation. Server still validates independently.
4. **`sonner` for toasts.** shadcn's recommended toast library. Lightweight, supports rich colors, integrates cleanly.
5. **Inline role/allowance editing.** User management table allows inline editing rather than separate edit pages — simpler UX for ~12 users.
6. **New user API routes.** Phase 3 didn't include user list/role update endpoints. These are thin wrappers added in this phase.
7. **`date-fns` for display formatting.** Used only for formatting dates in the UI (e.g., "10 Apr 2026"). Business logic date calculations remain in `src/lib/leave/calculations.ts`.
8. **No client-side caching/SWR.** For ~12 users, simple fetch + `router.refresh()` after mutations is sufficient. No need for React Query or SWR complexity.

---

## Entry Criteria

- Phase 3 complete (all leave APIs working and tested) ✅

## Exit Criteria

- Employee can request leave through the form and see it in their pending requests
- Employee can view leave balances on the dashboard
- Employee can view leave history with status filters
- Employee can cancel pending/approved requests from history
- Admin can view and approve/decline pending requests with confirmation dialogs
- Admin can manage users (toggle roles, adjust balances) from the user management page
- Navigation shows correct items based on role (admin items hidden for employees)
- All pages are responsive (mobile bottom nav, desktop sidebar)
- Toast confirmations appear for all actions (submit, cancel, approve, decline, role change, balance adjust)
- Root `/` redirects to `/dashboard`
