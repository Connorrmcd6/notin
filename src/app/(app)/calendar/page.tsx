import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TeamCalendar } from "@/components/calendar/team-calendar";
import { getCachedTeamLeaveForMonth, getCachedHolidaysForMonth } from "@/lib/holidays";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [leave, holidays] = await Promise.all([
    getCachedTeamLeaveForMonth(year, month),
    getCachedHolidaysForMonth(year, month),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Calendar</h1>
        <p className="text-muted-foreground">
          See who&apos;s out at a glance
        </p>
      </div>
      <TeamCalendar
        initialYear={year}
        initialMonth={month}
        initialLeave={leave}
        initialHolidays={holidays}
      />
    </div>
  );
}
