// Per-user tags
export const userBalancesTag = (userId: string) => `balances:${userId}`;
export const userHistoryTag = (userId: string) => `history:${userId}`;
export const userNotificationsTag = (userId: string) =>
  `notifications:${userId}`;

// Global tags (shared data)
export const PENDING_REQUESTS_TAG = "pending-requests";
export const TEAM_STATS_TAG = "team-stats";
export const CALENDAR_TAG = "calendar";
export const HOLIDAYS_TAG = "holidays";
export const USERS_TAG = "users";
