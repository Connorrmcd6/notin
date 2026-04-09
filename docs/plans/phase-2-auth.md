# Phase 2 — Auth & RBAC

| Field            | Value                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| **Scope**        | Google OAuth, domain restriction, RBAC, route protection, sign-in page |
| **Detail level** | Detailed                                                               |
| **Status**       | Planned                                                                |

## What This Phase Covers

Implement authentication and authorization so that users can sign in with Google, are restricted to `@thoughtlab.studio`, and routes are protected based on role. By the end of this phase, the app has a working sign-in flow and role-based access control. (need a workaround email for dev though since I dont have thoughtlab email)

## Key Deliverables

- **Auth.js setup** — `src/auth.ts` with Google provider, JWT strategy, PrismaAdapter
- **Domain restriction** — `signIn` callback rejects non-`@thoughtlab.studio` emails
- **Auto-create user** — First login creates User record with `EMPLOYEE` role
- **Sign-in page** — `/sign-in` with Google OAuth button
- **Session provider** — `src/app/providers.tsx` wrapping the app with SessionProvider
- **Route protection** — `src/proxy.ts` (Next.js 16 pattern) checking session cookie, redirecting unauthenticated users
- **RBAC permission map** — `src/lib/rbac/roles.ts` with `ADMIN`/`EMPLOYEE` permissions
- **Permission helpers** — `hasPermission()`, `useRbac()` hook for client-side checks
- **Route-level RBAC** — `proxy.ts` role checks for `/admin` routes
- **Server-side session helper** — `src/lib/auth/session.ts` for API route auth

---

## Step 1: Install Auth.js Dependencies

```bash
pnpm add next-auth@beta @auth/prisma-adapter
```

> Auth.js v5 (beta) is the Next.js App Router-compatible version. The `@auth/prisma-adapter` connects Auth.js to the existing Prisma schema.

---

## Step 2: Update Prisma Schema for Auth.js

Auth.js with PrismaAdapter requires `Account` and `Session` models. Add these to `prisma/schema.prisma`:

```prisma
model Account {
  id                String  @id @default(uuid()) @db.Uuid
  userId            String  @map("user_id") @db.Uuid
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(uuid()) @db.Uuid
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id") @db.Uuid
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}
```

Also add the relations to the existing `User` model:

```prisma
model User {
  // ... existing fields ...

  // Add these relations
  accounts      Account[]
  sessions      Session[]
}
```

Then run the migration:

```bash
pnpm prisma migrate dev --name add-auth-models
```

---

## Step 3: Environment Variables

Add to `.env` (local dev values are already placeholders from Phase 1):

```env
AUTH_SECRET=<generate with `npx auth secret`>
AUTH_GOOGLE_ID=<from Google Cloud Console>
AUTH_GOOGLE_SECRET=<from Google Cloud Console>
AUTH_URL=http://localhost:3000
```

Update `.env.example` to document these if not already present.

**Google Cloud Console setup:**

1. Create OAuth 2.0 credentials at console.cloud.google.com
2. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
3. Copy Client ID → `AUTH_GOOGLE_ID`, Client Secret → `AUTH_GOOGLE_SECRET`

---

## Step 4: Auth.js Configuration (`src/auth.ts`)

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/client";
import type { Role } from "@/generated/prisma/client";

const ALLOWED_DOMAINS = ["thoughtlab.studio"];
const DEV_EMAILS: string[] = ["connormcd98@gmail.com"]; // Add dev emails here for local testing

function isAllowedEmail(email: string): boolean {
  if (process.env.NODE_ENV === "development" && DEV_EMAILS.includes(email)) {
    return true;
  }
  const domain = email.split("@")[1];
  return ALLOWED_DOMAINS.includes(domain);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    signIn({ user }) {
      if (!user.email || !isAllowedEmail(user.email)) {
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, role: true },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Auth.js PrismaAdapter creates the user — ensure role defaults to EMPLOYEE
      // The Prisma schema default handles this, but this event is here for
      // any additional first-login logic needed later
    },
  },
});
```

### Type Augmentation (`src/types/next-auth.d.ts`)

Extend the Auth.js types to include `role` and `userId`:

```typescript
import type { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: Role;
  }
}
```

---

## Step 5: Auth.js API Route Handler

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

This is the standard Auth.js v5 catch-all route that handles `/api/auth/signin`, `/api/auth/callback/*`, `/api/auth/signout`, etc.

---

## Step 6: CSP Update for Google OAuth (`next.config.ts`)

Update the CSP directives in `next.config.ts` to allow Google OAuth:

```typescript
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://accounts.google.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
  "worker-src 'self'",
  "frame-src https://accounts.google.com",
  "frame-ancestors 'none'",
  "form-action 'self' https://accounts.google.com",
  "base-uri 'self'",
];
```

Changes from Phase 1:

- `script-src`: added `https://accounts.google.com`
- `img-src`: added `https://lh3.googleusercontent.com` (Google profile pictures)
- `connect-src`: added Google OAuth endpoints
- `frame-src`: new directive for Google sign-in popup
- `form-action`: added `https://accounts.google.com` for OAuth redirect

---

## Step 7: Session Provider (`src/app/providers.tsx`)

```typescript
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

Wrap the app in `src/app/layout.tsx`:

```tsx
import { Providers } from "@/app/providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## Step 8: Route Protection (`src/proxy.ts`)

> **Next.js 16:** Middleware has been renamed to Proxy. The file is `proxy.ts` at the `src/` root (same level as `app/`). The exported function must be named `proxy`.

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

const publicPaths = ["/sign-in", "/api/auth"];
const adminPaths = ["/admin"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isAdminPath(pathname: string): boolean {
  return adminPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check authentication
  const session = await auth();

  if (!session?.user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check admin role for admin paths
  if (isAdminPath(pathname) && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files, images, and metadata files
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
```

**Important note on proxy limitations:** The Next.js docs warn that proxy should be used for optimistic checks, not as a full authorization solution. Server Actions and API routes must also verify auth independently (see Step 11). The proxy provides UX-level redirects; the session helper in Step 11 provides actual security.

---

## Step 9: Sign-In Page (`src/app/sign-in/page.tsx`)

```tsx
import { SignInButton } from "@/components/auth/sign-in-button";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">NotIn</h1>
          <p className="text-muted-foreground">Sign in to manage your leave</p>
        </div>
        <SignInButton />
        <p className="text-xs text-muted-foreground">
          Restricted to @thoughtlab.studio accounts
        </p>
      </div>
    </div>
  );
}
```

### Sign-In Button Component (`src/components/auth/sign-in-button.tsx`)

```tsx
"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  return (
    <Button
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      variant="outline"
      className="w-full"
    >
      Sign in with Google
    </Button>
  );
}
```

### Sign-Out Button Component (`src/components/auth/sign-out-button.tsx`)

```tsx
"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      onClick={() => signOut({ callbackUrl: "/sign-in" })}
      variant="ghost"
      size="sm"
    >
      Sign out
    </Button>
  );
}
```

---

## Step 10: RBAC Permission Map (`src/lib/rbac/roles.ts`)

```typescript
import type { Role } from "@/generated/prisma/client";

export const PERMISSIONS = [
  "leave:request",
  "leave:cancel",
  "leave:approve",
  "leave:decline",
  "users:read",
  "users:manage",
  "balances:read",
  "balances:adjust",
  "holidays:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    "leave:request",
    "leave:cancel",
    "leave:approve",
    "leave:decline",
    "users:read",
    "users:manage",
    "balances:read",
    "balances:adjust",
    "holidays:manage",
  ],
  EMPLOYEE: ["leave:request", "leave:cancel", "balances:read"],
};
```

### Permission Helper (`src/lib/rbac/permissions.ts`)

```typescript
import type { Role } from "@/generated/prisma/client";
import { ROLE_PERMISSIONS, type Permission } from "@/lib/rbac/roles";

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function isAdmin(role: Role): boolean {
  return role === "ADMIN";
}
```

### Index Export (`src/lib/rbac/index.ts`)

```typescript
export {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  type Permission,
} from "@/lib/rbac/roles";
export { hasPermission, isAdmin } from "@/lib/rbac/permissions";
```

---

## Step 11: Client-Side RBAC Hook (`src/hooks/useRbac.ts`)

```typescript
"use client";

import { useSession } from "next-auth/react";
import { hasPermission, isAdmin } from "@/lib/rbac";
import type { Permission } from "@/lib/rbac";

export function useRbac() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  return {
    role: role ?? null,
    isAdmin: role ? isAdmin(role) : false,
    can: (permission: Permission) =>
      role ? hasPermission(role, permission) : false,
    isAuthenticated: !!session?.user,
  };
}
```

---

## Step 12: Server-Side Session Helper (`src/lib/auth/session.ts`)

This helper is used inside API routes and Server Actions to verify auth and get the current user. Unlike proxy, this is the actual security boundary.

```typescript
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/client";
import { hasPermission, type Permission } from "@/lib/rbac";

export async function getSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireSession();
  if (!hasPermission(session.user.role, permission)) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}
```

### Index Export (`src/lib/auth/index.ts`)

```typescript
export {
  getSession,
  requireSession,
  requirePermission,
  requireAdmin,
} from "@/lib/auth/session";
```

---

## Step 13: Tests

### RBAC Tests (`src/lib/rbac/permissions.test.ts`)

```typescript
import { describe, it, expect } from "vitest";
import { hasPermission, isAdmin } from "@/lib/rbac/permissions";

describe("hasPermission", () => {
  it("grants ADMIN all permissions", () => {
    expect(hasPermission("ADMIN", "leave:approve")).toBe(true);
    expect(hasPermission("ADMIN", "users:manage")).toBe(true);
    expect(hasPermission("ADMIN", "holidays:manage")).toBe(true);
  });

  it("grants EMPLOYEE only employee permissions", () => {
    expect(hasPermission("EMPLOYEE", "leave:request")).toBe(true);
    expect(hasPermission("EMPLOYEE", "leave:cancel")).toBe(true);
    expect(hasPermission("EMPLOYEE", "balances:read")).toBe(true);
  });

  it("denies EMPLOYEE admin-only permissions", () => {
    expect(hasPermission("EMPLOYEE", "leave:approve")).toBe(false);
    expect(hasPermission("EMPLOYEE", "leave:decline")).toBe(false);
    expect(hasPermission("EMPLOYEE", "users:manage")).toBe(false);
    expect(hasPermission("EMPLOYEE", "balances:adjust")).toBe(false);
    expect(hasPermission("EMPLOYEE", "holidays:manage")).toBe(false);
  });
});

describe("isAdmin", () => {
  it("returns true for ADMIN", () => {
    expect(isAdmin("ADMIN")).toBe(true);
  });

  it("returns false for EMPLOYEE", () => {
    expect(isAdmin("EMPLOYEE")).toBe(false);
  });
});
```

### Auth Session Tests (`src/lib/auth/session.test.ts`)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth module before importing session helpers
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
import {
  getSession,
  requireSession,
  requirePermission,
  requireAdmin,
} from "@/lib/auth/session";

const mockAuth = vi.mocked(auth);

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session when authenticated", async () => {
    const mockSession = {
      user: {
        id: "uuid-1",
        role: "EMPLOYEE" as const,
        email: "test@thoughtlab.studio",
      },
    };
    mockAuth.mockResolvedValue(mockSession);
    const session = await getSession();
    expect(session).toEqual(mockSession);
  });

  it("returns null when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const session = await getSession();
    expect(session).toBeNull();
  });
});

describe("requireSession", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireSession()).rejects.toThrow("Unauthorized");
  });
});

describe("requirePermission", () => {
  it("throws when user lacks permission", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "uuid-1",
        role: "EMPLOYEE" as const,
        email: "test@thoughtlab.studio",
      },
    });
    await expect(requirePermission("leave:approve")).rejects.toThrow(
      "Forbidden",
    );
  });

  it("succeeds when user has permission", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "uuid-1",
        role: "ADMIN" as const,
        email: "admin@thoughtlab.studio",
      },
    });
    const session = await requirePermission("leave:approve");
    expect(session.user.role).toBe("ADMIN");
  });
});

describe("requireAdmin", () => {
  it("throws when user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "uuid-1",
        role: "EMPLOYEE" as const,
        email: "test@thoughtlab.studio",
      },
    });
    await expect(requireAdmin()).rejects.toThrow("Forbidden");
  });
});
```

---

## Step 14: Update AGENTS.md Files

### `src/lib/AGENTS.md` — add `auth/` and `rbac/` descriptions:

- `auth/` — Server-side session verification (`getSession`, `requireSession`, `requirePermission`, `requireAdmin`)
- `rbac/` — Role enum permissions map, `hasPermission()` helper, `Permission` type

### `prisma/AGENTS.md` — note the new `Account` and `Session` models for Auth.js

---

## Files Summary

| #   | File                                      | Action                                                       |
| --- | ----------------------------------------- | ------------------------------------------------------------ |
| 1   | `prisma/schema.prisma`                    | Add Account + Session models, User relations                 |
| 2   | `src/auth.ts`                             | Create — Auth.js config with Google, JWT, domain restriction |
| 3   | `src/types/next-auth.d.ts`                | Create — Type augmentation for role in session               |
| 4   | `src/app/api/auth/[...nextauth]/route.ts` | Create — Auth.js API route handler                           |
| 5   | `next.config.ts`                          | Update CSP for Google OAuth                                  |
| 6   | `src/app/providers.tsx`                   | Create — SessionProvider wrapper                             |
| 7   | `src/app/layout.tsx`                      | Update — wrap with Providers                                 |
| 8   | `src/proxy.ts`                            | Create — route protection + RBAC                             |
| 9   | `src/app/sign-in/page.tsx`                | Create — sign-in page                                        |
| 10  | `src/components/auth/sign-in-button.tsx`  | Create — Google sign-in button                               |
| 11  | `src/components/auth/sign-out-button.tsx` | Create — sign-out button                                     |
| 12  | `src/lib/rbac/roles.ts`                   | Create — permission map                                      |
| 13  | `src/lib/rbac/permissions.ts`             | Create — hasPermission helper                                |
| 14  | `src/lib/rbac/index.ts`                   | Create — barrel export                                       |
| 15  | `src/hooks/useRbac.ts`                    | Create — client-side RBAC hook                               |
| 16  | `src/lib/auth/session.ts`                 | Create — server-side session helpers                         |
| 17  | `src/lib/auth/index.ts`                   | Create — barrel export                                       |
| 18  | `src/lib/rbac/permissions.test.ts`        | Create — RBAC unit tests                                     |
| 19  | `src/lib/auth/session.test.ts`            | Create — session helper tests                                |
| 20  | `src/lib/AGENTS.md`                       | Update — document auth/ and rbac/                            |
| 21  | `prisma/AGENTS.md`                        | Update — document Account + Session models                   |

---

## Notes

- **Dev email workaround:** The `DEV_EMAILS` array in `src/auth.ts` allows non-`@thoughtlab.studio` emails during local development. This array is only checked when `NODE_ENV === "development"`.
- **Dev admin seed:** The Phase 1 seed script should also create `connormcd98@gmail.com` as an `ADMIN` user so that the dev email has admin access during local testing. Update `prisma/seed.mts` to include this alongside the existing `admin@thoughtlab.studio` admin user.
- **JWT strategy:** We use JWT (not database sessions) so that `proxy.ts` can read session data without a DB call on every request. The `Account` and `Session` models are still needed by PrismaAdapter for the OAuth account linking flow.
- **Auth.js v5 (beta):** The `next-auth@beta` package is the Auth.js v5 release for Next.js App Router. It exports `auth()` as a universal session getter (works in server components, API routes, proxy, and server actions).
- **Proxy is not a security boundary:** Per Next.js docs, proxy is for optimistic UX redirects. Actual authorization must happen in API routes / server actions via the `requireSession` / `requirePermission` helpers.
- **`auth()` in proxy:** Auth.js v5 supports calling `auth()` directly in proxy. This reads the JWT from the session cookie without hitting the database.
- **shadcn Button:** Step 9 uses the `Button` component from shadcn — install it with `pnpm dlx shadcn@latest add button --yes` if not already present.

---

## Entry Criteria

- Phase 1 complete (Prisma schema with User model, dev server running)

## Exit Criteria

- Google OAuth sign-in works with `@thoughtlab.studio` accounts
- Non-company emails are rejected at sign-in
- Unauthenticated users are redirected to `/sign-in`
- Admin routes are inaccessible to employees
- `useRbac()` hook returns correct `can()` / `isAdmin` values
- `pnpm test` passes with RBAC + session helper tests
