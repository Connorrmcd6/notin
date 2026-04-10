import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock, PlaneTakeoff, Shield } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarDays className="size-5" />
            </div>
            <span className="text-lg font-semibold">NotIn</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{session.user.name}</p>
              <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
                {isAdmin ? "Admin" : "Employee"}
              </Badge>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Your leave management dashboard is on the way.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PlaneTakeoff className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Request Leave</CardTitle>
                <CardDescription>Submit time off requests</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming in Phase 4</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Leave History</CardTitle>
                <CardDescription>View past requests</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming in Phase 4</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Team Calendar</CardTitle>
                <CardDescription>See who&apos;s out</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming in Phase 5</p>
            </CardContent>
          </Card>
        </div>

        {isAdmin && (
          <>
            <Separator className="my-8" />
            <div className="mb-4 flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              <h2 className="text-xl font-semibold">Admin</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pending Approvals</CardTitle>
                  <CardDescription>Review leave requests from your team</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Coming in Phase 4</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Manage Users</CardTitle>
                  <CardDescription>Set roles and leave allowances</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Coming in Phase 4</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
