import { unstable_cache } from "next/cache";
import { getLeaveHistory, getPendingRequests, getTeamStats } from "./service";
import type { LeaveHistoryQuery } from "@/lib/validators";
import {
  userHistoryTag,
  PENDING_REQUESTS_TAG,
  TEAM_STATS_TAG,
} from "@/lib/cache";

export const getCachedLeaveHistory = (
  userId: string,
  filters: LeaveHistoryQuery,
) =>
  unstable_cache(
    () => getLeaveHistory(userId, filters),
    ["history", userId, JSON.stringify(filters)],
    { tags: [userHistoryTag(userId)] },
  )();

export const getCachedPendingRequests = () =>
  unstable_cache(() => getPendingRequests(), ["pending-requests"], {
    tags: [PENDING_REQUESTS_TAG],
  })();

export const getCachedTeamStats = () =>
  unstable_cache(() => getTeamStats(), ["team-stats"], {
    tags: [TEAM_STATS_TAG],
  })();
