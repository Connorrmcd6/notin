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
