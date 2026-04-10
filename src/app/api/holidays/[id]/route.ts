import { withErrorHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { deleteHoliday } from "@/lib/holidays";

export const DELETE = withErrorHandler(async (request) => {
  await requirePermission("holidays:manage");
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const id = segments[segments.indexOf("holidays") + 1];
  await deleteHoliday(id);
  return Response.json({ success: true });
});
