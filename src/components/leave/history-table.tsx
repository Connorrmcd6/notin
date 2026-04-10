"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/leave/status-badge";
import { cancelLeaveRequest, fetchLeaveHistory } from "@/lib/api/client";
import type { LeaveRequest, LeaveStatus } from "@/generated/prisma/client";

interface HistoryTableProps {
  initialData: LeaveRequest[];
  initialTotal: number;
}

const leaveTypeLabels: Record<string, string> = {
  PAID_ANNUAL: "Paid Annual",
  UNPAID: "Unpaid",
};

const dayTypeLabels: Record<string, string> = {
  FULL: "Full",
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
};

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

export function HistoryTable({ initialData, initialTotal }: HistoryTableProps) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const limit = 20;
  const totalPages = Math.ceil(total / limit);
  const currentYear = new Date().getFullYear();

  const fetchData = useCallback(
    async (
      newStatus: string,
      newType: string,
      newPage: number,
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (newStatus !== "ALL") params.set("status", newStatus);
        if (newType !== "ALL") params.set("leaveType", newType);
        params.set("year", currentYear.toString());
        params.set("page", newPage.toString());
        params.set("limit", limit.toString());

        const result = await fetchLeaveHistory(params);
        setRequests(result.data);
        setTotal(result.total);
      } catch {
        toast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    },
    [currentYear],
  );

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
    fetchData(value, typeFilter, 1);
  }

  function handleTypeChange(value: string) {
    setTypeFilter(value);
    setPage(1);
    fetchData(statusFilter, value, 1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchData(statusFilter, typeFilter, newPage);
  }

  async function handleCancel(requestId: string) {
    setCancellingId(requestId);
    try {
      await cancelLeaveRequest(requestId);
      toast.success("Leave request cancelled");
      fetchData(statusFilter, typeFilter, page);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => v && handleStatusChange(v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="DECLINED">Declined</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => v && handleTypeChange(v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="PAID_ANNUAL">Paid Annual</SelectItem>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dates</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Day Type</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No leave requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(req.startDate), "d MMM")}
                      {new Date(req.startDate).getTime() !==
                        new Date(req.endDate).getTime() &&
                        ` – ${format(new Date(req.endDate), "d MMM")}`}{" "}
                      {new Date(req.startDate).getFullYear()}
                    </TableCell>
                    <TableCell>
                      {leaveTypeLabels[req.leaveType]}
                    </TableCell>
                    <TableCell>{dayTypeLabels[req.dayType]}</TableCell>
                    <TableCell>{calculateDays(req)}</TableCell>
                    <TableCell>
                      <StatusBadge status={req.status as LeaveStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      {(req.status === "PENDING" ||
                        req.status === "APPROVED") && (
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
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
