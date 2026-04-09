# Prisma Conventions

## Schema Patterns

- All IDs: `@id @default(uuid()) @db.Uuid`
- Timestamps: `createdAt` + `updatedAt` on all models
- Field mapping: camelCase in Prisma → snake_case in Postgres via `@map()`
- Table mapping: PascalCase models → snake_case plural tables via `@@map()`
- Generated client output: `src/generated/prisma`

## Migration Workflow

- Local: `pnpm prisma migrate dev --name <description>`
- CI/Prod: `pnpm prisma migrate deploy`
- Never hand-edit applied SQL migration files
- Prisma 7: datasource URL is in `prisma.config.ts`, not in `schema.prisma`

## Client

- Singleton in `src/lib/db/client.ts`
- Uses `PrismaPg` adapter from `@prisma/adapter-pg` + globalThis caching
- Seed script: `prisma/seed.mts` (uses tsx, relative imports only)

---

When modifying the Prisma schema, update this file accordingly.
