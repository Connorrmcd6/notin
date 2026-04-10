import { describe, it, expect } from "vitest";
import { UpdateRoleSchema, DeleteUserParamSchema } from "./users";

describe("UpdateRoleSchema", () => {
  it("accepts ADMIN role", () => {
    expect(UpdateRoleSchema.parse({ role: "ADMIN" }).role).toBe("ADMIN");
  });

  it("accepts EMPLOYEE role", () => {
    expect(UpdateRoleSchema.parse({ role: "EMPLOYEE" }).role).toBe("EMPLOYEE");
  });

  it("rejects invalid role", () => {
    expect(() => UpdateRoleSchema.parse({ role: "MANAGER" })).toThrow();
  });

  it("rejects missing role", () => {
    expect(() => UpdateRoleSchema.parse({})).toThrow();
  });
});

describe("DeleteUserParamSchema", () => {
  it("accepts a valid UUID", () => {
    const result = DeleteUserParamSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects non-UUID string", () => {
    expect(() => DeleteUserParamSchema.parse({ id: "not-a-uuid" })).toThrow();
  });

  it("rejects missing id", () => {
    expect(() => DeleteUserParamSchema.parse({})).toThrow();
  });
});
