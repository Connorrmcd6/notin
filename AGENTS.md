<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# NotIn

Leave management app for ~12 employees at thoughtlab.studio.

## Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 16 (App Router, TypeScript, pnpm) |
| Database | PostgreSQL 16 (Docker local, Neon prod) |
| ORM | Prisma 7 |
| Auth | Auth.js with Google OAuth |
| Validation | Zod v4 |
| UI | shadcn/ui + Tailwind v4 |
| Testing | Vitest |
| CI/CD | GitHub Actions |

## Directory Map

```
src/
  app/          — Next.js App Router pages and layouts
  components/   — React components (ui/ for shadcn)
  generated/    — Prisma generated client (gitignored)
  hooks/        — Custom React hooks
  lib/          — Domain logic, utilities, db client
  tests/        — Test setup
prisma/         — Schema, migrations, seed script
docs/           — Specs and phase plans
```

## Invariants

- UUIDs for all database IDs (`@db.Uuid`)
- camelCase fields in Prisma, snake_case in Postgres via `@map()`
- Import with `@/*` aliases, never relative paths across directories
- Never hardcode colors — use CSS theme variables
- Icons from `lucide-react` only
- `Float` for day counts (half-day = 0.5)
- pnpm, not npm

## Sub-AGENTS Files

- `prisma/AGENTS.md` — Schema patterns, migration workflow, client singleton
- `src/lib/AGENTS.md` — Domain module conventions, directory layout

## Testing

- Framework: Vitest
- Run: `pnpm test` / `pnpm test:watch` / `pnpm test:coverage`
- Setup: `src/tests/setup.ts` (global Prisma mock, Next.js cache mock)
- Colocate tests next to source files as `*.test.ts`

## Specs & Plans

- `docs/spec-v2.md` — Technical spec (source of truth)
- `docs/plans/phase-*.md` — Implementation plans per phase
