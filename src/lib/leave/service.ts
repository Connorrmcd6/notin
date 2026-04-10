import { prisma } from "@/lib/db/client";
import type { LeaveRequest, Prisma } from "@/generated/prisma/client";
import type { LeaveRequestInput, LeaveHistoryQuery } from "@/lib/validators";
import {
  calculateLeaveDays,
  calculateRemainingBalance,
  findHolidayOverlaps,
  hasMinimumNotice,
  hasSufficientBalance,
} from "./calculations";
import { notifyAdmins, notifyEmployee } from "./notifications";
import {
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google-calendar";

/**
 * Submit a new leave request.
 * Validates business rules, creates a PENDING request, and notifies admins.
 */
export async function submitLeaveRequest(
  userId: string,
  input: LeaveRequestInput,
): Promise<{ request: LeaveRequest; warnings: string[] }> {
  if (!hasMinimumNotice(input.startDate)) {
    throw new Error("BUSINESS:Leave requests require at least 1 day notice");
  }

  const warnings: string[] = [];

  const holidays = await prisma.publicHoliday.findMany({
    where: {
      date: { gte: input.startDate, lte: input.endDate },
    },
  });

  const holidayDates = holidays.map((h) => h.date);
  const days = calculateLeaveDays(input.startDate, input.endDate, input.dayType, holidayDates);

  if (days === 0) {
    throw new Error("BUSINESS:Selected dates contain no working days");
  }

  if (holidays.length > 0) {
    const overlaps = findHolidayOverlaps(
      input.startDate,
      input.endDate,
      holidayDates,
    );
    if (overlaps.length > 0) {
      const names = holidays
        .filter((h) => overlaps.some((o) => o.getTime() === h.date.getTime()))
        .map((h) => h.name);
      warnings.push(
        `Your request overlaps with public holiday(s): ${names.join(", ")}`,
      );
    }
  }

  if (input.leaveType === "PAID_ANNUAL") {
    const year = input.startDate.getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_year: { userId, year } },
    });

    if (!balance) {
      throw new Error("BUSINESS:No leave balance found for this year");
    }

    const remaining = calculateRemainingBalance(balance);
    if (!hasSufficientBalance(remaining, days)) {
      throw new Error(
        `BUSINESS:Insufficient balance. ${remaining} days remaining, ${days} requested`,
      );
    }
  }

  const request = await prisma.leaveRequest.create({
    data: {
      userId,
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      dayType: input.dayType,
      note: input.note,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const displayName = user?.name ?? user?.email ?? "An employee";
  const typeLabel = input.leaveType === "PAID_ANNUAL" ? "paid" : "unpaid";

  await notifyAdmins(
    `${displayName} requested ${days}d ${typeLabel} leave (${formatDate(input.startDate)} – ${formatDate(input.endDate)})`,
    "/admin",
  );

  return { request, warnings };
}

/**
 * Cancel a leave request.
 * Only the owning user can cancel. Refunds balance if the request was approved.
 */
export async function cancelLeaveRequest(
  userId: string,
  requestId: string,
): Promise<LeaveRequest> {
  const request = await prisma.leaveRequest.findFirst({
    where: { id: requestId, userId },
  });

  if (!request) {
    throw new Error("Not found");
  }

  if (request.status !== "PENDING" && request.status !== "APPROVED") {
    throw new Error("BUSINESS:Only pending or approved requests can be cancelled");
  }

  const needsRefund =
    request.status === "APPROVED" && request.leaveType === "PAID_ANNUAL";
  let refundDays = 0;
  if (needsRefund) {
    const holidays = await prisma.publicHoliday.findMany({
      where: { date: { gte: request.startDate, lte: request.endDate } },
    });
    refundDays = calculateLeaveDays(
      request.startDate, request.endDate, request.dayType, holidays.map((h) => h.date),
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.leaveRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
    });

    if (needsRefund) {
      const year = request.startDate.getFullYear();
      await tx.leaveBalance.update({
        where: { userId_year: { userId, year } },
        data: { usedDays: { decrement: refundDays } },
      });
    }

    return updatedRequest;
  });

  // Delete Google Calendar event if one was created
  if (request.calendarEventId) {
    await deleteCalendarEvent(userId, request.calendarEventId);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const displayName = user?.name ?? user?.email ?? "An employee";

  await notifyAdmins(
    `${displayName} cancelled leave (${formatDate(request.startDate)} – ${formatDate(request.endDate)})`,
    "/admin",
  );

  return updated;
}

/**
 * Approve a pending leave request.
 * Deducts balance for paid leave within a transaction.
 */
export async function approveLeaveRequest(
  adminId: string,
  requestId: string,
): Promise<LeaveRequest> {
  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Not found");
  }

  if (request.status !== "PENDING") {
    throw new Error("BUSINESS:Only pending requests can be approved");
  }

  const holidays = await prisma.publicHoliday.findMany({
    where: { date: { gte: request.startDate, lte: request.endDate } },
  });
  const days = calculateLeaveDays(
    request.startDate,
    request.endDate,
    request.dayType,
    holidays.map((h) => h.date),
  );

  const updated = await prisma.$transaction(async (tx) => {
    if (request.leaveType === "PAID_ANNUAL") {
      const year = request.startDate.getFullYear();
      const balance = await tx.leaveBalance.findUnique({
        where: { userId_year: { userId: request.userId, year } },
      });

      if (!balance) {
        throw new Error("BUSINESS:No leave balance found for this year");
      }

      const remaining = calculateRemainingBalance(balance);
      if (!hasSufficientBalance(remaining, days)) {
        throw new Error(
          `BUSINESS:Insufficient balance. ${remaining} days remaining, ${days} requested`,
        );
      }

      await tx.leaveBalance.update({
        where: { userId_year: { userId: request.userId, year } },
        data: { usedDays: { increment: days } },
      });
    }

    return tx.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });
  });

  await notifyEmployee(
    request.userId,
    `Your leave (${formatDate(request.startDate)} – ${formatDate(request.endDate)}) has been approved`,
    "/dashboard/history",
  );

  // Non-blocking Google Calendar event creation
  const user = await prisma.user.findUnique({
    where: { id: request.userId },
    select: { name: true, email: true },
  });
  const calendarName = user?.name ?? user?.email ?? "Employee";
  const typeLabel =
    request.leaveType === "PAID_ANNUAL" ? "PTO" : "Unpaid Leave";
  const eventId = await createCalendarEvent({
    userId: request.userId,
    summary: `${typeLabel} — ${calendarName}`,
    startDate: request.startDate,
    endDate: request.endDate,
    dayType: request.dayType,
  });
  if (eventId) {
    await prisma.leaveRequest.update({
      where: { id: request.id },
      data: { calendarEventId: eventId },
    });
  }

  return updated;
}

/**
 * Decline a pending leave request.
 */
export async function declineLeaveRequest(
  adminId: string,
  requestId: string,
  reason: string,
): Promise<LeaveRequest> {
  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Not found");
  }

  if (request.status !== "PENDING") {
    throw new Error("BUSINESS:Only pending requests can be declined");
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: requestId },
    data: {
      status: "DECLINED",
      reviewedBy: adminId,
      reviewedAt: new Date(),
      declineReason: reason,
    },
  });

  await notifyEmployee(
    request.userId,
    `Your leave (${formatDate(request.startDate)} – ${formatDate(request.endDate)}) was declined: ${reason}`,
    "/dashboard/history",
  );

  return updated;
}

/**
 * Get paginated leave history for a user.
 */
export async function getLeaveHistory(
  userId: string,
  filters: LeaveHistoryQuery,
): Promise<{ requests: LeaveRequest[]; total: number }> {
  const where: Prisma.LeaveRequestWhereInput = { userId };

  if (filters.status) where.status = filters.status;
  if (filters.leaveType) where.leaveType = filters.leaveType;
  if (filters.year) {
    where.startDate = {
      gte: new Date(`${filters.year}-01-01`),
      lt: new Date(`${filters.year + 1}-01-01`),
    };
  }

  const skip = (filters.page - 1) * filters.limit;

  const [requests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: filters.limit,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return { requests, total };
}

/**
 * Get all pending leave requests (admin view).
 */
export async function getPendingRequests(): Promise<LeaveRequest[]> {
  return prisma.leaveRequest.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get team-level stats for the admin dashboard.
 */
export async function getTeamStats(): Promise<{
  totalEmployees: number;
  pendingCount: number;
  onLeaveToday: number;
}> {
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const [totalEmployees, pendingCount, onLeaveToday] = await Promise.all([
    prisma.user.count(),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.leaveRequest.count({
      where: {
        status: "APPROVED",
        startDate: { lte: todayStart },
        endDate: { gte: todayStart },
      },
    }),
  ]);

  return { totalEmployees, pendingCount, onLeaveToday };
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
