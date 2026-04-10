import { prisma } from "@/lib/db/client";
import type { PublicHoliday, LeaveRequest } from "@/generated/prisma/client";
import type { CreateHolidayInput } from "@/lib/validators";
import { getEasterDate } from "./easter";

// --- SA public holiday generation ---

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function generateSAPublicHolidays(year: number): { date: Date; name: string }[] {
  const easter = getEasterDate(year);

  const fixed = [
    { date: utcDate(year, 0, 1), name: "New Year's Day" },
    { date: utcDate(year, 2, 21), name: "Human Rights Day" },
    { date: addDays(easter, -2), name: "Good Friday" },
    { date: addDays(easter, 1), name: "Family Day" },
    { date: utcDate(year, 3, 27), name: "Freedom Day" },
    { date: utcDate(year, 4, 1), name: "Workers' Day" },
    { date: utcDate(year, 5, 16), name: "Youth Day" },
    { date: utcDate(year, 7, 9), name: "National Women's Day" },
    { date: utcDate(year, 8, 24), name: "Heritage Day" },
    { date: utcDate(year, 11, 16), name: "Day of Reconciliation" },
    { date: utcDate(year, 11, 25), name: "Christmas Day" },
    { date: utcDate(year, 11, 26), name: "Day of Goodwill" },
  ];

  const substitutions: { date: Date; name: string }[] = [];
  for (const holiday of fixed) {
    if (holiday.date.getUTCDay() === 0) {
      substitutions.push({
        date: addDays(holiday.date, 1),
        name: `${holiday.name} (observed)`,
      });
    }
  }

  return [...fixed, ...substitutions];
}

async function ensureHolidaysExist(year: number): Promise<void> {
  const count = await prisma.publicHoliday.count({ where: { year } });
  if (count > 0) return;

  const holidays = generateSAPublicHolidays(year);
  await prisma.publicHoliday.createMany({
    data: holidays.map((h) => ({
      date: h.date,
      name: h.name,
      year,
      isCustom: false,
    })),
    skipDuplicates: true,
  });
}

// --- Service functions ---

export async function getHolidaysByYear(year: number): Promise<PublicHoliday[]> {
  await ensureHolidaysExist(year);
  return prisma.publicHoliday.findMany({
    where: { year },
    orderBy: { date: "asc" },
  });
}

export async function createCustomHoliday(
  input: CreateHolidayInput,
): Promise<PublicHoliday> {
  const year = input.date.getFullYear();

  const existing = await prisma.publicHoliday.findUnique({
    where: { date: input.date },
  });

  if (existing) {
    throw new Error("BUSINESS:A holiday already exists on this date");
  }

  const holiday = await prisma.publicHoliday.create({
    data: {
      date: input.date,
      name: input.name,
      year,
      isCustom: true,
    },
  });

  return holiday;
}

export async function deleteHoliday(id: string): Promise<void> {
  const holiday = await prisma.publicHoliday.findUnique({ where: { id } });
  if (!holiday) {
    throw new Error("Not found");
  }
  await prisma.publicHoliday.delete({ where: { id } });
}

export async function getTeamLeaveForMonth(
  year: number,
  month: number,
): Promise<(LeaveRequest & { user: { id: string; name: string | null; email: string } })[]> {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);

  return prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      startDate: { lte: endOfMonth },
      endDate: { gte: startOfMonth },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { startDate: "asc" },
  });
}

export async function getHolidaysForMonth(
  year: number,
  month: number,
): Promise<PublicHoliday[]> {
  await ensureHolidaysExist(year);
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);

  return prisma.publicHoliday.findMany({
    where: {
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    orderBy: { date: "asc" },
  });
}
