import { withErrorHandler } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getUnreadNotifications, getUnreadCount } from "@/lib/notifications";

export const GET = withErrorHandler(async () => {
  const session = await requireSession();
  const [data, unreadCount] = await Promise.all([
    getUnreadNotifications(session.user.id),
    getUnreadCount(session.user.id),
  ]);
  return Response.json({ data, unreadCount });
});
