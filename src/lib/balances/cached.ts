import { unstable_cache } from "next/cache";
import { getBalances } from "./service";
import { userBalancesTag } from "@/lib/cache";

export const getCachedBalances = (userId: string) =>
  unstable_cache(() => getBalances(userId), ["balances", userId], {
    tags: [userBalancesTag(userId)],
  })();
