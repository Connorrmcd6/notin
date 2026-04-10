import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db/client";
import {
  getHolidaysByYear,
  createCustomHoliday,
  deleteHoliday,
  getTeamLeaveForMonth,
  getHolidaysForMonth,
  generateSAPublicHolidays,
} from "./service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: holidays already exist for the year
  mockPrisma.publicHoliday.count.mockResolvedValue(12);
});

describe("getHolidaysByYear", () => {
  it("returns holidays ordered by date", async () => {
    const holidays = [
      { id: "1", date: new Date("2026-01-01"), name: "New Year" },
      { id: "2", date: new Date("2026-03-21"), name: "Human Rights Day" },
    ];
    mockPrisma.publicHoliday.findMany.mockResolvedValue(holidays);

    const result = await getHolidaysByYear(2026);

    expect(result).toEqual(holidays);
    expect(mockPrisma.publicHoliday.findMany).toHaveBeenCalledWith({
      where: { year: 2026 },
      orderBy: { date: "asc" },
    });
  });

  it("auto-generates SA holidays when none exist for the year", async () => {
    mockPrisma.publicHoliday.count.mockResolvedValue(0);
    mockPrisma.publicHoliday.createMany.mockResolvedValue({ count: 12 });
    mockPrisma.publicHoliday.findMany.mockResolvedValue([]);

    await getHolidaysByYear(2028);

    expect(mockPrisma.publicHoliday.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: expect.arrayContaining([
          expect.objectContaining({ name: "New Year's Day", year: 2028, isCustom: false }),
        ]),
      }),
    );
  });

  it("does not re-generate when holidays already exist", async () => {
    mockPrisma.publicHoliday.findMany.mockResolvedValue([]);

    await getHolidaysByYear(2026);

    expect(mockPrisma.publicHoliday.createMany).not.toHaveBeenCalled();
  });
});

describe("generateSAPublicHolidays", () => {
  it("generates 12+ holidays for a year", () => {
    const holidays = generateSAPublicHolidays(2026);
    expect(holidays.length).toBeGreaterThanOrEqual(12);
  });

  it("includes Sunday substitution holidays", () => {
    // 2028-01-01 is a Saturday, but 2023-01-01 was a Sunday — test a year with a substitution
    const holidays = generateSAPublicHolidays(2023);
    const observed = holidays.filter((h) => h.name.includes("(observed)"));
    expect(observed.length).toBeGreaterThan(0);
  });

  it("generates dates at noon UTC to avoid timezone shifts", () => {
    const holidays = generateSAPublicHolidays(2026);
    for (const h of holidays) {
      expect(h.date.getUTCHours()).toBe(12);
    }
  });
});

describe("createCustomHoliday", () => {
  it("creates holiday with isCustom true and derived year", async () => {
    const date = new Date("2026-06-16");
    mockPrisma.publicHoliday.findUnique.mockResolvedValue(null);
    mockPrisma.publicHoliday.create.mockResolvedValue({
      id: "1",
      date,
      name: "Youth Day",
      year: 2026,
      isCustom: true,
    });

    const result = await createCustomHoliday({ date, name: "Youth Day" });

    expect(result.isCustom).toBe(true);
    expect(mockPrisma.publicHoliday.create).toHaveBeenCalledWith({
      data: { date, name: "Youth Day", year: 2026, isCustom: true },
    });
  });

  it("throws BUSINESS error if date already exists", async () => {
    const date = new Date("2026-01-01");
    mockPrisma.publicHoliday.findUnique.mockResolvedValue({
      id: "1",
      date,
      name: "Existing",
    });

    await expect(
      createCustomHoliday({ date, name: "Duplicate" }),
    ).rejects.toThrow("BUSINESS:A holiday already exists on this date");
  });
});

describe("deleteHoliday", () => {
  it("deletes existing holiday", async () => {
    mockPrisma.publicHoliday.findUnique.mockResolvedValue({ id: "1" });
    mockPrisma.publicHoliday.delete.mockResolvedValue({});

    await deleteHoliday("1");

    expect(mockPrisma.publicHoliday.delete).toHaveBeenCalledWith({
      where: { id: "1" },
    });
  });

  it("throws Not found for missing holiday", async () => {
    mockPrisma.publicHoliday.findUnique.mockResolvedValue(null);

    await expect(deleteHoliday("missing")).rejects.toThrow("Not found");
  });
});

describe("getTeamLeaveForMonth", () => {
  it("queries approved leave overlapping the month", async () => {
    mockPrisma.leaveRequest.findMany.mockResolvedValue([]);

    await getTeamLeaveForMonth(2026, 4);

    const call = mockPrisma.leaveRequest.findMany.mock.calls[0][0];
    expect(call.where.status).toBe("APPROVED");
    expect(call.where.startDate.lte).toEqual(new Date(2026, 3, 30));
    expect(call.where.endDate.gte).toEqual(new Date(2026, 3, 1));
    expect(call.include.user.select).toEqual({
      id: true,
      name: true,
      email: true,
    });
  });
});

describe("getHolidaysForMonth", () => {
  it("queries holidays within the month range", async () => {
    mockPrisma.publicHoliday.findMany.mockResolvedValue([]);

    await getHolidaysForMonth(2026, 4);

    const call = mockPrisma.publicHoliday.findMany.mock.calls[0][0];
    expect(call.where.date.gte).toEqual(new Date(2026, 3, 1));
    expect(call.where.date.lte).toEqual(new Date(2026, 3, 30));
  });
});
