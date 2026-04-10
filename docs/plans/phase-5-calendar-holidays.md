# Phase 5 — Calendar, Holidays, Notifications & Account Deletion

| Field            | Value                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| **Scope**        | Team calendar, public holiday management, in-app notification UI, account deletion |
| **Detail level** | Detailed                                                                        |
| **Status**       | Planned                                                                         |

## What This Phase Covers

Add the team calendar view, public holiday admin management, in-app notification UI (bell icon + dropdown + polling), and account deletion (self + admin). By the end of this phase, the team can see who's out at a glance, public holidays are visible and manageable, users receive and read notifications, and accounts can be cleanly deleted.

## Architecture

Follows the established three-layer pattern: **validators** (Zod) → **services** (business logic + DB) → **routes** (thin HTTP wrappers). New pages are server components; interactive children are client components.

```
prisma/schema.prisma                          # MODIFY — Notification-User relation, cascade deletes

src/lib/validators/holidays.ts                # NEW — HolidayQuerySchema, CreateHolidaySchema
src/lib/validators/notifications.ts           # NEW — MarkReadSchema
src/lib/validators/users.ts                   # MODIFY — add DeleteUserParamSchema
src/lib/validators/index.ts                   # MODIFY — re-export new schemas

src/lib/holidays/service.ts                   # NEW — holiday CRUD business logic
src/lib/holidays/index.ts                     # NEW — barrel export
src/lib/notifications/service.ts              # NEW — notification query/mark-read logic
src/lib/notifications/index.ts                # NEW — barrel export
src/lib/users/service.ts                      # NEW — user deletion business logic
src/lib/users/index.ts                        # NEW — barrel export

src/lib/api/client.ts                         # MODIFY — add holiday, notification, calendar, deletion helpers

src/app/api/holidays/route.ts                 # NEW — GET (list), POST (create)
src/app/api/holidays/[id]/route.ts            # NEW — DELETE
src/app/api/notifications/route.ts            # NEW — GET (unread for current user)
src/app/api/notifications/read/route.ts       # NEW — POST (mark as read)
src/app/api/calendar/route.ts                 # NEW — GET (team leave + holidays for a month)
src/app/api/users/[id]/route.ts               # NEW — DELETE (admin delete user)
src/app/api/account/route.ts                  # NEW — DELETE (self-delete)

src/hooks/use-notifications.ts                # NEW — polling hook (30s + page focus)

src/components/notifications/notification-bell.tsx      # NEW — bell icon + badge
src/components/notifications/notification-dropdown.tsx  # NEW — popover with list
src/components/notifications/notification-item.tsx      # NEW — single notification row
src/components/calendar/team-calendar.tsx                # NEW — custom month grid
src/components/calendar/calendar-day-cell.tsx            # NEW — individual day cell
src/components/calendar/calendar-legend.tsx              # NEW — user color legend
src/components/holidays/holiday-table.tsx                # NEW — year-filterable list
src/components/holidays/add-holiday-dialog.tsx           # NEW — dialog for adding custom holiday
src/components/settings/delete-account-card.tsx          # NEW — self-deletion with confirmation
src/components/admin/delete-user-dialog.tsx              # NEW — admin user deletion confirmation

src/app/(app)/calendar/page.tsx               # NEW — team calendar page
src/app/(app)/admin/holidays/page.tsx         # NEW — holiday management page
src/app/(app)/settings/page.tsx               # NEW — account settings page

src/components/layout/header.tsx              # MODIFY — add NotificationBell
src/components/layout/app-sidebar.tsx         # MODIFY — add Calendar, Settings, Holidays links
src/components/layout/bottom-nav.tsx          # MODIFY — add Calendar link
src/components/admin/user-table.tsx           # MODIFY — add delete user button
```

## Schema Changes

The `Notification` model has a `userId` field but no Prisma relation to `User`. Add the relation, and add `onDelete: Cascade` to all User relations so account deletion cleans up automatically.

**In `User` model — add:**
```prisma
notifications Notification[]
```

**In `Notification` model — add:**
```prisma
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
```

**In `LeaveRequest` model — change existing relation to:**
```prisma
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
```

**In `LeaveBalance` model — change existing relation to:**
```prisma
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
```

(`Account` and `Session` already have `onDelete: Cascade`.)

**Migration:** `pnpm prisma migrate dev --name notification-user-relation-cascade-deletes`

## API Routes

| Route | Method | Permission | Description |
|-------|--------|------------|-------------|
| `/api/holidays?year=2026` | GET | Any authenticated | List holidays for a year |
| `/api/holidays` | POST | `holidays:manage` | Add custom holiday (sets `isCustom: true`) |
| `/api/holidays/[id]` | DELETE | `holidays:manage` | Delete a holiday by ID |
| `/api/notifications` | GET | Any authenticated | Unread notifications for current user (max 20) |
| `/api/notifications/read` | POST | Any authenticated | Mark notification(s) as read (by IDs or all) |
| `/api/calendar?year=2026&month=4` | GET | Any authenticated | Team approved leave + holidays for a month |
| `/api/users/[id]` | DELETE | `users:manage` | Admin deletes a user |
| `/api/account` | DELETE | Any authenticated | Self-delete own account |

## Validation Schemas

| Schema | File | Purpose |
|--------|------|---------|
| `HolidayQuerySchema` | `validators/holidays.ts` | `year`: coerce int, min 2020, max 2100 |
| `CreateHolidaySchema` | `validators/holidays.ts` | `date`: coerce date, `name`: string 1-200 chars |
| `MarkReadSchema` | `validators/notifications.ts` | `ids`: optional UUID array (min 1), `all`: optional boolean. Refine: at least one of `ids` or `all` required |
| `CalendarQuerySchema` | `validators/holidays.ts` | `year`: coerce int, `month`: coerce int 1-12 |
| `DeleteUserParamSchema` | `validators/users.ts` | `id`: UUID |

## Business Logic

### Holidays
- **getHolidaysByYear(year):** Returns all `PublicHoliday` records for the year, ordered by date ascending
- **createCustomHoliday(date, name):** Creates `PublicHoliday` with `isCustom: true`, year derived from date. Throws `BUSINESS:` if date already exists (unique constraint)
- **deleteHoliday(id):** Deletes by ID. Throws `Not found` if missing

### Notifications
- **getUnreadNotifications(userId):** Returns unread notifications for the user, ordered by `createdAt` desc, limit 20
- **getUnreadCount(userId):** Returns count of unread notifications for the user
- **markAsRead(userId, ids):** Updates `read: true` for specific notifications. Security: filters by `userId` to prevent marking other users' notifications
- **markAllAsRead(userId):** Updates all unread notifications for the user to `read: true`

### Account/User Deletion
- **deleteUser(targetId, requestingUserId, isAdmin):**
  - Self-delete: `targetId === requestingUserId` — always allowed
  - Admin delete: `isAdmin && targetId !== requestingUserId` — allowed
  - Otherwise: throw Forbidden
  - **Last-admin protection:** If the target user is an ADMIN, check that at least one other ADMIN exists. Throw `BUSINESS:Cannot delete the last admin` if not
  - `onDelete: Cascade` handles cleanup of LeaveRequests, LeaveBalances, Notifications, Accounts, Sessions
  - Note: `reviewedBy` and `adjustedBy` on LeaveRequest/BalanceAdjustment are plain UUID strings (not relations), so they won't cascade — they become orphaned references, which is acceptable for audit trail

### Calendar Data
- **getTeamLeaveForMonth(year, month):** Returns approved leave requests overlapping the month (`status: APPROVED, startDate <= endOfMonth, endDate >= startOfMonth`), includes `user: { select: { id, name, email } }`
- **getHolidaysForMonth(year, month):** Returns public holidays within the month

## Components

### Notification Bell (`notifications/notification-bell.tsx`)
- Client component, placed in header
- Uses `useNotifications` hook for data + polling
- Renders `Bell` icon from lucide-react
- Shows red badge with unread count when > 0
- On click: opens `NotificationDropdown` via shadcn Popover

### Notification Dropdown (`notifications/notification-dropdown.tsx`)
- Popover content showing up to 20 notifications
- "Mark all as read" button at top when unread exist
- Each item is a `NotificationItem`
- Empty state when no notifications

### Notification Item (`notifications/notification-item.tsx`)
- Shows message + relative timestamp (`formatDistanceToNow` from date-fns)
- Unread items: subtle highlight background + blue dot indicator
- Clicking navigates to `link` (if present) and marks as read

### useNotifications Hook (`hooks/use-notifications.ts`)
- Fetches unread notifications on mount
- Re-fetches every 30 seconds via `setInterval`
- Re-fetches on window focus via `visibilitychange` event
- Exposes: `notifications`, `unreadCount`, `markAsRead(ids)`, `markAllAsRead()`, `isLoading`
- Cleans up interval + event listener on unmount

### Team Calendar (`calendar/team-calendar.tsx`)
- Client component receiving initial month data from server component page
- Custom CSS Grid month view: 7 columns (Mon-Sun), rows per week
- Month navigation: prev/next buttons fetch data from `/api/calendar`
- Each day renders a `CalendarDayCell`
- Below the grid: `CalendarLegend` showing user-to-color mapping

### Calendar Day Cell (`calendar/calendar-day-cell.tsx`)
- Shows day number
- Public holidays: distinct background color + holiday name
- Leave entries: colored pills/bars with truncated employee name
- Half-day indicators (AM/PM label on the pill)
- Tooltip on hover showing full details (shadcn Tooltip)

### Calendar Legend (`calendar/calendar-legend.tsx`)
- Maps each user visible in the current month to their assigned color
- Colors from CSS chart variables: `--chart-1` through `--chart-5`, cycling for > 5 users

### Holiday Table (`holidays/holiday-table.tsx`)
- Client component with year selector (dropdown)
- Table columns: Date, Name, Type (Auto/Custom), Actions
- Delete button per row (confirmation via toast or inline)
- Refreshes on year change or after add/delete

### Add Holiday Dialog (`holidays/add-holiday-dialog.tsx`)
- shadcn Dialog with date picker (shadcn Calendar) + name input
- Submit calls `POST /api/holidays`
- Validates via `CreateHolidaySchema` client-side before submit

### Delete Account Card (`settings/delete-account-card.tsx`)
- Card with warning text explaining permanent data loss
- "Delete My Account" button opens confirmation dialog
- Confirmation requires typing email to proceed
- On confirm: calls `DELETE /api/account`, then redirects to `/sign-in`

### Delete User Dialog (`admin/delete-user-dialog.tsx`)
- Confirmation dialog showing target user's name/email
- Warns about permanent data loss
- On confirm: calls `DELETE /api/users/{id}`, then refreshes user list

## Layout Modifications

### Header (`header.tsx`)
- Import `NotificationBell` (client component island within server component)
- Add before user info section: `<NotificationBell />`

### Sidebar (`app-sidebar.tsx`)
- Add to `employeeNav`: `{ label: "Calendar", href: "/calendar", icon: CalendarRange }`
- Add to `employeeNav`: `{ label: "Settings", href: "/settings", icon: Settings }`
- Add to `adminNav`: `{ label: "Holidays", href: "/admin/holidays", icon: CalendarCheck }`

### Bottom Nav (`bottom-nav.tsx`)
- Add to `employeeItems`: `{ label: "Calendar", href: "/calendar", icon: CalendarRange }`

### User Table (`admin/user-table.tsx`)
- Add "Delete" button in Actions column (alongside existing Adjust button)
- Opens `DeleteUserDialog`
- Prevent deleting yourself from the admin table

## Client API Helpers (add to `src/lib/api/client.ts`)

```typescript
// Holidays
fetchHolidays(year: number)
createHoliday(body: { date: string; name: string })
deleteHoliday(id: string)

// Notifications
fetchNotifications()
markNotificationsRead(body: { ids?: string[]; all?: boolean })

// Calendar
fetchCalendarData(year: number, month: number)

// Account / User deletion
deleteAccount()
deleteUser(userId: string)
```

## Key Design Decisions

1. **Custom calendar grid, not shadcn Calendar.** The shadcn Calendar (react-day-picker) is for date selection, not multi-user data display. A custom CSS Grid gives full control over rendering leave bars per person per day.
2. **Calendar data via `/api/calendar` route.** Month navigation fetches from the API for smooth UX instead of triggering full server component re-renders.
3. **Color-coded by person, not leave type.** With ~12 employees and only 2 leave types, per-person coloring is more useful. Uses CSS chart variables (`--chart-1` through `--chart-5`), cycling.
4. **Polling for notifications (30s + page focus).** Explicitly specified in spec. For ~12 users, this is negligible load. No WebSocket/SSE needed.
5. **`onDelete: Cascade` on all User relations.** Postgres handles cleanup automatically on account deletion. Safe because `reviewedBy`/`adjustedBy` are plain UUID strings, not FK relations.
6. **Separate `/api/account` (self-delete) from `/api/users/[id]` (admin delete).** Cleaner permission model — no complex "is this user deleting themselves or someone else?" logic in one route.
7. **Last-admin protection.** Both deletion paths check that at least one other admin would remain.
8. **Header stays server component.** `NotificationBell` is a client component island rendered within it — preserves server rendering for the rest of the header.
9. **No new RBAC permissions needed.** `holidays:manage` already exists for ADMIN. Notification access is scoped to current user implicitly. Calendar read access is for all authenticated users.
10. **Settings page for self-deletion.** Dedicated `/settings` route is cleaner than a profile dropdown. Can later host other user preferences.

## Implementation Steps

### Step 1: Schema Changes + Migration
1a. Modify `prisma/schema.prisma` — add Notification-User relation, add `onDelete: Cascade` to LeaveRequest and LeaveBalance user relations
1b. Run `pnpm prisma migrate dev --name notification-user-relation-cascade-deletes`
1c. Run `pnpm prisma generate`

### Step 2: Validators
2a. Create `src/lib/validators/holidays.ts` — HolidayQuerySchema, CreateHolidaySchema, CalendarQuerySchema
2b. Create `src/lib/validators/notifications.ts` — MarkReadSchema
2c. Modify `src/lib/validators/users.ts` — add DeleteUserParamSchema
2d. Modify `src/lib/validators/index.ts` — re-export new schemas
2e. Write tests: `holidays.test.ts`, `notifications.test.ts`

### Step 3: Services
3a. Create `src/lib/holidays/service.ts` + `index.ts`
3b. Create `src/lib/notifications/service.ts` + `index.ts`
3c. Create `src/lib/users/service.ts` + `index.ts`
3d. Write tests: `holidays/service.test.ts`, `notifications/service.test.ts`, `users/service.test.ts`

### Step 4: API Routes
4a. Create `src/app/api/holidays/route.ts` (GET + POST)
4b. Create `src/app/api/holidays/[id]/route.ts` (DELETE)
4c. Create `src/app/api/notifications/route.ts` (GET)
4d. Create `src/app/api/notifications/read/route.ts` (POST)
4e. Create `src/app/api/calendar/route.ts` (GET)
4f. Create `src/app/api/users/[id]/route.ts` (DELETE)
4g. Create `src/app/api/account/route.ts` (DELETE)

### Step 5: Client API Helpers
5a. Modify `src/lib/api/client.ts` — add all new client helpers

### Step 6: Notification UI
6a. Create `src/hooks/use-notifications.ts`
6b. Create `src/components/notifications/notification-item.tsx`
6c. Create `src/components/notifications/notification-dropdown.tsx`
6d. Create `src/components/notifications/notification-bell.tsx`
6e. Modify `src/components/layout/header.tsx` — add NotificationBell

### Step 7: Team Calendar
7a. Create `src/components/calendar/calendar-day-cell.tsx`
7b. Create `src/components/calendar/calendar-legend.tsx`
7c. Create `src/components/calendar/team-calendar.tsx`
7d. Create `src/app/(app)/calendar/page.tsx`
7e. Modify `src/components/layout/app-sidebar.tsx` — add Calendar link
7f. Modify `src/components/layout/bottom-nav.tsx` — add Calendar link

### Step 8: Holiday Management
8a. Create `src/components/holidays/add-holiday-dialog.tsx`
8b. Create `src/components/holidays/holiday-table.tsx`
8c. Create `src/app/(app)/admin/holidays/page.tsx`
8d. Modify `src/components/layout/app-sidebar.tsx` — add Holidays link to admin nav

### Step 9: Account Deletion
9a. Create `src/components/admin/delete-user-dialog.tsx`
9b. Modify `src/components/admin/user-table.tsx` — add delete button + dialog
9c. Create `src/components/settings/delete-account-card.tsx`
9d. Create `src/app/(app)/settings/page.tsx`
9e. Modify `src/components/layout/app-sidebar.tsx` — add Settings link

## Files Created

```
src/lib/validators/holidays.ts        + holidays.test.ts
src/lib/validators/notifications.ts   + notifications.test.ts
src/lib/holidays/service.ts           + service.test.ts + index.ts
src/lib/notifications/service.ts      + service.test.ts + index.ts
src/lib/users/service.ts              + service.test.ts + index.ts
src/hooks/use-notifications.ts
src/components/notifications/notification-bell.tsx
src/components/notifications/notification-dropdown.tsx
src/components/notifications/notification-item.tsx
src/components/calendar/team-calendar.tsx
src/components/calendar/calendar-day-cell.tsx
src/components/calendar/calendar-legend.tsx
src/components/holidays/holiday-table.tsx
src/components/holidays/add-holiday-dialog.tsx
src/components/settings/delete-account-card.tsx
src/components/admin/delete-user-dialog.tsx
src/app/api/holidays/route.ts
src/app/api/holidays/[id]/route.ts
src/app/api/notifications/route.ts
src/app/api/notifications/read/route.ts
src/app/api/calendar/route.ts
src/app/api/users/[id]/route.ts
src/app/api/account/route.ts
src/app/(app)/calendar/page.tsx
src/app/(app)/admin/holidays/page.tsx
src/app/(app)/settings/page.tsx
```

## Files Modified

```
prisma/schema.prisma                    — Notification-User relation, cascade deletes
src/lib/validators/users.ts             — add DeleteUserParamSchema
src/lib/validators/index.ts             — re-export new schemas
src/lib/api/client.ts                   — add holiday, notification, calendar, deletion helpers
src/components/layout/header.tsx        — add NotificationBell
src/components/layout/app-sidebar.tsx   — add Calendar, Settings, Holidays links
src/components/layout/bottom-nav.tsx    — add Calendar link
src/components/admin/user-table.tsx     — add delete user button + dialog
```

## Test Coverage

- Validator tests: valid/invalid inputs for holiday, notification, and deletion schemas
- Holiday service tests: getByYear ordering, createCustom sets isCustom+year, duplicate date error, delete success + not found
- Notification service tests: getUnread filters by userId + read=false + limits to 20, getUnreadCount, markAsRead only updates own, markAllAsRead
- User deletion tests: self-delete succeeds, admin delete succeeds, non-admin cross-delete forbidden, last-admin blocked
- Estimated: ~40-50 new tests across 5 test files

## Entry Criteria

- Phase 4 complete (all pages built, app is usable end-to-end) ✅
- Notification model and backend notification helpers already exist ✅
- SA public holidays already seeded ✅

## Exit Criteria

- Team calendar shows approved leave with employee names, navigable by month
- Public holidays display on calendar with distinct styling
- Admin can add custom off-days and delete holidays at `/admin/holidays`
- Bell icon in header shows unread count badge
- Notification dropdown lists recent notifications with mark-as-read
- Notifications poll every 30s and on page focus
- Employee can delete own account from `/settings`
- Admin can delete any user from `/admin/users`
- Last-admin deletion is blocked
- All new validators and services have passing tests
- No TypeScript errors, ESLint clean
