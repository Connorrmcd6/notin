import { Badge } from "@/components/ui/badge";
import type { LeaveStatus } from "@/generated/prisma/client";

const statusConfig: Record<
  LeaveStatus,
  { label: string; variant: "outline" | "default" | "destructive" | "secondary" }
> = {
  PENDING: { label: "Pending", variant: "outline" },
  APPROVED: { label: "Approved", variant: "default" },
  DECLINED: { label: "Declined", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
};

export function StatusBadge({ status }: { status: LeaveStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
