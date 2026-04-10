"use client";

import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { useNotifications } from "@/hooks/use-notifications";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  return (
    <Popover>
      <PopoverTrigger
        className="relative inline-flex size-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <NotificationDropdown
          notifications={notifications}
          onMarkRead={markAsRead}
          onMarkAllRead={markAllAsRead}
        />
      </PopoverContent>
    </Popover>
  );
}
