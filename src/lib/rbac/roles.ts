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
