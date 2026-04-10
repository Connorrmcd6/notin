"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { updateUserRole, adjustBalance } from "@/lib/api/client";
import type { LeaveBalance, User } from "@/generated/prisma/client";

type UserWithBalance = User & { leaveBalances: LeaveBalance[] };

interface UserTableProps {
  users: UserWithBalance[];
}

export function UserTable({ users }: UserTableProps) {
  const router = useRouter();
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<UserWithBalance | null>(null);
  const [adjustDays, setAdjustDays] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);

  const currentYear = new Date().getFullYear();

  async function handleRoleChange(userId: string, role: string, userName: string) {
    setUpdatingRoleId(userId);
    try {
      await updateUserRole(userId, role);
      toast.success(`${userName}'s role updated to ${role}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdatingRoleId(null);
    }
  }

  async function handleAdjust() {
    if (!adjustTarget || !adjustDays || !adjustReason.trim()) return;
    setAdjustLoading(true);
    try {
      await adjustBalance({
        userId: adjustTarget.id,
        year: currentYear,
        days: parseFloat(adjustDays),
        reason: adjustReason.trim(),
      });
      toast.success(
        `Balance adjusted for ${adjustTarget.name ?? adjustTarget.email}`,
      );
      setAdjustTarget(null);
      setAdjustDays("");
      setAdjustReason("");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to adjust balance",
      );
    } finally {
      setAdjustLoading(false);
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Allowance</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const balance = user.leaveBalances[0] ?? null;
                const total = balance
                  ? balance.annualAllowance + balance.carriedOver
                  : 0;
                const remaining = balance ? total - balance.usedDays : 0;

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(v) =>
                          v && handleRoleChange(
                            user.id,
                            v,
                            user.name ?? user.email,
                          )
                        }
                        disabled={updatingRoleId === user.id}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="EMPLOYEE">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      {balance ? total : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {balance ? balance.usedDays : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {balance ? remaining : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdjustTarget(user)}
                      >
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Adjust Balance Dialog */}
      <Dialog
        open={!!adjustTarget}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustTarget(null);
            setAdjustDays("");
            setAdjustReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Balance</DialogTitle>
            <DialogDescription>
              Adjust leave balance for{" "}
              {adjustTarget?.name ?? adjustTarget?.email} ({currentYear})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adjust-days">
                Days (positive = add, negative = subtract)
              </Label>
              <Input
                id="adjust-days"
                type="number"
                step="0.5"
                placeholder="e.g. 2 or -1"
                value={adjustDays}
                onChange={(e) => setAdjustDays(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-reason">Reason</Label>
              <Textarea
                id="adjust-reason"
                placeholder="Reason for adjustment..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdjustTarget(null)}
              disabled={adjustLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={adjustLoading || !adjustDays || !adjustReason.trim()}
            >
              {adjustLoading && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Adjust Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
