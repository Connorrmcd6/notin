# Phase 5 — Calendar, Holidays & Notifications

| Field | Value |
|-------|-------|
| **Scope** | Team calendar, public holiday management, in-app notifications |
| **Detail level** | High-level |
| **Status** | Planned |

## What This Phase Covers

Add the team calendar view, public holiday admin management, and the in-app notification system. By the end of this phase, the team can see who's out at a glance, public holidays are visible, and users receive notifications for leave events.

## Key Deliverables

- **Team calendar page** (`/calendar`) — Month view showing approved leave per person (names visible), color-coded by leave type or person
- **Public holidays on calendar** — Distinct styling for SA public holidays and custom off-days
- **Holiday management page** (`/admin/holidays`) — View holidays per year, add custom off-days, remove/override auto-populated holidays
- **Holiday API routes** — `GET /api/holidays`, `POST /api/holidays` (admin, add custom), `DELETE /api/holidays/:id` (admin)
- **Notification system** — Create notifications on leave events (submit, approve, decline, cancel)
- **Notification API** — `GET /api/notifications` (unread for current user), `POST /api/notifications/read` (mark as read)
- **Notification UI** — Bell icon in header with unread count badge, dropdown showing recent notifications
- **Client polling** — Poll for new notifications every 30s or on page focus

## Entry Criteria

- Phase 4 complete (all pages built, app is usable end-to-end)

## Exit Criteria

- Team calendar shows approved leave with employee names
- Public holidays display on the calendar with distinct styling
- Admin can add custom off-days and manage holidays
- Notifications appear for all leave events (submit, approve, decline, cancel)
- Bell icon shows unread count, dropdown lists notifications
- Marking notifications as read works
