# Phase 1 — Foundation

| Field | Value |
|-------|-------|
| **Scope** | Project scaffold, Docker, Prisma schema, seed script |
| **Detail level** | Detailed |
| **Status** | Planned |

## What This Phase Covers

Set up the entire project skeleton so that subsequent phases can build features on a working foundation. By the end of this phase, `pnpm dev` runs, Docker serves a local Postgres instance, all database models exist with migrations applied, and seed data is populated.

## Key Deliverables

- **Next.js 16 scaffold** — App Router, TypeScript strict, pnpm, Tailwind v4, ESLint flat config
- **Docker Compose** — Local Postgres 16 + pgAdmin
- **Prisma schema** — All models: User, LeaveRequest, LeaveBalance, PublicHoliday, BalanceAdjustment, Notification (enums: Role, LeaveType, LeaveStatus, DayType)
- **Prisma config** — `prisma.config.ts`, generated client output to `src/generated/prisma`
- **Initial migration** — `pnpm prisma migrate dev --name init`
- **Seed script** — `prisma/seed.mts` via tsx: admin user, sample employees, leave balances, SA public holidays (with Easter calculation), sample leave requests
- **Environment setup** — `.env.example` with all required vars, `.env` for local dev
- **Project config** — `components.json` (shadcn), `vitest.config.ts`, `pnpm-workspace.yaml`
- **CLAUDE.md + AGENTS.md** — AI development context files

---

## Step 1: Scaffold Next.js 16 Project

### Commands

```bash
git init
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes
```

### Post-Scaffold Adjustments

**1. `pnpm-workspace.yaml`** — create:

```yaml
packages:
  - "."
ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
onlyBuiltDependencies:
  - "@prisma/engines"
  - esbuild
  - prisma
```

**2. `package.json`** — update scripts section:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && prisma migrate deploy && next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "prepare": "git config core.hooksPath .githooks"
  }
}
```

**3. `tsconfig.json`** — verify/adjust to match:

- `target: "ES2017"`
- `strict: true`
- `paths: { "@/*": ["./src/*"] }`
- `include` array contains `**/*.mts`

**4. `postcss.config.mjs`** — verify uses `@tailwindcss/postcss` (no `tailwind.config.js` file)

**5. `eslint.config.mjs`** — overwrite with:

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
]);

export default eslintConfig;
```

---

## Step 2: Install Dependencies

```bash
pnpm add zod@^4.3.6 @prisma/adapter-pg
pnpm add -D prisma tsx@^4.21.0 vitest@^4.1.0 vite-tsconfig-paths@^6.1.1 @vitest/coverage-v8
```

> `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `@tailwindcss/postcss`, `eslint`, `eslint-config-next` are already installed by the scaffold.

---

## Step 3: Security Headers (next.config.ts)

Overwrite `next.config.ts` with CSP directives and security headers:

```typescript
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
];

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
```

---

## Step 4: Docker Compose

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: notin
      POSTGRES_PASSWORD: notin_local
      POSTGRES_DB: notin
    volumes:
      - pgdata:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4:latest
    restart: unless-stopped
    ports: ["5050:80"]
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@notin.dev
      PGADMIN_DEFAULT_PASSWORD: admin
      PGADMIN_CONFIG_SERVER_MODE: "False"
    depends_on: [postgres]

volumes:
  pgdata:
```

---

## Step 5: Environment Files

**`.env.example`:**

```env
# Database
DATABASE_URL="postgresql://notin:notin_local@localhost:5432/notin"

# Auth (Auth.js)
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_URL=http://localhost:3000
```

**`.env`** — local dev values:

```env
DATABASE_URL="postgresql://notin:notin_local@localhost:5432/notin"
AUTH_SECRET=dev-secret-change-me
AUTH_GOOGLE_ID=placeholder
AUTH_GOOGLE_SECRET=placeholder
AUTH_URL=http://localhost:3000
```

**`.gitignore`** — ensure these entries are present (supplement scaffold output):

```
node_modules
.next
.env
.env.local
src/generated
```

---

## Step 6: Prisma Setup

### 6a. Initialize Prisma

```bash
pnpm prisma init
```

### 6b. Config (`prisma.config.ts`)

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.mts" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

### 6c. Schema (`prisma/schema.prisma`)

Overwrite with the complete schema:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  EMPLOYEE
  ADMIN
}

enum LeaveType {
  PAID_ANNUAL
  UNPAID
}

enum LeaveStatus {
  PENDING
  APPROVED
  DECLINED
  CANCELLED
}

enum DayType {
  FULL
  MORNING
  AFTERNOON
}

model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  name      String?
  role      Role     @default(EMPLOYEE)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  leaveRequests LeaveRequest[]
  leaveBalances LeaveBalance[]

  @@map("users")
}

model LeaveRequest {
  id        String      @id @default(uuid()) @db.Uuid
  createdAt DateTime    @default(now()) @map("created_at")
  updatedAt DateTime    @updatedAt @map("updated_at")

  userId    String      @map("user_id") @db.Uuid
  user      User        @relation(fields: [userId], references: [id])

  leaveType LeaveType   @map("leave_type")
  startDate DateTime    @map("start_date") @db.Date
  endDate   DateTime    @map("end_date") @db.Date
  dayType   DayType     @default(FULL) @map("day_type")
  note      String?

  status        LeaveStatus @default(PENDING)
  reviewedBy    String?     @map("reviewed_by") @db.Uuid
  reviewedAt    DateTime?   @map("reviewed_at")
  declineReason String?     @map("decline_reason")

  @@map("leave_requests")
}

model LeaveBalance {
  id        String   @id @default(uuid()) @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  userId          String @map("user_id") @db.Uuid
  user            User   @relation(fields: [userId], references: [id])

  year            Int
  annualAllowance Float  @map("annual_allowance")
  usedDays        Float  @default(0) @map("used_days")
  carriedOver     Float  @default(0) @map("carried_over")

  @@unique([userId, year])
  @@map("leave_balances")
}

model PublicHoliday {
  id        String   @id @default(uuid()) @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  date     DateTime @db.Date
  name     String
  year     Int
  isCustom Boolean  @default(false) @map("is_custom")

  @@unique([date])
  @@map("public_holidays")
}

model BalanceAdjustment {
  id        String   @id @default(uuid()) @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  userId     String @map("user_id") @db.Uuid
  adjustedBy String @map("adjusted_by") @db.Uuid
  year       Int
  days       Float
  reason     String

  @@map("balance_adjustments")
}

model Notification {
  id        String   @id @default(uuid()) @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  userId  String  @map("user_id") @db.Uuid
  message String
  link    String?
  read    Boolean @default(false)

  @@map("notifications")
}
```

### 6d. Client Singleton (`src/lib/db/client.ts`)

```typescript
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 6e. Generate + Migrate

```bash
pnpm prisma generate
pnpm prisma migrate dev --name init
```

---

## Step 7: Seed Script (`prisma/seed.mts`)

> **Important:** Use relative imports (not `@/*` aliases) since `tsx` doesn't resolve them. Import PrismaClient from `../src/generated/prisma/client`.

### Section 1: Easter Date Calculation

Implement the Anonymous Gregorian algorithm (Meeus/Jones/Butcher) that takes a year and returns a `Date` for Easter Sunday. Used to derive Good Friday, Easter Monday, and Family Day.

### Section 2: SA Public Holidays Function

Takes a year, calls the Easter function, returns `{ date: Date, name: string }[]` for all SA public holidays:

| Date | Holiday |
|------|---------|
| January 1 | New Year's Day |
| March 21 | Human Rights Day |
| Easter - 2 days | Good Friday |
| Easter + 1 day | Family Day |
| April 27 | Freedom Day |
| May 1 | Workers' Day |
| June 16 | Youth Day |
| August 9 | National Women's Day |
| September 24 | Heritage Day |
| December 16 | Day of Reconciliation |
| December 25 | Christmas Day |
| December 26 | Day of Goodwill |

**Sunday substitution rule:** If a public holiday falls on a Sunday, the following Monday is also a public holiday.

### Section 3: Main Seed Function

1. Clear all tables with `deleteMany` in reverse dependency order (Notification, BalanceAdjustment, LeaveRequest, LeaveBalance, PublicHoliday, User)
2. Create admin user: `{ email: "admin@thoughtlab.studio", name: "Admin User", role: "ADMIN" }`
3. Create 3-4 sample employees with `@thoughtlab.studio` emails
4. Create `LeaveBalance` for each user for 2026 and 2027:
   - Admin: 20 days annual allowance
   - Employees: 15-18 days each
5. Insert SA public holidays for 2026 and 2027
6. Create sample leave requests in various states:
   - 1 PENDING request
   - 1 APPROVED request (with `reviewedBy`, `reviewedAt` set; `usedDays` updated on balance)
   - 1 DECLINED request (with `declineReason`)
   - 1 CANCELLED request

### Section 4: Execute

Call main seed function, catch errors, `$disconnect()` in finally block.

---

## Step 8: Vitest + Test Setup

**`vitest.config.ts`:**

```typescript
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/db/client.ts"],
    },
  },
});
```

**`src/tests/setup.ts`:**

```typescript
import { vi } from "vitest";

// Mock Next.js cache functions
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Mock Prisma with all model methods
const mockPrismaModel = () => ({
  create: vi.fn(),
  createMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  count: vi.fn(),
});

vi.mock("@/lib/db/client", () => {
  return {
    prisma: {
      user: mockPrismaModel(),
      leaveRequest: mockPrismaModel(),
      leaveBalance: mockPrismaModel(),
      publicHoliday: mockPrismaModel(),
      balanceAdjustment: mockPrismaModel(),
      notification: mockPrismaModel(),
      $disconnect: vi.fn(),
      $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
        fn({
          user: mockPrismaModel(),
          leaveRequest: mockPrismaModel(),
          leaveBalance: mockPrismaModel(),
          publicHoliday: mockPrismaModel(),
          balanceAdjustment: mockPrismaModel(),
          notification: mockPrismaModel(),
        }),
      ),
    },
  };
});
```

---

## Step 9: shadcn/ui + Pre-commit Hooks

### 9a. Initialize shadcn

```bash
pnpm dlx shadcn@latest init --style new-york --base-color neutral --css-variables --yes
```

Verify `components.json` matches:
- `style: "new-york"`, `rsc: true`, `tsx: true`
- `baseColor: "neutral"`, `cssVariables: true`
- `iconLibrary: "lucide"`
- Aliases: `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`

### 9b. Pre-commit Hook (`.githooks/pre-commit`)

```bash
#!/bin/sh
set -e

echo "Running lint..."
pnpm lint

echo "Running type check..."
npx tsc --noEmit

echo "Running tests..."
pnpm test
```

Make executable:

```bash
chmod +x .githooks/pre-commit
```

---

## Step 10: CLAUDE.md + AGENTS.md Hierarchy + Claude Settings

### `CLAUDE.md`

```markdown
See @AGENTS.md for Project Conventions
```

### `AGENTS.md` (root)

Keep under 100 lines. Must contain:

1. One-line project description: "Leave management app for ~12 employees at thoughtlab.studio."
2. Stack table (Next.js 16, PostgreSQL 16, Prisma 7, Auth.js, Zod v4, shadcn/ui + Tailwind v4, Vitest, GitHub Actions)
3. Directory map (`src/app`, `src/components`, `src/generated`, `src/hooks`, `src/lib`, `src/tests`, `prisma`)
4. Invariants:
   - UUIDs for all database IDs (`@db.Uuid`)
   - camelCase fields in Prisma, snake_case in Postgres via `@map()`
   - Import with `@/*` aliases, never relative paths across directories
   - Never hardcode colors — use CSS theme variables
   - Icons from `lucide-react` only
   - `Float` for day counts (half-day = 0.5)
   - pnpm, not npm
5. Links to sub-AGENTS files with one-line descriptions
6. Testing section (framework, commands, setup location, colocated tests)
7. Specs & plans links

### `prisma/AGENTS.md`

- Schema patterns: IDs, timestamps, `@map()`, `@@map()`, generated output path
- Migration workflow: `migrate dev` locally, `migrate deploy` in CI/prod, never hand-edit applied SQL
- Client: singleton in `src/lib/db/client.ts` using PrismaPg adapter + globalThis
- Footer: "When modifying the Prisma schema, update this file accordingly."

### `src/lib/AGENTS.md`

- Directory layout: `db/`, `rbac/` (Phase 2), `validators/` (Phase 3), `auth/` (Phase 2), `utils.ts`
- Conventions: domain modules, index exports, colocated tests, mock client globally
- Footer: "When adding new modules to src/lib, update this file accordingly."

### `.claude/settings.local.json`

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm lint)",
      "Bash(pnpm test)",
      "Bash(pnpm test:*)",
      "Bash(npx tsc --noEmit)",
      "Bash(npx prisma generate)",
      "Bash(npx shadcn@latest add * --yes)",
      "Bash(git:*)",
      "Bash(npx prisma:*)",
      "Bash(npx vitest:*)",
      "Bash(gh run:*)",
      "Bash(gh pr:*)"
    ]
  }
}
```

---

## Files Summary

| # | File | Action |
|---|------|--------|
| 1 | `pnpm-workspace.yaml` | Create |
| 2 | `tsconfig.json` | Verify/adjust from scaffold |
| 3 | `postcss.config.mjs` | Verify from scaffold |
| 4 | `eslint.config.mjs` | Overwrite |
| 5 | `package.json` | Update scripts |
| 6 | `next.config.ts` | Overwrite with security headers |
| 7 | `docker-compose.yml` | Create |
| 8 | `.env.example` | Create |
| 9 | `.env` | Create |
| 10 | `.gitignore` | Supplement |
| 11 | `prisma.config.ts` | Create |
| 12 | `prisma/schema.prisma` | Overwrite with full schema |
| 13 | `src/lib/db/client.ts` | Create |
| 14 | `prisma/seed.mts` | Create |
| 15 | `vitest.config.ts` | Create |
| 16 | `src/tests/setup.ts` | Create |
| 17 | `components.json` | Generated by shadcn init, verify |
| 18 | `.githooks/pre-commit` | Create + chmod +x |
| 19 | `CLAUDE.md` | Create |
| 20 | `AGENTS.md` | Create |
| 21 | `prisma/AGENTS.md` | Create |
| 22 | `src/lib/AGENTS.md` | Create |
| 23 | `.claude/settings.local.json` | Create |

---

## Notes

- Seed script must use **relative imports** (not `@/*` aliases) since tsx doesn't resolve them
- `pnpm prisma init` generates initial `prisma/` directory — overwrite `schema.prisma` after
- shadcn `--yes` flag auto-accepts defaults; if CLI flags changed, check `--help` first
- Docker must be running before any Prisma migration/seed commands
- The scaffold output from `create-next-app` may vary slightly by version — audit each config file against this plan before overwriting

---

## Entry Criteria

- None (first phase)

## Exit Criteria

- `docker compose up -d` starts Postgres
- `pnpm prisma migrate dev` applies cleanly
- `pnpm prisma db seed` populates test data
- `pnpm dev` starts without errors
- `npx tsc --noEmit` passes
