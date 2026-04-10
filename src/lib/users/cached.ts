import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/client";
import { USERS_TAG } from "@/lib/cache";

export const getCachedUsers = (currentYear: number) =>
  unstable_cache(
    () =>
      prisma.user.findMany({
        orderBy: { name: "asc" },
        include: {
          leaveBalances: {
            where: { year: currentYear },
          },
        },
      }),
    ["users", String(currentYear)],
    { tags: [USERS_TAG] },
  )();
