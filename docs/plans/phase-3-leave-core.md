# Phase 3 — Leave Core

| Field | Value |
|-------|-------|
| **Scope** | Leave request API, approval workflow, balance logic, validation |
| **Detail level** | High-level |
| **Status** | Planned |

## What This Phase Covers

Build the core leave management backend — all API routes for requesting, cancelling, approving, and declining leave. Includes Zod validation, balance checking/deduction, half-day logic, and the carryover mechanism. By the end of this phase, all leave operations work via API (UI comes in Phase 4).

## Key Deliverables

- **Zod schemas** — `src/lib/validators/leave.ts` for request validation (leave type, dates, day type, note)
- **Leave request API** — `POST /api/leave/request` (validate, check balance, check 1-day notice, create with PENDING status)
- **Cancel API** — `POST /api/leave/cancel` (own requests only, refund balance if was approved)
- **Approve API** — `POST /api/leave/approve` (admin only, deduct from balance, update status)
- **Decline API** — `POST /api/leave/decline` (admin only, require reason, update status)
- **History API** — `GET /api/leave/history` (own leave history with filters)
- **Pending API** — `GET /api/leave/pending` (admin only, all pending requests)
- **Balance API** — `GET /api/balances` (own balances), `POST /api/balances/adjust` (admin, with reason logged)
- **Half-day logic** — MORNING/AFTERNOON count as 0.5 days against balance
- **Carryover logic** — Utility to roll unused days into next year's LeaveBalance
- **Public holiday overlap** — Warn when requested dates include public holidays

## Entry Criteria

- Phase 2 complete (auth working, RBAC enforced on routes)

## Exit Criteria

- All API routes return correct responses for happy path and error cases
- Balance is correctly deducted on approve, refunded on cancel
- Half-day requests deduct 0.5 days
- Requests with insufficient balance are rejected (paid leave only)
- Admin-only routes reject employee requests with 403
- Zod validation catches invalid inputs
