import { prisma } from "@/lib/db/client";

/**
 * Transaction client type — the client passed to $transaction callbacks.
 * Supports both the transaction client and the regular prisma client.
 */
type DbClient = {
  user: typeof prisma.user;
  notification: typeof prisma.notification;
};

/**
 * Create notifications for all admin users.
 */
export async function notifyAdmins(
  message: string,
  link?: string,
  db: DbClient = prisma,
): Promise<void> {
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await Promise.all(
    admins.map((admin) =>
      db.notification.create({
        data: {
          userId: admin.id,
          message,
          link,
        },
      }),
    ),
  );
}

/**
 * Create a notification for a specific employee.
 */
export async function notifyEmployee(
  userId: string,
  message: string,
  link?: string,
  db: DbClient = prisma,
): Promise<void> {
  await db.notification.create({
    data: {
      userId,
      message,
      link,
    },
  });
}
