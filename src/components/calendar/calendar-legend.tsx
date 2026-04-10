"use client";

import { getChartColor } from "@/components/calendar/calendar-day-cell";

interface CalendarLegendProps {
  users: { id: string; name: string | null; email: string }[];
  userColorMap: Map<string, string>;
}

export function CalendarLegend({ users, userColorMap }: CalendarLegendProps) {
  if (users.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {users.map((user) => (
        <div key={user.id} className="flex items-center gap-1.5 text-sm">
          <span
            className="size-3 rounded-sm"
            style={{
              backgroundColor: userColorMap.get(user.id) ?? getChartColor(0),
            }}
          />
          <span>{user.name ?? user.email}</span>
        </div>
      ))}
    </div>
  );
}
