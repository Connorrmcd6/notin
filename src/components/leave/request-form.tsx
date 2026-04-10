"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitLeaveRequest } from "@/lib/api/client";

interface FormData {
  leaveType: "PAID_ANNUAL" | "UNPAID";
  startDate: Date | undefined;
  endDate: Date | undefined;
  dayType: "FULL" | "MORNING" | "AFTERNOON";
  note: string;
}

export function RequestForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    defaultValues: {
      leaveType: "PAID_ANNUAL",
      startDate: undefined,
      endDate: undefined,
      dayType: "FULL",
      note: "",
    },
  });

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const dayType = form.watch("dayType");

  // Half-day only allowed for single-day requests
  const isSingleDay =
    startDate &&
    endDate &&
    startDate.getTime() === endDate.getTime();

  // Fetch holidays for the selected year and calculate working days
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [fetchedYear, setFetchedYear] = useState<number | null>(null);

  const year = startDate?.getFullYear() ?? null;

  const fetchHolidays = useCallback(async (y: number) => {
    try {
      const res = await fetch(`/api/holidays?year=${y}`);
      if (res.ok) {
        const json = await res.json();
        setHolidays(json.data.map((h: { date: string }) => new Date(h.date)));
        setFetchedYear(y);
      }
    } catch {
      // Silently fail — preview will just exclude weekends
    }
  }, []);

  useEffect(() => {
    if (year && year !== fetchedYear) {
      fetchHolidays(year);
    }
  }, [year, fetchedYear, fetchHolidays]);

  // Calculate preview days excluding weekends and public holidays
  function calculateDays(): number | null {
    if (!startDate || !endDate) return null;
    if (dayType === "MORNING" || dayType === "AFTERNOON") return 0.5;

    const holidayTimestamps = new Set(
      holidays.map((d) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
      ),
    );

    let count = 0;
    const current = new Date(
      startDate.getFullYear(), startDate.getMonth(), startDate.getDate(),
    );
    const end = new Date(
      endDate.getFullYear(), endDate.getMonth(), endDate.getDate(),
    );

    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6 && !holidayTimestamps.has(current.getTime())) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  const previewDays = calculateDays();

  // Minimum date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  async function onSubmit(data: FormData) {
    if (!data.startDate || !data.endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    if (data.endDate < data.startDate) {
      toast.error("End date must be on or after start date");
      return;
    }

    if (
      (data.dayType === "MORNING" || data.dayType === "AFTERNOON") &&
      data.startDate.getTime() !== data.endDate.getTime()
    ) {
      toast.error("Half-day requests must be for a single day");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitLeaveRequest({
        leaveType: data.leaveType,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        dayType: data.dayType,
        note: data.note || undefined,
      });

      if (result.warnings.length > 0) {
        toast.warning(`Leave request submitted. ${result.warnings[0]}`);
      } else {
        toast.success("Leave request submitted");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Request Leave</CardTitle>
        <CardDescription>Submit a new leave request</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Leave Type */}
          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select
              value={form.watch("leaveType")}
              onValueChange={(v) =>
                v && form.setValue("leaveType", v as "PAID_ANNUAL" | "UNPAID")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PAID_ANNUAL">Paid Annual</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                    )}
                  />
                }
              >
                <CalendarIcon className="mr-2 size-4" />
                {startDate ? format(startDate, "PPP") : "Pick a date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    form.setValue("startDate", date);
                    // Auto-set end date if not set or before start
                    if (date && (!endDate || endDate < date)) {
                      form.setValue("endDate", date);
                    }
                  }}
                  disabled={(date) => date < tomorrow}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground",
                    )}
                  />
                }
              >
                <CalendarIcon className="mr-2 size-4" />
                {endDate ? format(endDate, "PPP") : "Pick a date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => form.setValue("endDate", date)}
                  disabled={(date) =>
                    date < tomorrow || (startDate ? date < startDate : false)
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Day Type */}
          <div className="space-y-2">
            <Label>Day Type</Label>
            <Select
              value={dayType}
              onValueChange={(v) =>
                v && form.setValue(
                  "dayType",
                  v as "FULL" | "MORNING" | "AFTERNOON",
                )
              }
              disabled={!isSingleDay}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL">Full Day</SelectItem>
                <SelectItem value="MORNING">Morning (08:00 – 12:00)</SelectItem>
                <SelectItem value="AFTERNOON">
                  Afternoon (12:00 – 17:00)
                </SelectItem>
              </SelectContent>
            </Select>
            {!isSingleDay && startDate && endDate && (
              <p className="text-xs text-muted-foreground">
                Half-day is only available for single-day requests
              </p>
            )}
          </div>

          {/* Days Preview */}
          {previewDays !== null && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <span className="font-medium">{previewDays}</span>{" "}
              {previewDays === 1 ? "day" : "days"} will be deducted
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              placeholder="Reason for leave (optional)"
              maxLength={500}
              {...form.register("note")}
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Submit Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
