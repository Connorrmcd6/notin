import { withErrorHandler } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { CalendarQuerySchema } from "@/lib/validators";
import { getTeamLeaveForMonth, getHolidaysForMonth } from "@/lib/holidays";

export const GET = withErrorHandler(async (request) => {
  await requireSession();
  const url = new URL(request.url);
  const { year, month } = CalendarQuerySchema.parse({
    year: url.searchParams.get("year"),
    month: url.searchParams.get("month"),
  });
  const [leave, holidays] = await Promise.all([
    getTeamLeaveForMonth(year, month),
    getHolidaysForMonth(year, month),
  ]);
  return Response.json({ leave, holidays });
});
