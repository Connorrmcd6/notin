import { withErrorHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { BalanceAdjustSchema } from "@/lib/validators";
import { adjustBalance } from "@/lib/balances";

export const POST = withErrorHandler(async (request) => {
  const session = await requirePermission("balances:adjust");
  const body = await request.json();
  const input = BalanceAdjustSchema.parse(body);
  const result = await adjustBalance(session.user.id, input);
  return Response.json({ data: result });
});
