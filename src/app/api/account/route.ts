import { withErrorHandler } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { deleteUser } from "@/lib/users";

export const DELETE = withErrorHandler(async () => {
  const session = await requireSession();
  await deleteUser(session.user.id, session.user.id, session.user.role === "ADMIN");
  return Response.json({ success: true });
});
