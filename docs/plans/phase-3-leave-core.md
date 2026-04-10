# Phase 3 — Leave Core

| Field | Value |
|-------|-------|
| **Scope** | Leave request API, approval workflow, balance logic, validation |
| **Detail level** | Detailed |
| **Status** | Complete |

## What This Phase Covers

Core leave management backend — all API routes for requesting, cancelling, approving, and declining leave. Includes Zod validation, balance checking/deduction, half-day logic, carryover mechanism, and notification creation. All leave operations work via API (UI comes in Phase 4).

## Architecture

Three-layer design: **validators** (Zod) → **services** (business logic + DB) → **routes** (thin HTTP wrappers).

```
src/lib/validators/leave.ts     — Zod schemas (6 schemas)
src/lib/leave/calculations.ts   — Pure functions (day counting, balance math, holiday overlap)
src/lib/leave/notifications.ts  — Notification creation helpers (notifyAdmins, notifyEmployee)
src/lib/leave/service.ts        — Leave orchestration (submit, cancel, approve, decline, history, pending)
src/lib/balances/service.ts     — Balance queries and adjustments
src/lib/balances/carryover.ts   — Year-end balance carryover utility
src/lib/api/utils.ts            — withErrorHandler wrapper (error → HTTP status mapping)
src/app/api/leave/*/route.ts    — 6 thin route handlers
src/app/api/balances/*/route.ts — 2 thin route handlers
```

## API Routes

| Route | Method | Permission | Description |
|-------|--------|------------|-------------|
| `/api/leave/request` | POST | `leave:request` | Submit leave request (validates notice, balance, holiday overlap) |
| `/api/leave/cancel` | POST | `leave:cancel` | Cancel own pending/approved request (refunds balance if approved) |
| `/api/leave/approve` | POST | `leave:approve` | Approve pending request (deducts balance in transaction) |
| `/api/leave/decline` | POST | `leave:decline` | Decline pending request (with reason) |
| `/api/leave/history` | GET | `leave:request` | Own leave history with filters (status, type, year, pagination) |
| `/api/leave/pending` | GET | `leave:approve` | All pending requests (admin view, includes user info) |
| `/api/balances` | GET | `balances:read` | Own balances (all years) |
| `/api/balances/adjust` | POST | `balances:adjust` | Admin balance adjustment (modifies allowance, creates audit trail) |

## Validation Schemas

| Schema | Purpose |
|--------|---------|
| `LeaveRequestSchema` | leaveType, dates, dayType, note. Refines: endDate >= startDate, half-day = single day only |
| `LeaveCancelSchema` | requestId (UUID) |
| `LeaveApproveSchema` | requestId (UUID) |
| `LeaveDeclineSchema` | requestId (UUID), reason (1-500 chars) |
| `LeaveHistoryQuerySchema` | Optional filters (status, leaveType, year), pagination (page, limit) |
| `BalanceAdjustSchema` | userId (UUID), year, days (float), reason |

## Business Logic

- **Submit:** Validates 1-day minimum notice, checks balance for PAID_ANNUAL, warns on public holiday overlap (does not block), creates PENDING request, notifies admins
- **Approve:** Verifies PENDING status, deducts balance in `$transaction` (PAID_ANNUAL only), sets reviewedBy/reviewedAt, notifies employee
- **Decline:** Verifies PENDING status, sets declineReason/reviewedBy/reviewedAt, notifies employee
- **Cancel:** Verifies ownership + PENDING/APPROVED status, refunds balance in `$transaction` if was APPROVED + PAID_ANNUAL, notifies admins
- **Half-day:** MORNING/AFTERNOON = 0.5 days against balance
- **Unpaid:** No balance check — always requestable
- **Carryover:** `carryOverBalances(fromYear, toYear)` — rolls remaining balance (no cap) into next year

## Key Design Decisions

1. **Balance deducted on approve, not on request.** PENDING requests don't reserve balance.
2. **Half-day requires single-day range.** Enforced via Zod refinement.
3. **`BUSINESS:` error prefix** for 422 responses, mapped by `withErrorHandler`.
4. **Carryover as library function**, not API route. Can be called from admin UI or script.
5. **Public holiday overlap = warning**, not blocker. Returns `warnings[]` with the created request.
6. **Balance adjustment modifies `annualAllowance`**, not `usedDays`. `usedDays` tracks actual leave taken only.

## Files Created

```
src/lib/api/utils.ts              + utils.test.ts + index.ts
src/lib/validators/leave.ts       + leave.test.ts + index.ts
src/lib/leave/calculations.ts     + calculations.test.ts
src/lib/leave/notifications.ts    + notifications.test.ts
src/lib/leave/service.ts          + service.test.ts + index.ts
src/lib/balances/service.ts       + service.test.ts
src/lib/balances/carryover.ts     + carryover.test.ts + index.ts
src/app/api/leave/request/route.ts
src/app/api/leave/cancel/route.ts
src/app/api/leave/approve/route.ts
src/app/api/leave/decline/route.ts
src/app/api/leave/history/route.ts
src/app/api/leave/pending/route.ts
src/app/api/balances/route.ts
src/app/api/balances/adjust/route.ts
```

## Test Coverage

- 101 tests across 9 test files, all passing
- TypeScript strict mode — no type errors
- Tests cover: validation schemas, pure calculations, notification creation, all service operations (happy path + error cases), error handler mapping

## Entry Criteria

- Phase 2 complete (auth working, RBAC enforced on routes) ✅

## Exit Criteria

- All API routes return correct responses for happy path and error cases ✅
- Balance is correctly deducted on approve, refunded on cancel ✅
- Half-day requests deduct 0.5 days ✅
- Requests with insufficient balance are rejected (paid leave only) ✅
- Admin-only routes reject employee requests with 403 ✅
- Zod validation catches invalid inputs ✅
