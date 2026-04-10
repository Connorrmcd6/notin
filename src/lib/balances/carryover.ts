import { prisma } from "@/lib/db/client";
import { calculateRemainingBalance } from "@/lib/leave/calculations";

/**
 * Carry over unused leave balances from one year to the next.
 * No cap on carryover per spec.
 */
export async function carryOverBalances(
  fromYear: number,
  toYear: number,
): Promise<{ processed: number; results: Array<{ userId: string; carried: number }> }> {
  const balances = await prisma.leaveBalance.findMany({
    where: { year: fromYear },
  });

  const results: Array<{ userId: string; carried: number }> = [];

  for (const balance of balances) {
    const remaining = calculateRemainingBalance(balance);
    const carried = Math.max(0, remaining);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.leaveBalance.findUnique({
        where: { userId_year: { userId: balance.userId, year: toYear } },
      });

      if (existing) {
        await tx.leaveBalance.update({
          where: { userId_year: { userId: balance.userId, year: toYear } },
          data: { carriedOver: carried },
        });
      } else {
        await tx.leaveBalance.create({
          data: {
            userId: balance.userId,
            year: toYear,
            annualAllowance: balance.annualAllowance,
            usedDays: 0,
            carriedOver: carried,
          },
        });
      }
    });

    results.push({ userId: balance.userId, carried });
  }

  return { processed: results.length, results };
}
