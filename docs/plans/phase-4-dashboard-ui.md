# Phase 4 — Dashboard & UI

| Field | Value |
|-------|-------|
| **Scope** | shadcn/ui setup, app shell, all pages, leave request form, user management |
| **Detail level** | High-level |
| **Status** | Planned |

## What This Phase Covers

Build the full UI layer on top of the Phase 3 APIs. Set up shadcn/ui, create the app shell (sidebar/bottom nav), and implement all pages. By the end of this phase, employees and admins can use the app end-to-end through the browser.

## Key Deliverables

- **shadcn/ui init** — Install and configure components.json, globals.css theme
- **App shell** — Sidebar navigation (desktop) + bottom nav (mobile), role-aware nav items
- **Employee dashboard** (`/dashboard`) — Balance cards, upcoming leave, pending requests, "Request Leave" button
- **Leave request form** (`/dashboard/request`) — Date picker, leave type select, full/half day toggle, note, submit
- **Leave history** (`/dashboard/history`) — Table of own requests with status badges
- **Admin dashboard** (`/admin`) — Pending requests with approve/decline buttons, team summary stats
- **User management** (`/admin/users`) — User list, role toggle (Employee/Admin), set annual allowance per person
- **Shared components** — Status badges, balance cards, request cards, approve/decline dialogs with reason input
- **Toast notifications** — Action confirmations (request submitted, approved, declined, cancelled)
- **Responsive design** — Mobile-friendly layouts for all pages

## Entry Criteria

- Phase 3 complete (all leave APIs working and tested)

## Exit Criteria

- Employee can request leave, view balances, view history, cancel requests through the UI
- Admin can approve/decline requests, manage users, adjust balances through the UI
- Navigation shows correct items based on role
- All pages are responsive (desktop + mobile)
- Toast confirmations appear for all actions
