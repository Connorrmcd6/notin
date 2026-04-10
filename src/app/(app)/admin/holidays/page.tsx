import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { HolidayTable } from "@/components/holidays/holiday-table";

export default async function HolidaysPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Public Holidays
        </h1>
        <p className="text-muted-foreground">
          Manage public holidays and custom off-days
        </p>
      </div>
      <HolidayTable />
    </div>
  );
}
