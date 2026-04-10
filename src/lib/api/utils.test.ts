import { describe, it, expect, vi } from "vitest";
import { z } from "zod/v4";
import { withErrorHandler } from "./utils";

function makeRequest(): Request {
  return new Request("http://localhost/test", { method: "POST" });
}

describe("withErrorHandler", () => {
  it("passes through successful responses", async () => {
    const handler = withErrorHandler(async () =>
      Response.json({ data: "ok" }, { status: 200 }),
    );

    const res = await handler(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: "ok" });
  });

  it("maps ZodError to 400", async () => {
    const handler = withErrorHandler(async () => {
      z.string().parse(123);
      return Response.json({});
    });

    const res = await handler(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
    expect(body.details[0].code).toBe("invalid_type");
  });

  it("maps 'Unauthorized' to 401", async () => {
    const handler = withErrorHandler(async () => {
      throw new Error("Unauthorized");
    });

    const res = await handler(makeRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("maps 'Forbidden' to 403", async () => {
    const handler = withErrorHandler(async () => {
      throw new Error("Forbidden");
    });

    const res = await handler(makeRequest());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("maps 'Not found' to 404", async () => {
    const handler = withErrorHandler(async () => {
      throw new Error("Not found");
    });

    const res = await handler(makeRequest());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("maps 'BUSINESS:' prefix to 422", async () => {
    const handler = withErrorHandler(async () => {
      throw new Error("BUSINESS:Insufficient balance");
    });

    const res = await handler(makeRequest());
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "Insufficient balance" });
  });

  it("maps unknown errors to 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const handler = withErrorHandler(async () => {
      throw new Error("something unexpected");
    });

    const res = await handler(makeRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});
