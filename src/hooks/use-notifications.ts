"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchNotifications,
  markNotificationsRead,
} from "@/lib/api/client";
import type { Notification } from "@/generated/prisma/client";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchNotifications();
      setNotifications(result.data);
      setUnreadCount(result.unreadCount);
    } catch {
      // Silently fail — notifications are non-critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  const markAsRead = useCallback(
    async (ids: string[]) => {
      await markNotificationsRead({ ids });
      setNotifications((prev) =>
        prev.filter((n) => !ids.includes(n.id)),
      );
      setUnreadCount((prev) => Math.max(0, prev - ids.length));
    },
    [],
  );

  const markAllAsRead = useCallback(async () => {
    await markNotificationsRead({ all: true });
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead };
}
