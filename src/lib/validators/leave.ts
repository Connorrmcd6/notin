import { z } from "zod/v4";

export const LeaveRequestSchema = z
  .object({
    leaveType: z.enum(["PAID_ANNUAL", "UNPAID"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    dayType: z.enum(["FULL", "MORNING", "AFTERNOON"]).default("FULL"),
    note: z.string().max(500).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
  })
  .refine(
    (data) => {
      if (data.dayType === "MORNING" || data.dayType === "AFTERNOON") {
        return (
          data.startDate.getTime() === data.endDate.getTime()
        );
      }
      return true;
    },
    {
      message: "Half-day requests must be for a single day",
    },
  );

export type LeaveRequestInput = z.infer<typeof LeaveRequestSchema>;

export const LeaveCancelSchema = z.object({
  requestId: z.uuid(),
});

export const LeaveApproveSchema = z.object({
  requestId: z.uuid(),
});

export const LeaveDeclineSchema = z.object({
  requestId: z.uuid(),
  reason: z.string().min(1).max(500),
});

export const LeaveHistoryQuerySchema = z.object({
  status: z
    .enum(["PENDING", "APPROVED", "DECLINED", "CANCELLED"])
    .optional(),
  leaveType: z.enum(["PAID_ANNUAL", "UNPAID"]).optional(),
  year: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type LeaveHistoryQuery = z.infer<typeof LeaveHistoryQuerySchema>;

export const BalanceAdjustSchema = z.object({
  userId: z.uuid(),
  year: z.coerce.number().int(),
  days: z.number(),
  reason: z.string().min(1).max(500),
});

export type BalanceAdjustInput = z.infer<typeof BalanceAdjustSchema>;
