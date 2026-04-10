"use client";

import type {
  LeaveRequest,
  LeaveBalance,
  BalanceAdjustment,
  User,
  PublicHoliday,
  Notification,
} from "@/generated/prisma/client";

type ApiResponse<T> = T;

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json as ApiResponse<T>;
}

// Leave
export function submitLeaveRequest(body: {
  leaveType: string;
  startDate: string;
  endDate: string;
  dayType?: string;
  note?: string;
}) {
  return api<{ data: LeaveRequest; warnings: string[] }>("/api/leave/request", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function cancelLeaveRequest(requestId: string) {
  return api<{ data: LeaveRequest }>("/api/leave/cancel", {
    method: "POST",
    body: JSON.stringify({ requestId }),
  });
}

export function approveLeaveRequest(requestId: string) {
  return api<{ data: LeaveRequest }>("/api/leave/approve", {
    method: "POST",
    body: JSON.stringify({ requestId }),
  });
}

export function declineLeaveRequest(requestId: string, reason: string) {
  return api<{ data: LeaveRequest }>("/api/leave/decline", {
    method: "POST",
    body: JSON.stringify({ requestId, reason }),
  });
}

export function fetchLeaveHistory(params?: URLSearchParams) {
  return api<{ data: LeaveRequest[]; total: number }>(
    `/api/leave/history${params ? `?${params}` : ""}`,
  );
}

export function fetchPendingRequests() {
  return api<{
    data: (LeaveRequest & { user: { id: string; name: string | null; email: string } })[];
  }>("/api/leave/pending");
}

// Balances
export function fetchBalances() {
  return api<{ data: LeaveBalance[] }>("/api/balances");
}

export function adjustBalance(body: {
  userId: string;
  year: number;
  days: number;
  reason: string;
}) {
  return api<{ data: { balance: LeaveBalance; adjustment: BalanceAdjustment } }>(
    "/api/balances/adjust",
    { method: "POST", body: JSON.stringify(body) },
  );
}

// Users
export function fetchUsers() {
  return api<{
    data: (User & { leaveBalances: LeaveBalance[] })[];
  }>("/api/users");
}

export function updateUserRole(userId: string, role: string) {
  return api<{ data: User }>(`/api/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

// Holidays
export function fetchHolidays(year: number) {
  return api<{ data: PublicHoliday[] }>(`/api/holidays?year=${year}`);
}

export function createHoliday(body: { date: string; name: string }) {
  return api<{ data: PublicHoliday }>("/api/holidays", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteHoliday(id: string) {
  return api<{ success: boolean }>(`/api/holidays/${id}`, {
    method: "DELETE",
  });
}

// Notifications
export function fetchNotifications() {
  return api<{ data: Notification[]; unreadCount: number }>(
    "/api/notifications",
  );
}

export function markNotificationsRead(body: { ids?: string[]; all?: boolean }) {
  return api<{ success: boolean }>("/api/notifications/read", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Calendar
export function fetchCalendarData(year: number, month: number) {
  return api<{
    leave: (LeaveRequest & { user: { id: string; name: string | null; email: string } })[];
    holidays: PublicHoliday[];
  }>(`/api/calendar?year=${year}&month=${month}`);
}

// Account / User deletion
export function deleteAccount() {
  return api<{ success: boolean }>("/api/account", { method: "DELETE" });
}

export function deleteUser(userId: string) {
  return api<{ success: boolean }>(`/api/users/${userId}`, {
    method: "DELETE",
  });
}
