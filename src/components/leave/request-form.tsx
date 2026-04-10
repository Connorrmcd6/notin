"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";

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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { submitLeaveRequest, fetchLeaveHistory } from "@/lib/api/client";
import type { LeaveRequest } from "@/generated/prisma/client";

interface FormData {
  leaveType: "PAID_ANNUAL" | "UNPAID";
  dayType: "FULL" | "MORNING" | "AFTERNOON";
  note: string;
}

export function RequestForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [fetchedYear, setFetchedYear] = useState<number | null>(null);
  const [existingRequests, setExistingRequests] = useState<LeaveRequest[]>([]);
  const [overlapWarning, setOverlapWarning] = useState(false);

  const form = useForm<FormData>({
    defaultValues: {
      leaveType: "PAID_ANNUAL",
      dayType: "FULL",
      note: "",
    },
  });

  const dayType = form.watch("dayType");
  const startDate = dateRange?.from;
  const endDate = dateRange?.to ?? dateRange?.from;

  // Half-day only allowed for single-day requests
  const isSingleDay =
    startDate &&
    endDate &&
    startDate.getTime() === endDate.getTime();

  // Reset dayType to FULL when switching to multi-day
  useEffect(() => {
    if (!isSingleDay && dayType !== "FULL") {
      form.setValue("dayType", "FULL");
    }
  }, [isSingleDay, dayType, form]);

  // Fetch holidays for the selected year
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

  // Fetch existing leave requests on mount for overlap detection
  useEffect(() => {
    async function loadExisting() {
      try {
        const params = new URLSearchParams({ page: "1", limit: "100" });
        const result = await fetchLeaveHistory(params);
        setExistingRequests(
          result.data.filter(
            (r) => r.status === "PENDING" || r.status === "APPROVED",
          ),
        );
      } catch {
        // Non-critical — overlap warning just won't show
      }
    }
    loadExisting();
  }, []);

  // Check for overlap with existing requests
  useEffect(() => {
    if (!startDate || !endDate) {
      setOverlapWarning(false);
      return;
    }

    const start = startDate.getTime();
    const end = endDate.getTime();

    const hasOverlap = existingRequests.some((r) => {
      const rStart = new Date(r.startDate).getTime();
      const rEnd = new Date(r.endDate).getTime();
      return rStart <= end && rEnd >= start;
    });

    setOverlapWarning(hasOverlap);
  }, [startDate, endDate, existingRequests]);

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
    const last = new Date(
      endDate.getFullYear(), endDate.getMonth(), endDate.getDate(),
    );

    while (current <= last) {
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
    if (!startDate || !endDate) {
      toast.error("Please select a date range");
      return;
    }

    if (
      (data.dayType === "MORNING" || data.dayType === "AFTERNOON") &&
      startDate.getTime() !== endDate.getTime()
    ) {
      toast.error("Half-day requests must be for a single day");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitLeaveRequest({
        leaveType: data.leaveType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
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
          {/* Date Range — From / To */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <Label>From</Label>
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
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Start date"}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      disabled={(date) => date < tomorrow}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <span className="mt-6 text-muted-foreground">–</span>
              <div className="flex-1 space-y-1">
                <Label>To</Label>
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
                    {endDate ? format(endDate, "dd/MM/yyyy") : "End date"}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      disabled={(date) => date < tomorrow}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Overlap Warning */}
          {overlapWarning && (
            <Alert className="border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <TriangleAlert className="text-amber-600 dark:text-amber-400" />
              <AlertTitle>
                You&apos;ve already requested time off for this period.
              </AlertTitle>
              <AlertDescription className="text-amber-800 dark:text-amber-300">
                You can continue with this request, but we just wanted to let
                you know.
              </AlertDescription>
            </Alert>
          )}

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
              working {previewDays === 1 ? "day" : "days"} will be deducted
              {startDate && endDate && !isSingleDay && (
                <span className="text-muted-foreground">
                  {" "}(weekends & public holidays excluded)
                </span>
              )}
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
