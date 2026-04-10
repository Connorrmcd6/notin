import type { DayType } from "@/generated/prisma/client";

/**
 * Calculate the number of leave days for a request.
 * Half-day (MORNING/AFTERNOON) = 0.5, FULL = calendar days inclusive.
 */
export function calculateLeaveDays(
  startDate: Date,
  endDate: Date,
  dayType: DayType,
): number {
  if (dayType === "MORNING" || dayType === "AFTERNOON") {
    return 0.5;
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays =
    Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
  return diffDays;
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
