import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TeamStats } from "@/components/admin/team-stats";
import { PendingApprovals } from "@/components/admin/pending-approvals";
import { getCachedPendingRequests, getCachedTeamStats } from "@/lib/leave";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const [stats, pendingRequests] = await Promise.all([
    getCachedTeamStats(),
    getCachedPendingRequests(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage leave requests and team overview
        </p>
      </div>

      <TeamStats
        totalEmployees={stats.totalEmployees}
        pendingCount={stats.pendingCount}
        onLeaveToday={stats.onLeaveToday}
      />

      <PendingApprovals
        requests={
          pendingRequests as (typeof pendingRequests[number] & {
            user: { id: string; name: string | null; email: string };
          })[]
        }
      />
    </div>
  );
}
