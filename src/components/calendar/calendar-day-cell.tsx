"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PublicHoliday, LeaveRequest } from "@/generated/prisma/client";

type LeaveWithUser = LeaveRequest & {
  user: { id: string; name: string | null; email: string };
};

interface CalendarDayCellProps {
  day: number | null;
  isToday: boolean;
  holidays: PublicHoliday[];
  leaves: LeaveWithUser[];
  userColorMap: Map<string, string>;
}

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function getChartColor(index: number): string {
  return chartColors[index % chartColors.length];
}

export function CalendarDayCell({
  day,
  isToday,
  holidays,
  leaves,
  userColorMap,
}: CalendarDayCellProps) {
  if (day === null) {
    return <div className="min-h-24 border bg-muted/20" />;
  }

  const isHoliday = holidays.length > 0;

  return (
    <div
      className={cn(
        "min-h-24 border p-1",
        isHoliday && "bg-destructive/10",
        isToday && "ring-2 ring-primary ring-inset",
      )}
    >
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
          isToday && "bg-primary text-primary-foreground",
        )}
      >
        {day}
      </span>
      {holidays.map((h) => (
        <div
          key={h.id}
          className="mt-0.5 truncate rounded px-1 text-[10px] font-medium text-destructive"
        >
          {h.name}
        </div>
      ))}
      <div className="mt-0.5 space-y-0.5">
        {leaves.map((leave) => {
          const color = userColorMap.get(leave.user.id) ?? chartColors[0];
          const displayName = leave.user.name ?? leave.user.email;
          const dayTypeLabel =
            leave.dayType === "MORNING"
              ? " (AM)"
              : leave.dayType === "AFTERNOON"
                ? " (PM)"
                : "";

          return (
            <TooltipProvider key={leave.id} delay={200}>
              <Tooltip>
                <TooltipTrigger
                  className="block w-full truncate rounded px-1 text-left text-[10px] text-white"
                  style={{ backgroundColor: color }}
                >
                  {displayName}
                  {dayTypeLabel}
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {leave.leaveType === "PAID_ANNUAL" ? "Paid" : "Unpaid"} leave
                    {dayTypeLabel}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
