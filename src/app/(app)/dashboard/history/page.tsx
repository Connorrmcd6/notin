import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { HistoryTable } from "@/components/leave/history-table";
import { getLeaveHistory } from "@/lib/leave";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const result = await getLeaveHistory(session.user.id, {
    page: 1,
    limit: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave History</h1>
        <p className="text-muted-foreground">
          View and manage your leave requests
        </p>
      </div>
      <HistoryTable
        initialData={result.requests}
        initialTotal={result.total}
      />
    </div>
  );
}
