import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn<() => Promise<Session | null>>(),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

import {
  getSession,
  requireSession,
  requirePermission,
  requireAdmin,
} from "@/lib/auth/session";

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session when authenticated", async () => {
    const mockSession = {
      expires: "2026-12-31T00:00:00.000Z",
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireSession()).rejects.toThrow("Unauthorized");
  });
});

describe("requirePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when user lacks permission", async () => {
    mockAuth.mockResolvedValue({
      expires: "2026-12-31T00:00:00.000Z",
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
      expires: "2026-12-31T00:00:00.000Z",
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when user is not admin", async () => {
    mockAuth.mockResolvedValue({
      expires: "2026-12-31T00:00:00.000Z",
      user: {
        id: "uuid-1",
        role: "EMPLOYEE" as const,
        email: "test@thoughtlab.studio",
      },
    });
    await expect(requireAdmin()).rejects.toThrow("Forbidden");
  });
});
