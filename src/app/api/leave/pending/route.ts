import { withErrorHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { getPendingRequests } from "@/lib/leave";

export const GET = withErrorHandler(async () => {
  await requirePermission("leave:approve");
  const requests = await getPendingRequests();
  return Response.json({ data: requests });
});
