import { describe, it, expect } from "vitest";
import {
  calculateLeaveDays,
  hasMinimumNotice,
  findHolidayOverlaps,
  calculateRemainingBalance,
  hasSufficientBalance,
} from "./calculations";

describe("calculateLeaveDays", () => {
  it("returns 0.5 for MORNING half-day", () => {
    const date = new Date("2026-05-04"); // Monday
    expect(calculateLeaveDays(date, date, "MORNING")).toBe(0.5);
  });

  it("returns 0.5 for AFTERNOON half-day", () => {
    const date = new Date("2026-05-04"); // Monday
    expect(calculateLeaveDays(date, date, "AFTERNOON")).toBe(0.5);
  });

  it("returns 1 for single FULL weekday", () => {
    const date = new Date("2026-05-04"); // Monday
    expect(calculateLeaveDays(date, date, "FULL")).toBe(1);
  });

  it("excludes weekends from multi-day range", () => {
    // Mon May 4 to Fri May 8 = 5 weekdays
    const start = new Date("2026-05-04");
    const end = new Date("2026-05-08");
    expect(calculateLeaveDays(start, end, "FULL")).toBe(5);
  });

  it("excludes weekends when range spans a weekend", () => {
    // Mon May 4 to Fri May 15 = 10 weekdays (skip Sat 9, Sun 10)
    const start = new Date("2026-05-04");
    const end = new Date("2026-05-15");
    expect(calculateLeaveDays(start, end, "FULL")).toBe(10);
  });

  it("returns 0 for a weekend-only range", () => {
    // Sat May 9 to Sun May 10
    const start = new Date("2026-05-09");
    const end = new Date("2026-05-10");
    expect(calculateLeaveDays(start, end, "FULL")).toBe(0);
  });

  it("returns 2 for two consecutive weekdays", () => {
    const start = new Date("2026-05-04"); // Monday
    const end = new Date("2026-05-05"); // Tuesday
    expect(calculateLeaveDays(start, end, "FULL")).toBe(2);
  });

  it("excludes public holidays from count", () => {
    // Mon May 4 to Fri May 8 = 5 weekdays, but May 5 is a holiday
    const start = new Date("2026-05-04");
    const end = new Date("2026-05-08");
    const holidays = [new Date("2026-05-05")];
    expect(calculateLeaveDays(start, end, "FULL", holidays)).toBe(4);
  });

  it("excludes multiple holidays", () => {
    // Mon May 4 to Fri May 8, May 4 and May 6 are holidays
    const start = new Date("2026-05-04");
    const end = new Date("2026-05-08");
    const holidays = [new Date("2026-05-04"), new Date("2026-05-06")];
    expect(calculateLeaveDays(start, end, "FULL", holidays)).toBe(3);
  });

  it("does not double-count holidays on weekends", () => {
    // Mon May 4 to Sun May 10 = 5 weekdays, holiday on Sat May 9 has no effect
    const start = new Date("2026-05-04");
    const end = new Date("2026-05-10");
    const holidays = [new Date("2026-05-09")];
    expect(calculateLeaveDays(start, end, "FULL", holidays)).toBe(5);
  });
});

describe("hasMinimumNotice", () => {
  const today = new Date("2026-05-10");

  it("returns true for tomorrow", () => {
    expect(hasMinimumNotice(new Date("2026-05-11"), today)).toBe(true);
  });

  it("returns true for a future date", () => {
    expect(hasMinimumNotice(new Date("2026-05-20"), today)).toBe(true);
  });

  it("returns false for today", () => {
    expect(hasMinimumNotice(new Date("2026-05-10"), today)).toBe(false);
  });

  it("returns false for yesterday", () => {
    expect(hasMinimumNotice(new Date("2026-05-09"), today)).toBe(false);
  });
});

describe("findHolidayOverlaps", () => {
  const holidays = [
    new Date("2026-04-27"), // Freedom Day
    new Date("2026-05-01"), // Workers' Day
    new Date("2026-06-16"), // Youth Day
  ];

  it("finds overlapping holidays", () => {
    const start = new Date("2026-04-25");
    const end = new Date("2026-05-02");
    const overlaps = findHolidayOverlaps(start, end, holidays);
    expect(overlaps).toHaveLength(2);
  });

  it("returns empty when no overlaps", () => {
    const start = new Date("2026-07-01");
    const end = new Date("2026-07-05");
    const overlaps = findHolidayOverlaps(start, end, holidays);
    expect(overlaps).toHaveLength(0);
  });

  it("includes holidays on range boundaries", () => {
    const start = new Date("2026-05-01");
    const end = new Date("2026-05-01");
    const overlaps = findHolidayOverlaps(start, end, holidays);
    expect(overlaps).toHaveLength(1);
  });
});

describe("calculateRemainingBalance", () => {
  it("calculates remaining correctly", () => {
    expect(
      calculateRemainingBalance({
        annualAllowance: 20,
        usedDays: 5,
        carriedOver: 3,
      }),
    ).toBe(18);
  });

  it("returns 0 when fully used", () => {
    expect(
      calculateRemainingBalance({
        annualAllowance: 20,
        usedDays: 20,
        carriedOver: 0,
      }),
    ).toBe(0);
  });

  it("handles half-day values", () => {
    expect(
      calculateRemainingBalance({
        annualAllowance: 20,
        usedDays: 5.5,
        carriedOver: 1.5,
      }),
    ).toBe(16);
  });
});

describe("hasSufficientBalance", () => {
  it("returns true when balance is sufficient", () => {
    expect(hasSufficientBalance(10, 5)).toBe(true);
  });

  it("returns true when balance equals requested", () => {
    expect(hasSufficientBalance(5, 5)).toBe(true);
  });

  it("returns false when balance is insufficient", () => {
    expect(hasSufficientBalance(4, 5)).toBe(false);
  });

  it("works with half-day values", () => {
    expect(hasSufficientBalance(0.5, 0.5)).toBe(true);
    expect(hasSufficientBalance(0, 0.5)).toBe(false);
  });
});
