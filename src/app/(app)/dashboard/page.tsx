import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlaneTakeoff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BalanceCards } from "@/components/dashboard/balance-cards";
import { UpcomingLeave } from "@/components/dashboard/upcoming-leave";
import { PendingRequests } from "@/components/dashboard/pending-requests";
import { getBalances } from "@/lib/balances";
import { getLeaveHistory } from "@/lib/leave";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const currentYear = new Date().getFullYear();
  const today = new Date();

  const [balances, pendingResult, upcomingResult] = await Promise.all([
    getBalances(session.user.id),
    getLeaveHistory(session.user.id, {
      status: "PENDING",
      page: 1,
      limit: 5,
    }),
    getLeaveHistory(session.user.id, {
      status: "APPROVED",
      page: 1,
      limit: 5,
    }),
  ]);

  const currentBalance = balances.find((b) => b.year === currentYear) ?? null;

  // Filter upcoming to only show future approved leave
  const upcomingRequests = upcomingResult.requests.filter(
    (r) => new Date(r.endDate) >= today,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name?.split(" ")[0]}
          </p>
        </div>
        <Link href="/dashboard/request" className={buttonVariants()}>
          <PlaneTakeoff className="mr-2 size-4" />
          Request Leave
        </Link>
      </div>

      <BalanceCards balance={currentBalance} />

      <div className="grid gap-6 md:grid-cols-2">
        <UpcomingLeave requests={upcomingRequests} />
        <PendingRequests requests={pendingResult.requests} />
      </div>
    </div>
  );
}
