"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { deleteAccount } from "@/lib/api/client";

interface DeleteAccountCardProps {
  userEmail: string;
}

export function DeleteAccountCard({ userEmail }: DeleteAccountCardProps) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (confirmation !== userEmail) return;
    setLoading(true);
    try {
      await deleteAccount();
      window.location.href = "/sign-in";
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete account",
      );
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This
            action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            Delete My Account
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setConfirmation("");
          }
          setOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, leave requests,
              balances, and notifications. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-email">
              Type <strong>{userEmail}</strong> to confirm
            </Label>
            <Input
              id="confirm-email"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={userEmail}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || confirmation !== userEmail}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
