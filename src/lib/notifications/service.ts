import { prisma } from "@/lib/db/client";
import type { Notification } from "@/generated/prisma/client";

export async function getUnreadNotifications(
  userId: string,
): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function markAsRead(
  userId: string,
  ids: string[],
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
