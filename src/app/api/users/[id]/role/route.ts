import { withErrorHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { UpdateRoleSchema } from "@/lib/validators";
import { prisma } from "@/lib/db/client";

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

  return Response.json({ data: user });
});
