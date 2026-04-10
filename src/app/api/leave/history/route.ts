import type { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { LeaveHistoryQuerySchema } from "@/lib/validators";
import { getLeaveHistory } from "@/lib/leave";

export const GET = withErrorHandler(async (request) => {
  const session = await requirePermission("leave:request");
  const params = Object.fromEntries(
    (request as NextRequest).nextUrl.searchParams,
  );
  const filters = LeaveHistoryQuerySchema.parse(params);
  const result = await getLeaveHistory(session.user.id, filters);
  return Response.json({ data: result.requests, total: result.total });
});
