import { describe, it, expect } from "vitest";
import {
  LeaveRequestSchema,
  LeaveCancelSchema,
  LeaveApproveSchema,
  LeaveDeclineSchema,
  LeaveHistoryQuerySchema,
  BalanceAdjustSchema,
} from "./leave";

describe("LeaveRequestSchema", () => {
  const validInput = {
    leaveType: "PAID_ANNUAL",
    startDate: "2026-05-01",
    endDate: "2026-05-03",
    dayType: "FULL",
  };

  it("accepts valid full-day request", () => {
    const result = LeaveRequestSchema.parse(validInput);
    expect(result.leaveType).toBe("PAID_ANNUAL");
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
    expect(result.dayType).toBe("FULL");
  });

  it("defaults dayType to FULL", () => {
    const { dayType: _dayType, ...withoutDayType } = validInput;
    const result = LeaveRequestSchema.parse(withoutDayType);
    expect(result.dayType).toBe("FULL");
  });

  it("accepts optional note", () => {
    const result = LeaveRequestSchema.parse({
      ...validInput,
      note: "Family vacation",
    });
    expect(result.note).toBe("Family vacation");
  });

  it("coerces date strings to Date objects", () => {
    const result = LeaveRequestSchema.parse(validInput);
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
  });

  it("rejects endDate before startDate", () => {
    expect(() =>
      LeaveRequestSchema.parse({
        ...validInput,
        startDate: "2026-05-03",
        endDate: "2026-05-01",
      }),
    ).toThrow();
  });

  it("accepts same-day request", () => {
    const result = LeaveRequestSchema.parse({
      ...validInput,
      startDate: "2026-05-01",
      endDate: "2026-05-01",
    });
    expect(result.startDate.getTime()).toBe(result.endDate.getTime());
  });

  it("rejects half-day spanning multiple days", () => {
    expect(() =>
      LeaveRequestSchema.parse({
        ...validInput,
        dayType: "MORNING",
        startDate: "2026-05-01",
        endDate: "2026-05-02",
      }),
    ).toThrow();
  });

  it("accepts half-day for single day", () => {
    const result = LeaveRequestSchema.parse({
      ...validInput,
      dayType: "AFTERNOON",
      startDate: "2026-05-01",
      endDate: "2026-05-01",
    });
    expect(result.dayType).toBe("AFTERNOON");
  });

  it("rejects invalid leave type", () => {
    expect(() =>
      LeaveRequestSchema.parse({ ...validInput, leaveType: "SICK" }),
    ).toThrow();
  });

  it("rejects note over 500 characters", () => {
    expect(() =>
      LeaveRequestSchema.parse({ ...validInput, note: "a".repeat(501) }),
    ).toThrow();
  });

  it("accepts UNPAID leave type", () => {
    const result = LeaveRequestSchema.parse({
      ...validInput,
      leaveType: "UNPAID",
    });
    expect(result.leaveType).toBe("UNPAID");
  });
});

describe("LeaveCancelSchema", () => {
  it("accepts valid UUID", () => {
    const result = LeaveCancelSchema.parse({
      requestId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.requestId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects non-UUID string", () => {
    expect(() => LeaveCancelSchema.parse({ requestId: "not-a-uuid" })).toThrow();
  });
});

describe("LeaveApproveSchema", () => {
  it("accepts valid UUID", () => {
    const result = LeaveApproveSchema.parse({
      requestId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.requestId).toBeDefined();
  });

  it("rejects missing requestId", () => {
    expect(() => LeaveApproveSchema.parse({})).toThrow();
  });
});

describe("LeaveDeclineSchema", () => {
  it("accepts valid input", () => {
    const result = LeaveDeclineSchema.parse({
      requestId: "550e8400-e29b-41d4-a716-446655440000",
      reason: "Team capacity conflict",
    });
    expect(result.reason).toBe("Team capacity conflict");
  });

  it("rejects empty reason", () => {
    expect(() =>
      LeaveDeclineSchema.parse({
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        reason: "",
      }),
    ).toThrow();
  });

  it("rejects reason over 500 characters", () => {
    expect(() =>
      LeaveDeclineSchema.parse({
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        reason: "a".repeat(501),
      }),
    ).toThrow();
  });
});

describe("LeaveHistoryQuerySchema", () => {
  it("applies defaults for page and limit", () => {
    const result = LeaveHistoryQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("coerces string numbers", () => {
    const result = LeaveHistoryQuerySchema.parse({
      year: "2026",
      page: "2",
      limit: "50",
    });
    expect(result.year).toBe(2026);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
  });

  it("accepts optional status filter", () => {
    const result = LeaveHistoryQuerySchema.parse({ status: "APPROVED" });
    expect(result.status).toBe("APPROVED");
  });

  it("rejects limit over 100", () => {
    expect(() => LeaveHistoryQuerySchema.parse({ limit: "101" })).toThrow();
  });

  it("rejects page less than 1", () => {
    expect(() => LeaveHistoryQuerySchema.parse({ page: "0" })).toThrow();
  });
});

describe("BalanceAdjustSchema", () => {
  const validInput = {
    userId: "550e8400-e29b-41d4-a716-446655440000",
    year: 2026,
    days: 2.5,
    reason: "Bonus days for project completion",
  };

  it("accepts valid input", () => {
    const result = BalanceAdjustSchema.parse(validInput);
    expect(result.days).toBe(2.5);
    expect(result.reason).toBe("Bonus days for project completion");
  });

  it("accepts negative days", () => {
    const result = BalanceAdjustSchema.parse({ ...validInput, days: -1 });
    expect(result.days).toBe(-1);
  });

  it("rejects missing reason", () => {
    const { reason: _reason, ...withoutReason } = validInput;
    expect(() => BalanceAdjustSchema.parse(withoutReason)).toThrow();
  });

  it("rejects invalid userId", () => {
    expect(() =>
      BalanceAdjustSchema.parse({ ...validInput, userId: "not-uuid" }),
    ).toThrow();
  });
});
