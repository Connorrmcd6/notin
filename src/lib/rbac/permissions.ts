import type { Role } from "@/generated/prisma/client";
import { ROLE_PERMISSIONS, type Permission } from "@/lib/rbac/roles";

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function isAdmin(role: Role): boolean {
  return role === "ADMIN";
}
