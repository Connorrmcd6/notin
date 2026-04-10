import { revalidateTag } from "next/cache";
import { withErrorHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { UpdateRoleSchema } from "@/lib/validators";
import { prisma } from "@/lib/db/client";
import { USERS_TAG } from "@/lib/cache";

export const PATCH = withErrorHandler(async (request) => {
  await requirePermission("users:manage");

  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const userId = segments[segments.indexOf("users") + 1];

  const body = await request.json();
  const { role } = UpdateRoleSchema.parse(body);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidateTag(USERS_TAG, "max");

  return Response.json({ data: user });
});
