import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import type { LeaveRequest } from "@/generated/prisma/client";

interface UpcomingLeaveProps {
  requests: LeaveRequest[];
}

const leaveTypeLabels: Record<string, string> = {
  PAID_ANNUAL: "Paid Annual",
  UNPAID: "Unpaid",
};

const dayTypeLabels: Record<string, string> = {
  FULL: "Full day",
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
};

export function UpcomingLeave({ requests }: UpcomingLeaveProps) {
  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Leave</CardTitle>
          <CardDescription>Your approved upcoming leave</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No upcoming leave</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming Leave</CardTitle>
        <CardDescription>Your approved upcoming leave</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <CalendarDays className="size-4 text-muted-foreground" />
            <div className="flex-1 text-sm">
              <p className="font-medium">
                {format(new Date(req.startDate), "d MMM")}
                {req.startDate !== req.endDate &&
                  ` – ${format(new Date(req.endDate), "d MMM yyyy")}`}
                {req.startDate === req.endDate &&
                  ` ${new Date(req.startDate).getFullYear()}`}
              </p>
              <p className="text-muted-foreground">
                {leaveTypeLabels[req.leaveType]} &middot;{" "}
                {dayTypeLabels[req.dayType]}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
