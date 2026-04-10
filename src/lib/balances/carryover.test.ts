import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db/client";
import { carryOverBalances } from "./carryover";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("carryOverBalances", () => {
  it("carries over remaining balance to next year", async () => {
    mockPrisma.leaveBalance.findMany.mockResolvedValue([
      {
        userId: "user-1",
        year: 2026,
        annualAllowance: 20,
        usedDays: 12,
        carriedOver: 3,
      },
    ] as never);

    const txLeaveBalance = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn(),
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        leaveBalance: txLeaveBalance,
      }),
    );

    const result = await carryOverBalances(2026, 2027);

    expect(result.processed).toBe(1);
    expect(result.results[0]).toEqual({ userId: "user-1", carried: 11 });
    expect(txLeaveBalance.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        year: 2027,
        annualAllowance: 20,
        usedDays: 0,
        carriedOver: 11,
      },
    });
  });

  it("updates existing balance record for target year", async () => {
    mockPrisma.leaveBalance.findMany.mockResolvedValue([
      {
        userId: "user-1",
        year: 2026,
        annualAllowance: 20,
        usedDays: 15,
        carriedOver: 0,
      },
    ] as never);

    const txLeaveBalance = {
      findUnique: vi.fn().mockResolvedValue({ userId: "user-1", year: 2027 }),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn(),
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        leaveBalance: txLeaveBalance,
      }),
    );

    const result = await carryOverBalances(2026, 2027);

    expect(result.results[0]).toEqual({ userId: "user-1", carried: 5 });
    expect(txLeaveBalance.update).toHaveBeenCalledWith({
      where: { userId_year: { userId: "user-1", year: 2027 } },
      data: { carriedOver: 5 },
    });
    expect(txLeaveBalance.create).not.toHaveBeenCalled();
  });

  it("carries over 0 when all days are used", async () => {
    mockPrisma.leaveBalance.findMany.mockResolvedValue([
      {
        userId: "user-1",
        year: 2026,
        annualAllowance: 20,
        usedDays: 22,
        carriedOver: 0,
      },
    ] as never);

    const txLeaveBalance = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        leaveBalance: txLeaveBalance,
      }),
    );

    const result = await carryOverBalances(2026, 2027);

    expect(result.results[0]).toEqual({ userId: "user-1", carried: 0 });
    expect(txLeaveBalance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ carriedOver: 0 }),
    });
  });

  it("processes multiple users", async () => {
    mockPrisma.leaveBalance.findMany.mockResolvedValue([
      { userId: "user-1", annualAllowance: 20, usedDays: 10, carriedOver: 0 },
      { userId: "user-2", annualAllowance: 15, usedDays: 5, carriedOver: 2 },
    ] as never);

    const txLeaveBalance = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        leaveBalance: txLeaveBalance,
      }),
    );

    const result = await carryOverBalances(2026, 2027);

    expect(result.processed).toBe(2);
    expect(result.results).toEqual([
      { userId: "user-1", carried: 10 },
      { userId: "user-2", carried: 12 },
    ]);
  });

  it("returns empty results when no balances exist", async () => {
    mockPrisma.leaveBalance.findMany.mockResolvedValue([]);

    const result = await carryOverBalances(2026, 2027);

    expect(result.processed).toBe(0);
    expect(result.results).toEqual([]);
  });
});
