import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db/client";
import {
  submitLeaveRequest,
  cancelLeaveRequest,
  approveLeaveRequest,
  declineLeaveRequest,
  getLeaveHistory,
  getPendingRequests,
} from "./service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
});

// Find the next weekday (Mon-Fri) from a given date
function nextWeekday(from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

const tomorrow = nextWeekday(new Date());
const dayAfterTomorrow = nextWeekday(tomorrow);

const baseInput = {
  leaveType: "PAID_ANNUAL" as const,
  startDate: tomorrow,
  endDate: tomorrow,
  dayType: "FULL" as const,
  note: undefined,
};

describe("submitLeaveRequest", () => {
  it("rejects requests with insufficient notice", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await expect(
      submitLeaveRequest("user-1", { ...baseInput, startDate: yesterday, endDate: yesterday }),
    ).rejects.toThrow("Leave requests require at least 1 day notice");
  });

  it("rejects requests for today", async () => {
    const today = new Date();

    await expect(
      submitLeaveRequest("user-1", { ...baseInput, startDate: today, endDate: today }),
    ).rejects.toThrow("Leave requests require at least 1 day notice");
  });

  it("rejects paid leave with no balance record", async () => {
    mockPrisma.publicHoliday.findMany.mockResolvedValue([]);
    mockPrisma.leaveBalance.findUnique.mockResolvedValue(null);

    await expect(
      submitLeaveRequest("user-1", baseInput),
    ).rejects.toThrow("No leave balance found for this year");
  });

  it("rejects paid leave when beyond negative balance limit", async () => {
    mockPrisma.publicHoliday.findMany.mockResolvedValue([]);
    mockPrisma.leaveBalance.findUnique.mockResolvedValue({
      annualAllowance: 20,
      usedDays: 26,
      carriedOver: 0,
    } as never);

    await expect(
      submitLeaveRequest("user-1", baseInput),
    ).rejects.toThrow("Insufficient balance");
  });

  it("creates request for paid leave with sufficient balance", async () => {
    mockPrisma.leaveBalance.findUnique.mockResolvedValue({
      annualAllowance: 20,
      usedDays: 5,
      carriedOver: 0,
    } as never);
    mockPrisma.publicHoliday.findMany.mockResolvedValue([]);
    mockPrisma.leaveRequest.create.mockResolvedValue({ id: "req-1", status: "PENDING" } as never);
    mockPrisma.user.findUnique.mockResolvedValue({ name: "Test User" } as never);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.notification.create.mockResolvedValue({} as never);

    const result = await submitLeaveRequest("user-1", baseInput);

    expect(result.request.status).toBe("PENDING");
    expect(result.warnings).toEqual([]);
    expect(mockPrisma.leaveRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        leaveType: "PAID_ANNUAL",
      }),
    });
  });

  it("rejects request with zero working days", async () => {
    // Return a holiday on the same day as tomorrow, making it 0 working days
    mockPrisma.publicHoliday.findMany.mockResolvedValue([
      { date: tomorrow },
    ]);

    await expect(
      submitLeaveRequest("user-1", baseInput),
    ).rejects.toThrow("Selected dates contain no working days");
  });

  it("allows unpaid leave without balance check", async () => {
    mockPrisma.publicHoliday.findMany.mockResolvedValue([]);
    mockPrisma.leaveRequest.create.mockResolvedValue({ id: "req-1", status: "PENDING" } as never);
    mockPrisma.user.findUnique.mockResolvedValue({ name: "Test User" } as never);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.notification.create.mockResolvedValue({} as never);

    const result = await submitLeaveRequest("user-1", {
      ...baseInput,
      leaveType: "UNPAID",
    });

    expect(result.request.status).toBe("PENDING");
    expect(mockPrisma.leaveBalance.findUnique).not.toHaveBeenCalled();
  });

  it("returns warnings for public holiday overlaps", async () => {
    mockPrisma.leaveBalance.findUnique.mockResolvedValue({
      annualAllowance: 20,
      usedDays: 0,
      carriedOver: 0,
    } as never);
    mockPrisma.publicHoliday.findMany.mockResolvedValue([
      { date: tomorrow, name: "Freedom Day" },
    ] as never);
    mockPrisma.leaveRequest.create.mockResolvedValue({ id: "req-1", status: "PENDING" } as never);
    mockPrisma.user.findUnique.mockResolvedValue({ name: "Test User" } as never);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.notification.create.mockResolvedValue({} as never);

    // Use a multi-day range so there are still working days after excluding the holiday
    const result = await submitLeaveRequest("user-1", {
      ...baseInput,
      endDate: dayAfterTomorrow,
    });

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Freedom Day");
  });
});

describe("cancelLeaveRequest", () => {
  it("rejects cancellation of non-owned request", async () => {
    mockPrisma.leaveRequest.findFirst.mockResolvedValue(null);

    await expect(
      cancelLeaveRequest("user-1", "req-1"),
    ).rejects.toThrow("Not found");
  });

  it("rejects cancellation of declined request", async () => {
    mockPrisma.leaveRequest.findFirst.mockResolvedValue({
      id: "req-1",
      userId: "user-1",
      status: "DECLINED",
    } as never);

    await expect(
      cancelLeaveRequest("user-1", "req-1"),
    ).rejects.toThrow("Only pending or approved requests can be cancelled");
  });

  it("cancels pending request without refund", async () => {
    mockPrisma.leaveRequest.findFirst.mockResolvedValue({
      id: "req-1",
      userId: "user-1",
      status: "PENDING",
      leaveType: "PAID_ANNUAL",
      startDate: tomorrow,
      endDate: tomorrow,
      dayType: "FULL",
    } as never);

    const txLeaveRequest = { update: vi.fn().mockResolvedValue({ id: "req-1", status: "CANCELLED" }) };
    const txLeaveBalance = { update: vi.fn() };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        leaveRequest: txLeaveRequest,
        leaveBalance: txLeaveBalance,
      }),
    );
    mockPrisma.user.findUnique.mockResolvedValue({ name: "Test" } as never);
    mockPrisma.user.findMany.mockResolvedValue([]);

    const result = await cancelLeaveRequest("user-1", "req-1");

    expect(result.status).toBe("CANCELLED");
    expect(txLeaveBalance.update).not.toHaveBeenCalled();
  });

  it("cancels approved paid request with balance refund", async () => {
    mockPrisma.leaveRequest.findFirst.mockResolvedValue({
      id: "req-1",
      userId: "user-1",
      status: "APPROVED",
      leaveType: "PAID_ANNUAL",
      startDate: tomorrow,
      endDate: tomorrow,
      dayType: "FULL",
    } as never);
    mockPrisma.publicHoliday.findMany.mockResolvedValue([]);

    const txLeaveRequest = { update: vi.fn().mockResolvedValue({ id: "req-1", status: "CANCELLED" }) };
    const txLeaveBalance = { update: vi.fn() };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        leaveRequest: txLeaveRequest,
        leaveBalance: txLeaveBalance,
      }),
    );
    mockPrisma.user.findUnique.mockResolvedValue({ name: "Test" } as never);
    mockPrisma.user.findMany.mockResolvedValue([]);

    await cancelLeaveRequest("user-1", "req-1");

    expect(txLeaveBalance.update).toHaveBeenCalledWith({
      where: { userId_year: { userId: "user-1", year: tomorrow.getFullYear() } },
      data: { usedDays: { decrement: 1 } },
    });
  });
});

describe("approveLeaveRequest", () => {
  it("rejects non-existent request", async () => {
    mockPrisma.leaveRequest.findUnique.mockResolvedValue(null);

    await expect(
      approveLeaveRequest("admin-1", "req-1"),
    ).rejects.toThrow("Not found");
  });

  it("rejects non-pending request", async () => {
    mockPrisma.leaveRequest.findUnique.mockResolvedValue({
      id: "req-1",
      status: "APPROVED",
    } as never);

    await expect(
      approveLeaveRequest("admin-1", "req-1"),
    ).rejects.toThrow("Only pending requests can be approved");
  });

  it("approves and deducts balance for paid leave", async () => {
    mockPrisma.leaveRequest.findUnique.mockResolvedValue({
      id: "req-1",
      userId: "user-1",
      status: "PENDING",
      leaveType: "PAID_ANNUAL",
      startDate: tomorrow,
      endDate: tomorrow,
      dayType: "FULL",
    } as never);
    mockPrisma.publicHoliday.findMany.mockResolvedValue([]);

    const txLeaveBalance = {
      findUnique: vi.fn().mockResolvedValue({
        annualAllowance: 20,
        usedDays: 5,
        carriedOver: 0,
      }),
      update: vi.fn(),
    };
    const txLeaveRequest = {
      update: vi.fn().mockResolvedValue({ id: "req-1", status: "APPROVED" }),
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        leaveBalance: txLeaveBalance,
        leaveRequest: txLeaveRequest,
      }),
    );
    mockPrisma.notification.create.mockResolvedValue({} as never);

    const result = await approveLeaveRequest("admin-1", "req-1");

    expect(result.status).toBe("APPROVED");
    expect(txLeaveBalance.update).toHaveBeenCalledWith({
      where: { userId_year: { userId: "user-1", year: tomorrow.getFullYear() } },
      data: { usedDays: { increment: 1 } },
    });
  });

  it("approves unpaid leave without touching balance", async () => {
    mockPrisma.leaveRequest.findUnique.mockResolvedValue({
      id: "req-1",
      userId: "user-1",
      status: "PENDING",
      leaveType: "UNPAID",
      startDate: tomorrow,
      endDate: tomorrow,
      dayType: "FULL",
    } as never);
    mockPrisma.publicHoliday.findMany.mockResolvedValue([]);

    const txLeaveBalance = { findUnique: vi.fn(), update: vi.fn() };
    const txLeaveRequest = {
      update: vi.fn().mockResolvedValue({ id: "req-1", status: "APPROVED" }),
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        leaveBalance: txLeaveBalance,
        leaveRequest: txLeaveRequest,
      }),
    );
    mockPrisma.notification.create.mockResolvedValue({} as never);

    await approveLeaveRequest("admin-1", "req-1");

    expect(txLeaveBalance.findUnique).not.toHaveBeenCalled();
    expect(txLeaveBalance.update).not.toHaveBeenCalled();
  });

  it("rejects approval when balance is insufficient", async () => {
    mockPrisma.leaveRequest.findUnique.mockResolvedValue({
      id: "req-1",
      userId: "user-1",
      status: "PENDING",
      leaveType: "PAID_ANNUAL",
      startDate: tomorrow,
      endDate: dayAfterTomorrow,
      dayType: "FULL",
    } as never);
    mockPrisma.publicHoliday.findMany.mockResolvedValue([]);

    const txLeaveBalance = {
      findUnique: vi.fn().mockResolvedValue({
        annualAllowance: 20,
        usedDays: 27,
        carriedOver: 0,
      }),
    };
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        leaveBalance: txLeaveBalance,
        leaveRequest: { update: vi.fn() },
      }),
    );

    await expect(
      approveLeaveRequest("admin-1", "req-1"),
    ).rejects.toThrow("Insufficient balance");
  });
});

describe("declineLeaveRequest", () => {
  it("rejects non-existent request", async () => {
    mockPrisma.leaveRequest.findUnique.mockResolvedValue(null);

    await expect(
      declineLeaveRequest("admin-1", "req-1", "Too busy"),
    ).rejects.toThrow("Not found");
  });

  it("rejects non-pending request", async () => {
    mockPrisma.leaveRequest.findUnique.mockResolvedValue({
      id: "req-1",
      status: "APPROVED",
    } as never);

    await expect(
      declineLeaveRequest("admin-1", "req-1", "Too busy"),
    ).rejects.toThrow("Only pending requests can be declined");
  });

  it("declines with reason and notifies employee", async () => {
    mockPrisma.leaveRequest.findUnique.mockResolvedValue({
      id: "req-1",
      userId: "user-1",
      status: "PENDING",
      startDate: tomorrow,
      endDate: tomorrow,
    } as never);
    mockPrisma.leaveRequest.update.mockResolvedValue({
      id: "req-1",
      status: "DECLINED",
      declineReason: "Team capacity",
    } as never);
    mockPrisma.notification.create.mockResolvedValue({} as never);

    const result = await declineLeaveRequest("admin-1", "req-1", "Team capacity");

    expect(result.status).toBe("DECLINED");
    expect(mockPrisma.leaveRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: expect.objectContaining({
        status: "DECLINED",
        reviewedBy: "admin-1",
        declineReason: "Team capacity",
      }),
    });
    expect(mockPrisma.notification.create).toHaveBeenCalled();
  });
});

describe("getLeaveHistory", () => {
  it("returns paginated results", async () => {
    mockPrisma.leaveRequest.findMany.mockResolvedValue([{ id: "req-1" }] as never);
    mockPrisma.leaveRequest.count.mockResolvedValue(1);

    const result = await getLeaveHistory("user-1", { page: 1, limit: 20 });

    expect(result.requests).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        skip: 0,
        take: 20,
      }),
    );
  });

  it("applies status filter", async () => {
    mockPrisma.leaveRequest.findMany.mockResolvedValue([]);
    mockPrisma.leaveRequest.count.mockResolvedValue(0);

    await getLeaveHistory("user-1", { status: "APPROVED", page: 1, limit: 20 });

    expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", status: "APPROVED" },
      }),
    );
  });

  it("applies year filter", async () => {
    mockPrisma.leaveRequest.findMany.mockResolvedValue([]);
    mockPrisma.leaveRequest.count.mockResolvedValue(0);

    await getLeaveHistory("user-1", { year: 2026, page: 1, limit: 20 });

    expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          startDate: {
            gte: new Date("2026-01-01"),
            lt: new Date("2027-01-01"),
          },
        },
      }),
    );
  });

  it("calculates correct skip for page 2", async () => {
    mockPrisma.leaveRequest.findMany.mockResolvedValue([]);
    mockPrisma.leaveRequest.count.mockResolvedValue(0);

    await getLeaveHistory("user-1", { page: 2, limit: 10 });

    expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });
});

describe("getPendingRequests", () => {
  it("returns pending requests with user info", async () => {
    mockPrisma.leaveRequest.findMany.mockResolvedValue([
      { id: "req-1", status: "PENDING" },
    ] as never);

    const result = await getPendingRequests();

    expect(result).toHaveLength(1);
    expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledWith({
      where: { status: "PENDING" },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  });
});
