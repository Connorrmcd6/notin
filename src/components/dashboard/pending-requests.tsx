"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cancelLeaveRequest } from "@/lib/api/client";
import { StatusBadge } from "@/components/leave/status-badge";
import type { LeaveRequest } from "@/generated/prisma/client";

interface PendingRequestsProps {
  requests: LeaveRequest[];
}

const leaveTypeLabels: Record<string, string> = {
  PAID_ANNUAL: "Paid Annual",
  UNPAID: "Unpaid",
};

export function PendingRequests({ requests }: PendingRequestsProps) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function handleCancel(requestId: string) {
    setCancellingId(requestId);
    try {
      await cancelLeaveRequest(requestId);
      toast.success("Leave request cancelled");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setCancellingId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Requests</CardTitle>
          <CardDescription>Your requests awaiting approval</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No pending requests</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pending Requests</CardTitle>
        <CardDescription>Your requests awaiting approval</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <Clock className="size-4 text-muted-foreground" />
            <div className="flex-1 text-sm">
              <p className="font-medium">
                {format(new Date(req.startDate), "d MMM")}
                {req.startDate !== req.endDate &&
                  ` – ${format(new Date(req.endDate), "d MMM yyyy")}`}
                {req.startDate === req.endDate &&
                  ` ${new Date(req.startDate).getFullYear()}`}
              </p>
              <p className="text-muted-foreground">
                {leaveTypeLabels[req.leaveType]}
              </p>
            </div>
            <StatusBadge status={req.status} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCancel(req.id)}
              disabled={cancellingId === req.id}
            >
              {cancellingId === req.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Cancel"
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
