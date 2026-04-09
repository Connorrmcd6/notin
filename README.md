# NotIn

Leave management app for ~12 employees at [thoughtlab.studio](https://thoughtlab.studio).

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript, pnpm)
- **Database:** PostgreSQL 16 (Docker local, Neon prod)
- **ORM:** Prisma 7
- **Auth:** Auth.js with Google OAuth
- **Validation:** Zod v4
- **UI:** shadcn/ui + Tailwind v4
- **Testing:** Vitest
- **CI/CD:** GitHub Actions + Vercel

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker

### Setup

```bash
# Install dependencies
pnpm install

# Start Postgres + pgAdmin
docker compose up -d

# Run migrations
pnpm prisma migrate dev

# Seed the database
pnpm prisma db seed

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

pgAdmin is available at [http://localhost:5050](http://localhost:5050) (admin@notin.dev / admin).

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Generate Prisma client, run migrations, build |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js secret |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `AUTH_URL` | App URL (http://localhost:3000 for local) |

## License

Private
