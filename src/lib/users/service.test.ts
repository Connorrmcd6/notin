import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db/client";
import { deleteUser } from "./service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteUser", () => {
  it("allows self-delete", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "EMPLOYEE" });
    mockPrisma.user.delete.mockResolvedValue({});

    await deleteUser("user-1", "user-1", false);

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });
  });

  it("allows admin to delete another user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "EMPLOYEE" });
    mockPrisma.user.delete.mockResolvedValue({});

    await deleteUser("user-2", "admin-1", true);

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: "user-2" },
    });
  });

  it("throws Forbidden for non-admin cross-delete", async () => {
    await expect(
      deleteUser("user-2", "user-1", false),
    ).rejects.toThrow("Forbidden");
  });

  it("throws Not found for missing user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      deleteUser("missing", "missing", false),
    ).rejects.toThrow("Not found");
  });

  it("blocks deleting the last admin", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    mockPrisma.user.count.mockResolvedValue(1);

    await expect(
      deleteUser("admin-1", "admin-1", true),
    ).rejects.toThrow("BUSINESS:Cannot delete the last admin");
  });

  it("allows deleting an admin when another admin exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    mockPrisma.user.count.mockResolvedValue(2);
    mockPrisma.user.delete.mockResolvedValue({});

    await deleteUser("admin-1", "admin-1", true);

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: "admin-1" },
    });
  });
});
