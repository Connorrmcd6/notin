import { withErrorHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

export const GET = withErrorHandler(async () => {
  await requirePermission("users:read");

  const currentYear = new Date().getFullYear();

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      leaveBalances: {
        where: { year: currentYear },
      },
    },
  });

  return Response.json({ data: users });
});
