import { describe, it, expect } from "vitest";
import { MarkReadSchema } from "./notifications";

describe("MarkReadSchema", () => {
  it("accepts ids array", () => {
    const result = MarkReadSchema.parse({
      ids: ["550e8400-e29b-41d4-a716-446655440000"],
    });
    expect(result.ids).toHaveLength(1);
  });

  it("accepts all: true", () => {
    const result = MarkReadSchema.parse({ all: true });
    expect(result.all).toBe(true);
  });

  it("rejects empty object (neither ids nor all)", () => {
    expect(() => MarkReadSchema.parse({})).toThrow();
  });

  it("rejects empty ids array", () => {
    expect(() => MarkReadSchema.parse({ ids: [] })).toThrow();
  });

  it("rejects non-UUID ids", () => {
    expect(() => MarkReadSchema.parse({ ids: ["not-a-uuid"] })).toThrow();
  });

  it("accepts both ids and all", () => {
    const result = MarkReadSchema.parse({
      ids: ["550e8400-e29b-41d4-a716-446655440000"],
      all: true,
    });
    expect(result.all).toBe(true);
    expect(result.ids).toHaveLength(1);
  });
});
