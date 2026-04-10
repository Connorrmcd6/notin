import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db/client";
import { getBalances, adjustBalance } from "./service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getBalances", () => {
  it("returns balances ordered by year descending", async () => {
    mockPrisma.leaveBalance.findMany.mockResolvedValue([
      { year: 2027 },
      { year: 2026 },
    ] as never);

    const result = await getBalances("user-1");

    expect(result).toHaveLength(2);
    expect(mockPrisma.leaveBalance.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { year: "desc" },
    });
  });
});

describe("adjustBalance", () => {
  it("adjusts balance and creates audit record", async () => {
    const txLeaveBalance = {
      upsert: vi.fn().mockResolvedValue({
        userId: "user-1",
        year: 2026,
        annualAllowance: 22,
        usedDays: 5,
        carriedOver: 0,
      }),
    };
    const txBalanceAdjustment = {
      create: vi.fn().mockResolvedValue({
        userId: "user-1",
        adjustedBy: "admin-1",
        year: 2026,
        days: 2,
        reason: "Bonus days",
      }),
    };

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        leaveBalance: txLeaveBalance,
        balanceAdjustment: txBalanceAdjustment,
      }),
    );

    const result = await adjustBalance("admin-1", {
      userId: "user-1",
      year: 2026,
      days: 2,
      reason: "Bonus days",
    });

    expect(result.balance.annualAllowance).toBe(22);
    expect(result.adjustment.days).toBe(2);
    expect(txLeaveBalance.upsert).toHaveBeenCalledWith({
      where: { userId_year: { userId: "user-1", year: 2026 } },
      update: { annualAllowance: { increment: 2 } },
      create: {
        userId: "user-1",
        year: 2026,
        annualAllowance: 2,
        usedDays: 0,
        carriedOver: 0,
      },
    });
    expect(txBalanceAdjustment.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        adjustedBy: "admin-1",
        year: 2026,
        days: 2,
        reason: "Bonus days",
      },
    });
  });

  it("handles negative adjustment", async () => {
    const txLeaveBalance = {
      upsert: vi.fn().mockResolvedValue({
        annualAllowance: 18,
      }),
    };
    const txBalanceAdjustment = {
      create: vi.fn().mockResolvedValue({ days: -2 }),
    };

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        leaveBalance: txLeaveBalance,
        balanceAdjustment: txBalanceAdjustment,
      }),
    );

    const result = await adjustBalance("admin-1", {
      userId: "user-1",
      year: 2026,
      days: -2,
      reason: "Correction",
    });

    expect(txLeaveBalance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { annualAllowance: { increment: -2 } },
        create: expect.objectContaining({ annualAllowance: 0 }),
      }),
    );
    expect(result.adjustment.days).toBe(-2);
  });
});
