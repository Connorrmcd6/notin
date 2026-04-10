import { withErrorHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { LeaveApproveSchema } from "@/lib/validators";
import { approveLeaveRequest } from "@/lib/leave";

export const POST = withErrorHandler(async (request) => {
  const session = await requirePermission("leave:approve");
  const body = await request.json();
  const { requestId } = LeaveApproveSchema.parse(body);
  const result = await approveLeaveRequest(session.user.id, requestId);
  return Response.json({ data: result });
});
