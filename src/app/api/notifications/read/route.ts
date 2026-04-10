import { withErrorHandler } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { MarkReadSchema } from "@/lib/validators";
import { markAsRead, markAllAsRead } from "@/lib/notifications";

export const POST = withErrorHandler(async (request) => {
  const session = await requireSession();
  const body = await request.json();
  const input = MarkReadSchema.parse(body);

  if (input.all) {
    await markAllAsRead(session.user.id);
  } else if (input.ids) {
    await markAsRead(session.user.id, input.ids);
  }

  return Response.json({ success: true });
});
