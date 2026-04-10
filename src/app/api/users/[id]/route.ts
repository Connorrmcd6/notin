import { withErrorHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { DeleteUserParamSchema } from "@/lib/validators";
import { deleteUser } from "@/lib/users";

export const DELETE = withErrorHandler(async (request) => {
  const session = await requirePermission("users:manage");
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const id = segments[segments.indexOf("users") + 1];
  DeleteUserParamSchema.parse({ id });
  await deleteUser(id, session.user.id, true);
  return Response.json({ success: true });
});
