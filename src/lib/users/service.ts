import { prisma } from "@/lib/db/client";

/**
 * Get all users with their leave balances for a given year.
 */
export async function getUsers(currentYear: number) {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      leaveBalances: {
        where: { year: currentYear },
      },
    },
  });
}

export async function deleteUser(
  targetId: string,
  requestingUserId: string,
  isAdmin: boolean,
): Promise<void> {
  const isSelfDelete = targetId === requestingUserId;

  if (!isSelfDelete && !isAdmin) {
    throw new Error("Forbidden");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
    select: { role: true },
  });

  if (!targetUser) {
    throw new Error("Not found");
  }

  if (targetUser.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new Error("BUSINESS:Cannot delete the last admin");
    }
  }

  await prisma.user.delete({ where: { id: targetId } });
}
