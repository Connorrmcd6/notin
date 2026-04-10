import { withErrorHandler } from "@/lib/api";
import { requireSession, requirePermission } from "@/lib/auth";
import { HolidayQuerySchema, CreateHolidaySchema } from "@/lib/validators";
import { getHolidaysByYear, createCustomHoliday } from "@/lib/holidays";

export const GET = withErrorHandler(async (request) => {
  await requireSession();
  const url = new URL(request.url);
  const { year } = HolidayQuerySchema.parse({
    year: url.searchParams.get("year"),
  });
  const data = await getHolidaysByYear(year);
  return Response.json({ data });
});

export const POST = withErrorHandler(async (request) => {
  await requirePermission("holidays:manage");
  const body = await request.json();
  const input = CreateHolidaySchema.parse(body);
  const data = await createCustomHoliday(input);
  return Response.json({ data }, { status: 201 });
});
