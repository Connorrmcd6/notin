import { withErrorHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { LeaveRequestSchema } from "@/lib/validators";
import { submitLeaveRequest } from "@/lib/leave";

export const POST = withErrorHandler(async (request) => {
  const session = await requirePermission("leave:request");
  const body = await request.json();
  const input = LeaveRequestSchema.parse(body);
  const result = await submitLeaveRequest(session.user.id, input);
  return Response.json(
    { data: result.request, warnings: result.warnings },
    { status: 201 },
  );
});
