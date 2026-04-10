import { unstable_cache } from "next/cache";
import {
  getTeamLeaveForMonth,
  getHolidaysForMonth,
  getHolidaysByYear,
} from "./service";
import { CALENDAR_TAG, HOLIDAYS_TAG } from "@/lib/cache";

export const getCachedTeamLeaveForMonth = (year: number, month: number) =>
  unstable_cache(
    () => getTeamLeaveForMonth(year, month),
    ["team-leave", String(year), String(month)],
    { tags: [CALENDAR_TAG] },
  )();

export const getCachedHolidaysForMonth = (year: number, month: number) =>
  unstable_cache(
    () => getHolidaysForMonth(year, month),
    ["holidays-month", String(year), String(month)],
    { tags: [HOLIDAYS_TAG] },
  )();

export const getCachedHolidaysByYear = (year: number) =>
  unstable_cache(
    () => getHolidaysByYear(year),
    ["holidays-year", String(year)],
    { tags: [HOLIDAYS_TAG] },
  )();
