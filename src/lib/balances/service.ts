import { prisma } from "@/lib/db/client";
import type {
  LeaveBalance,
  BalanceAdjustment,
} from "@/generated/prisma/client";
import type { BalanceAdjustInput } from "@/lib/validators";

/**
 * Get all leave balances for a user, ordered by year descending.
 */
export async function getBalances(userId: string): Promise<LeaveBalance[]> {
  return prisma.leaveBalance.findMany({
    where: { userId },
    orderBy: { year: "desc" },
  });
}

/**
 * Adjust a user's leave balance (admin only).
 * Modifies annualAllowance (not usedDays) and creates an audit trail.
 */
export async function adjustBalance(
  adminId: string,
  input: BalanceAdjustInput,
): Promise<{ balance: LeaveBalance; adjustment: BalanceAdjustment }> {
  return prisma.$transaction(async (tx) => {
    const balance = await tx.leaveBalance.upsert({
      where: { userId_year: { userId: input.userId, year: input.year } },
      update: { annualAllowance: { increment: input.days } },
      create: {
        userId: input.userId,
        year: input.year,
        annualAllowance: input.days > 0 ? input.days : 0,
        usedDays: 0,
        carriedOver: 0,
      },
    });

    const adjustment = await tx.balanceAdjustment.create({
      data: {
        userId: input.userId,
        adjustedBy: adminId,
        year: input.year,
        days: input.days,
        reason: input.reason,
      },
    });

    return { balance, adjustment };
  });
}
