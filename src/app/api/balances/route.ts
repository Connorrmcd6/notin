import { withErrorHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { getBalances } from "@/lib/balances";

export const GET = withErrorHandler(async () => {
  const session = await requirePermission("balances:read");
  const balances = await getBalances(session.user.id);
  return Response.json({ data: balances });
});
