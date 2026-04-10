import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { UserTable } from "@/components/admin/user-table";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const currentYear = new Date().getFullYear();

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      leaveBalances: {
        where: { year: currentYear },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
        <p className="text-muted-foreground">
          View team members, update roles, and adjust leave balances
        </p>
      </div>
      <UserTable users={users} currentUserId={session.user.id} />
    </div>
  );
}
