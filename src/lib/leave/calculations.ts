import type { DayType } from "@/generated/prisma/client";

/**
 * Check if a date falls on a weekend (Saturday or Sunday).
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Calculate the number of working leave days for a request.
 * Excludes weekends and public holidays from the count.
 * Half-day (MORNING/AFTERNOON) = 0.5, FULL = working days inclusive.
 */
export function calculateLeaveDays(
  startDate: Date,
  endDate: Date,
  dayType: DayType,
  holidayDates: Date[] = [],
): number {
  if (dayType === "MORNING" || dayType === "AFTERNOON") {
    return 0.5;
  }

  const holidayTimestamps = new Set(
    holidayDates.map((d) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
    ),
  );

  let count = 0;
  const current = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );
  const end = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );

  while (current <= end) {
    if (!isWeekend(current) && !holidayTimestamps.has(current.getTime())) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Check if the start date meets the minimum 1-day notice requirement.
 * startDate must be >= tomorrow.
 */
export function hasMinimumNotice(startDate: Date, today?: Date): boolean {
  const now = today ?? new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startDateNormalized = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );

  return startDateNormalized >= tomorrow;
}

/**
 * Find public holiday dates that overlap with a leave request date range.
 */
export function findHolidayOverlaps(
  startDate: Date,
  endDate: Date,
  holidayDates: Date[],
): Date[] {
  const start = startDate.getTime();
  const end = endDate.getTime();

  return holidayDates.filter((d) => {
    const t = d.getTime();
    return t >= start && t <= end;
  });
}

/**
 * Calculate remaining leave balance.
 */
export function calculateRemainingBalance(balance: {
  annualAllowance: number;
  usedDays: number;
  carriedOver: number;
}): number {
  return balance.annualAllowance + balance.carriedOver - balance.usedDays;
}

/**
 * Check if remaining balance is sufficient for the requested days.
 */
export function hasSufficientBalance(
  remainingBalance: number,
  requestedDays: number,
): boolean {
  return remainingBalance >= requestedDays;
}
