import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db/client";
import { notifyAdmins, notifyEmployee } from "./notifications";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notifyAdmins", () => {
  it("creates notifications for all admins", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: "admin-1" } as never,
      { id: "admin-2" } as never,
    ]);
    mockPrisma.notification.create.mockResolvedValue({} as never);

    await notifyAdmins("Test message", "/admin");

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: { userId: "admin-1", message: "Test message", link: "/admin" },
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: { userId: "admin-2", message: "Test message", link: "/admin" },
    });
  });

  it("does nothing when no admins exist", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);

    await notifyAdmins("Test message");

    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  it("works without link", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: "admin-1" } as never,
    ]);
    mockPrisma.notification.create.mockResolvedValue({} as never);

    await notifyAdmins("Test message");

    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: { userId: "admin-1", message: "Test message", link: undefined },
    });
  });
});

describe("notifyEmployee", () => {
  it("creates a notification for the employee", async () => {
    mockPrisma.notification.create.mockResolvedValue({} as never);

    await notifyEmployee("user-1", "Your leave was approved", "/dashboard/history");

    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        message: "Your leave was approved",
        link: "/dashboard/history",
      },
    });
  });

  it("works without link", async () => {
    mockPrisma.notification.create.mockResolvedValue({} as never);

    await notifyEmployee("user-1", "Your leave was approved");

    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        message: "Your leave was approved",
        link: undefined,
      },
    });
  });
});
