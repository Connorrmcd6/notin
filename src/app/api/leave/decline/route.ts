import { withErrorHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { LeaveDeclineSchema } from "@/lib/validators";
import { declineLeaveRequest } from "@/lib/leave";

export const POST = withErrorHandler(async (request) => {
  const session = await requirePermission("leave:decline");
  const body = await request.json();
  const { requestId, reason } = LeaveDeclineSchema.parse(body);
  const result = await declineLeaveRequest(session.user.id, requestId, reason);
  return Response.json({ data: result });
});
