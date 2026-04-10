import { withErrorHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { LeaveCancelSchema } from "@/lib/validators";
import { cancelLeaveRequest } from "@/lib/leave";

export const POST = withErrorHandler(async (request) => {
  const session = await requirePermission("leave:cancel");
  const body = await request.json();
  const { requestId } = LeaveCancelSchema.parse(body);
  const result = await cancelLeaveRequest(session.user.id, requestId);
  return Response.json({ data: result });
});
