import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db/client";
import {
  getUnreadNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "./service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUnreadNotifications", () => {
  it("filters by userId and read=false, limits to 20", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);

    await getUnreadNotifications("user-1");

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", read: false },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });
});

describe("getUnreadCount", () => {
  it("counts unread notifications for the user", async () => {
    mockPrisma.notification.count.mockResolvedValue(5);

    const result = await getUnreadCount("user-1");

    expect(result).toBe(5);
    expect(mockPrisma.notification.count).toHaveBeenCalledWith({
      where: { userId: "user-1", read: false },
    });
  });
});

describe("markAsRead", () => {
  it("updates specific notifications filtered by userId", async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 2 });

    await markAsRead("user-1", ["id-1", "id-2"]);

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["id-1", "id-2"] }, userId: "user-1" },
      data: { read: true },
    });
  });
});

describe("markAllAsRead", () => {
  it("updates all unread notifications for the user", async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 10 });

    await markAllAsRead("user-1");

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", read: false },
      data: { read: true },
    });
  });
});
