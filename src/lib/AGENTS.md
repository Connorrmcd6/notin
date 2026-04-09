# src/lib Conventions

## Directory Layout

- `db/` — Prisma client singleton
- `rbac/` — Role + permission definitions (Phase 2)
- `validators/` — Zod schemas (Phase 3)
- `auth/` — Server-side session helpers (Phase 2)
- `utils.ts` — Shared utility functions (shadcn cn() helper)

## Conventions

- Domain modules export via index files
- Colocate tests as `*.test.ts` next to source
- Mock Prisma client globally in `src/tests/setup.ts`
- Use `@/*` import aliases

---

When adding new modules to src/lib, update this file accordingly.
