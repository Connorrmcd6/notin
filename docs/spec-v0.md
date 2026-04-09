# NotIn — Leave Tracking Platform Spec (V0)

## 1. Overview

NotIn is a bespoke leave tracking web app for a small startup (~12 people). It replaces the current Google Sheet workflow with a proper system for employees to request time off, view their leave balances, and for admins to approve or decline requests and monitor team availability.

---

## 2. User Roles

| Role | Description |
|------|-------------|
| **Employee** | Can request leave, view own balances and history, see team calendar |
| **Admin** | Everything an Employee can do, plus: approve/decline requests, manage users, set leave policies, adjust balances |

- Admins are also employees — they have their own leave balances and can request leave like anyone else
- The first user to sign up (or a seeded user) becomes the Admin
- Admins can promote other users to Admin

---

## 3. Authentication

- **Google OAuth** for sign-in (no passwords to manage)
- Only users with an `@thoughtlab.studio` email can sign up (domain-restricted, no contractor/external access)
- First-time sign-in creates an Employee account automatically

---

## 4. Leave Types

Each leave type has its own balance tracked separately.

| Leave Type | Description |
|------------|-------------|
| **Paid Annual Leave** | Standard paid time off, requires advance approval |
| **Unpaid Leave** | Time off without pay (no balance limit — always available to request) |

- Allowances vary per person (by role/tenure) — Admins set each employee's annual paid leave allowance individually
- Half-day leave is supported for both types
- Allowances are granted upfront at the start of each year (Jan 1)
- Unused paid leave carries over to the next year with no cap

---

## 5. Core User Flows

### Employee

1. **Request Leave** — Select leave type, pick start/end dates, choose full or half day, add optional note, submit
2. **View Balances** — See remaining days for each leave type at a glance
3. **View History** — See all past and upcoming leave requests with status (Pending, Approved, Declined)
4. **Cancel Request** — Cancel a pending or upcoming approved request

### Admin

1. **Review Requests** — See pending requests, approve or decline with optional reason
2. **Team Calendar** — View who is out and when across the team
3. **Adjust Balances** — Manually add or subtract days from an employee's balance (with reason logged)
4. **Manage Users** — Invite, deactivate, or change roles for team members
5. **Manage Public Holidays** — Upload/manage South African public holidays per year

### Approval Workflow

- Employee submits request → Admin is notified (in-app)
- Admin approves or declines → Employee is notified (in-app)
- If declined, a reason is provided
- Single approver — any Admin can approve/decline any request
- Requests never auto-approve — Admin action is always required

---

## 6. Leave Policies

- **Accrual:** Upfront annual grant on Jan 1 each year
- **Carryover:** Unused paid leave carries over with no cap
- **Minimum notice:** Leave requests must be submitted at least 1 business day in advance
- **Overlapping leave:** No restrictions — multiple people can be off on the same dates
- **No blackout dates**

---

## 7. Dashboard & Views

### Employee Dashboard
- Current balances (Paid Annual Leave, Unpaid Leave taken) displayed prominently
- Upcoming approved leave
- Pending requests and their status
- Quick "Request Leave" action

### Admin Dashboard
- Pending requests requiring action (with approve/decline buttons)
- Team calendar showing who is out
- Summary stats (e.g., how many people out this week)

### Team Calendar
- Month view showing all approved leave across the team
- Shows who specifically is out (names visible to all employees)
- Color-coded by leave type or by person
- Public holidays displayed on the calendar

---

## 8. Notifications

In-app notifications only (no email service needed at this scale).

| Event | Notify |
|-------|--------|
| Leave request submitted | Admin |
| Request approved | Employee |
| Request declined (with reason) | Employee |
| Request cancelled | Admin |
| Balance running low | Employee |

---

## 9. Public Holidays

- South African public holidays are auto-populated each year (including movable holidays like Easter)
- Admins can add custom off-days (e.g., company shutdown days) or remove/override auto-populated holidays
- Public holidays are displayed on the team calendar
- Leave requests that overlap with public holidays should flag this to the employee (those days don't need to be taken as leave)

---

## 10. Google Calendar Integration (Nice-to-Have)

If low complexity and free to implement (via Google Calendar API, since we already have Google OAuth):

- When leave is approved, automatically create an event on the employee's Google Calendar
- Copy the event to the Admin's calendar (for information purposes)
- Half-day leave creates a morning (8:00–12:00) or afternoon (12:00–17:00) event; full days are all-day events
- If the leave is later cancelled, remove the calendar event

---

## 11. Out of Scope (V1)

These features are explicitly deferred to keep V1 simple:

- Payroll integration
- Mobile native app (web-only, but responsive)
- Time tracking / clock-in-clock-out
- Email notifications / Slack integration
- Advanced reporting / CSV exports
