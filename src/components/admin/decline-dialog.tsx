"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface DeclineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  dateRange: string;
  loading: boolean;
  onConfirm: (reason: string) => void;
}

export function DeclineDialog({
  open,
  onOpenChange,
  employeeName,
  dateRange,
  loading,
  onConfirm,
}: DeclineDialogProps) {
  const [reason, setReason] = useState("");

  function handleConfirm() {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setReason("");
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline Leave Request</DialogTitle>
          <DialogDescription>
            Decline {employeeName}&apos;s leave request for {dateRange}?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="decline-reason">Reason</Label>
          <Textarea
            id="decline-reason"
            placeholder="Provide a reason for declining..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Decline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
