"use client";

import { useState } from "react";
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
import { createHoliday } from "@/lib/api/client";

interface AddHolidayDialogProps {
  onCreated: () => void;
}

export function AddHolidayDialog({ onCreated }: AddHolidayDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!date || !name.trim()) return;
    setLoading(true);
    try {
      await createHoliday({ date, name: name.trim() });
      toast.success("Holiday added");
      setOpen(false);
      setDate("");
      setName("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add holiday");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Holiday</Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Public Holiday</DialogTitle>
          <DialogDescription>
            Add a custom public holiday or off-day.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="holiday-date">Date</Label>
            <Input
              id="holiday-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holiday-name">Name</Label>
            <Input
              id="holiday-name"
              placeholder="e.g. Company Off-Day"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
            />
          </div>
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
            onClick={handleSubmit}
            disabled={loading || !date || !name.trim()}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Add Holiday
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
