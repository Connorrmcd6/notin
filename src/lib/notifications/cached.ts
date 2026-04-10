import { unstable_cache } from "next/cache";
import { getUnreadNotifications, getUnreadCount } from "./service";
import { userNotificationsTag } from "@/lib/cache";

export const getCachedUnreadNotifications = (userId: string) =>
  unstable_cache(
    () => getUnreadNotifications(userId),
    ["notifications", userId],
    { tags: [userNotificationsTag(userId)] },
  )();

export const getCachedUnreadCount = (userId: string) =>
  unstable_cache(
    () => getUnreadCount(userId),
    ["notification-count", userId],
    { tags: [userNotificationsTag(userId)] },
  )();
