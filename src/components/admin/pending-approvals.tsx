"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApproveDialog } from "@/components/admin/approve-dialog";
import { DeclineDialog } from "@/components/admin/decline-dialog";
import {
  approveLeaveRequest,
  declineLeaveRequest,
} from "@/lib/api/client";
import type { LeaveRequest } from "@/generated/prisma/client";

type PendingRequest = LeaveRequest & {
  user: { id: string; name: string | null; email: string };
};

interface PendingApprovalsProps {
  requests: PendingRequest[];
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

function formatDateRange(start: Date, end: Date): string {
  const s = new Date(start);
  const e = new Date(end);
  if (s.getTime() === e.getTime()) {
    return format(s, "d MMM yyyy");
  }
  return `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`;
}

function calculateDays(req: LeaveRequest): number {
  if (req.dayType === "MORNING" || req.dayType === "AFTERNOON") return 0.5;
  const msPerDay = 1000 * 60 * 60 * 24;
  return (
    Math.round(
      (new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) /
        msPerDay,
    ) + 1
  );
}

export function PendingApprovals({ requests }: PendingApprovalsProps) {
  const router = useRouter();
  const [approveTarget, setApproveTarget] = useState<PendingRequest | null>(
    null,
  );
  const [declineTarget, setDeclineTarget] = useState<PendingRequest | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    if (!approveTarget) return;
    setLoading(true);
    try {
      await approveLeaveRequest(approveTarget.id);
      toast.success("Leave request approved");
      setApproveTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline(reason: string) {
    if (!declineTarget) return;
    setLoading(true);
    try {
      await declineLeaveRequest(declineTarget.id, reason);
      toast.success("Leave request declined");
      setDeclineTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to decline");
    } finally {
      setLoading(false);
    }
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Approvals</CardTitle>
          <CardDescription>Leave requests awaiting your review</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No pending requests
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Approvals</CardTitle>
          <CardDescription>Leave requests awaiting your review</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.map((req) => {
            const name = req.user.name ?? req.user.email;
            const dateRange = formatDateRange(req.startDate, req.endDate);
            const days = calculateDays(req);

            return (
              <div
                key={req.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
                  {(req.user.name ?? req.user.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-sm text-muted-foreground">
                    {dateRange} &middot; {days}{" "}
                    {days === 1 ? "day" : "days"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {leaveTypeLabels[req.leaveType]}
                    </Badge>
                    {req.dayType !== "FULL" && (
                      <Badge variant="secondary">
                        {dayTypeLabels[req.dayType]}
                      </Badge>
                    )}
                  </div>
                  {req.note && (
                    <p className="text-sm text-muted-foreground italic">
                      &ldquo;{req.note}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setApproveTarget(req)}
                  >
                    <Check className="mr-1 size-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeclineTarget(req)}
                  >
                    <X className="mr-1 size-4" />
                    Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {approveTarget && (
        <ApproveDialog
          open={!!approveTarget}
          onOpenChange={(open) => !open && setApproveTarget(null)}
          employeeName={approveTarget.user.name ?? approveTarget.user.email}
          dateRange={formatDateRange(
            approveTarget.startDate,
            approveTarget.endDate,
          )}
          loading={loading}
          onConfirm={handleApprove}
        />
      )}

      {declineTarget && (
        <DeclineDialog
          open={!!declineTarget}
          onOpenChange={(open) => !open && setDeclineTarget(null)}
          employeeName={declineTarget.user.name ?? declineTarget.user.email}
          dateRange={formatDateRange(
            declineTarget.startDate,
            declineTarget.endDate,
          )}
          loading={loading}
          onConfirm={handleDecline}
        />
      )}
    </>
  );
}
