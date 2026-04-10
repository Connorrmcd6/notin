import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/client";
import {
  USERS_TAG,
  PENDING_REQUESTS_TAG,
  TEAM_STATS_TAG,
  CALENDAR_TAG,
} from "@/lib/cache";

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

  revalidateTag(USERS_TAG, "max");
  revalidateTag(PENDING_REQUESTS_TAG, "max");
  revalidateTag(TEAM_STATS_TAG, "max");
  revalidateTag(CALENDAR_TAG, "max");
}
