"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CalendarDayCell,
  getChartColor,
} from "@/components/calendar/calendar-day-cell";
import { CalendarLegend } from "@/components/calendar/calendar-legend";
import { fetchCalendarData } from "@/lib/api/client";
import type { PublicHoliday, LeaveRequest } from "@/generated/prisma/client";

type LeaveWithUser = LeaveRequest & {
  user: { id: string; name: string | null; email: string };
};

interface TeamCalendarProps {
  initialYear: number;
  initialMonth: number;
  initialLeave: LeaveWithUser[];
  initialHolidays: PublicHoliday[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function buildUserColorMap(leave: LeaveWithUser[]): Map<string, string> {
  const map = new Map<string, string>();
  const seen = new Set<string>();
  let index = 0;
  for (const l of leave) {
    if (!seen.has(l.user.id)) {
      seen.add(l.user.id);
      map.set(l.user.id, getChartColor(index));
      index++;
    }
  }
  return map;
}

function getUniqueUsers(leave: LeaveWithUser[]) {
  const seen = new Set<string>();
  const users: { id: string; name: string | null; email: string }[] = [];
  for (const l of leave) {
    if (!seen.has(l.user.id)) {
      seen.add(l.user.id);
      users.push(l.user);
    }
  }
  return users;
}

export function TeamCalendar({
  initialYear,
  initialMonth,
  initialLeave,
  initialHolidays,
}: TeamCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [leave, setLeave] = useState<LeaveWithUser[]>(initialLeave);
  const [holidays, setHolidays] = useState<PublicHoliday[]>(initialHolidays);
  const [loading, setLoading] = useState(false);

  const navigate = useCallback(
    async (newYear: number, newMonth: number) => {
      setLoading(true);
      try {
        const data = await fetchCalendarData(newYear, newMonth);
        setYear(newYear);
        setMonth(newMonth);
        setLeave(data.leave);
        setHolidays(data.holidays);
      } catch {
        // keep current state
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  function handlePrev() {
    const newMonth = month === 1 ? 12 : month - 1;
    const newYear = month === 1 ? year - 1 : year;
    navigate(newYear, newMonth);
  }

  function handleNext() {
    const newMonth = month === 12 ? 1 : month + 1;
    const newYear = month === 12 ? year + 1 : year;
    navigate(newYear, newMonth);
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  // getDay() returns 0=Sun, which is already the first column
  const startDow = firstDay.getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const todayDay =
    today.getFullYear() === year && today.getMonth() + 1 === month
      ? today.getDate()
      : null;

  const userColorMap = buildUserColorMap(leave);
  const uniqueUsers = getUniqueUsers(leave);

  return (
    <div className={loading ? "opacity-60 transition-opacity" : ""}>
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={handlePrev}>
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {getMonthLabel(year, month)}
        </h2>
        <Button variant="outline" size="icon" onClick={handleNext}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-b bg-muted/50 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {cells.map((day, i) => {
          const dayHolidays = day
            ? holidays.filter((h) => new Date(h.date).getDate() === day)
            : [];
          const dayLeaves = day
            ? leave.filter((l) => {
                const start = new Date(l.startDate);
                const end = new Date(l.endDate);
                const cellDate = new Date(year, month - 1, day);
                return cellDate >= start && cellDate <= end;
              })
            : [];

          return (
            <CalendarDayCell
              key={i}
              day={day}
              isToday={day === todayDay}
              holidays={dayHolidays}
              leaves={dayLeaves}
              userColorMap={userColorMap}
            />
          );
        })}
      </div>

      <CalendarLegend users={uniqueUsers} userColorMap={userColorMap} />
    </div>
  );
}
