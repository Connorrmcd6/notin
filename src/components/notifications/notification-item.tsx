"use client";

import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Notification } from "@/generated/prisma/client";

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
}

export function NotificationItem({
  notification,
  onRead,
}: NotificationItemProps) {
  function handleClick() {
    onRead(notification.id);
    if (notification.link) {
      window.location.href = notification.link;
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
        !notification.read && "bg-muted/50",
      )}
    >
      {!notification.read && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
      )}
      <div className={cn("flex-1", notification.read && "ml-5")}>
        <p className="leading-snug">{notification.message}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
    </button>
  );
}
