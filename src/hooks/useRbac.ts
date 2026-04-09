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
