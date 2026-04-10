"use client";

import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/components/notifications/notification-item";
import type { Notification } from "@/generated/prisma/client";

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkRead: (ids: string[]) => void;
  onMarkAllRead: () => void;
}

export function NotificationDropdown({
  notifications,
  onMarkRead,
  onMarkAllRead,
}: NotificationDropdownProps) {
  if (notifications.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        No new notifications
      </div>
    );
  }

  return (
    <div className="flex max-h-80 flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-sm font-medium">Notifications</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-1 text-xs"
          onClick={onMarkAllRead}
        >
          Mark all as read
        </Button>
      </div>
      <div className="overflow-y-auto p-1">
        {notifications.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            onRead={(id) => onMarkRead([id])}
          />
        ))}
      </div>
    </div>
  );
}
