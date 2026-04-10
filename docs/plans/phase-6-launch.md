# Phase 6 — Polish & Launch

| Field            | Value                                                           |
| ---------------- | --------------------------------------------------------------- |
| **Scope**        | Google Calendar integration, CI/CD, testing, deployment, polish |
| **Detail level** | High-level                                                      |
| **Status**       | Planned                                                         |

## What This Phase Covers

Final phase — add the nice-to-have Google Calendar sync, set up CI/CD and deployment infrastructure, write tests, and polish the app for production. By the end of this phase, the app is deployed and ready for the team to use. Make more performant by caching slow changing data as much as possible, reduce any unnecessary network calls so that the app feels snappy, caches can be invalidated on actions

## Key Deliverables

- **Google Calendar integration** (nice-to-have) — Request `calendar.events` scope, create events on approve (full day = all-day, morning = 08:00–12:00, afternoon = 12:00–17:00), copy to admin calendar, delete on cancel
- **Testing suite** — Vitest setup, global Prisma mocks, tests for leave validation, approval logic, balance calculations, RBAC, public holiday Easter calculation
- **CI pipeline** — GitHub Actions: lint + typecheck + test on every PR
- **Pre-commit hooks** — Native `.githooks/pre-commit` running lint + typecheck + tests
- **Deployment** — Vercel project setup, Neon Postgres provisioned, environment variables configured, `prisma migrate deploy` in build step
- **Security headers** — CSP, HSTS, X-Frame-Options in `next.config.ts`
- **Production seed** — Initial admin user + current year public holidays
- **Polish** — Loading states, error handling, empty states, final responsive tweaks

## Entry Criteria

- Phase 5 complete (all features working, notifications live)

## Exit Criteria

- App deployed to Vercel and accessible at production URL
- CI pipeline passes on PRs
- Google Calendar events created on leave approval (if implemented)
- Test suite passes with reasonable coverage
- Security headers configured
- App usable by the ~12 person team
