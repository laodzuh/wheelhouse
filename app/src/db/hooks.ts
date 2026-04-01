import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./database";
import type { DotState } from "@/lib/types";

/**
 * Reactive database hooks.
 *
 * useLiveQuery re-renders the component whenever the underlying
 * IndexedDB data changes — so the UI stays in sync automatically.
 * No manual refetching needed.
 */

// ─── User Profile ──────────────────────────────────────────────────

/**
 * Returns the user profile, or null if none exists.
 * We return null (not undefined) for "no profile" so the App can
 * distinguish between "still loading" (undefined) and "no data" (null).
 */
export function useUserProfile() {
  return useLiveQuery(async () => {
    const profile = await db.userProfile.toCollection().first();
    return profile ?? null;
  });
}

// ─── Strategy ──────────────────────────────────────────────────────

export function useActiveStrategy() {
  return useLiveQuery(async () => {
    const strategy = await db.strategies
      .filter((s) => s.isActive === true)
      .first();
    return strategy ?? null;
  });
}

export function useStrategyHistory(userId: number) {
  return useLiveQuery(
    () => db.strategies.where("userId").equals(userId).reverse().sortBy("id"),
    [userId]
  );
}

// ─── Ticker Theses ─────────────────────────────────────────────────

export function useActiveTheses(userId: number) {
  return useLiveQuery(
    async () => {
      if (!userId) return [];
      return db.tickerTheses
        .where("userId")
        .equals(userId)
        .filter((t) => t.status === "active")
        .toArray();
    },
    [userId]
  );
}

export function useThesis(thesisId: number) {
  return useLiveQuery(async () => {
    if (!thesisId) return null;
    const thesis = await db.tickerTheses.get(thesisId);
    return thesis ?? null;
  }, [thesisId]);
}

// ─── Wheels & Dots ─────────────────────────────────────────────────

export function useWheel(thesisId: number) {
  return useLiveQuery(
    async () => {
      if (!thesisId) return null;
      const wheel = await db.wheels.where("thesisId").equals(thesisId).first();
      return wheel ?? null;
    },
    [thesisId]
  );
}

export function useActiveDots(wheelId: number | null) {
  return useLiveQuery(
    async () => {
      if (!wheelId) return [];
      return db.dots
        .where("wheelId")
        .equals(wheelId)
        .filter((d) => d.isActive)
        .toArray();
    },
    [wheelId]
  );
}

export function useDotsByState(wheelId: number, state: DotState) {
  return useLiveQuery(
    () =>
      db.dots
        .where({ wheelId, isActive: true })
        .filter((dot) => dot.state === state)
        .toArray(),
    [wheelId, state]
  );
}

// ─── Trade Events ──────────────────────────────────────────────────

export function useTradeEventsForDot(dotId: number) {
  return useLiveQuery(
    () => db.tradeEvents.where("dotId").equals(dotId).sortBy("createdAt"),
    [dotId]
  );
}

export function useTradeEventsForThesis(thesisId: number) {
  return useLiveQuery(
    async () => {
      if (!thesisId) return [];
      return db.tradeEvents.where("thesisId").equals(thesisId).sortBy("createdAt");
    },
    [thesisId]
  );
}

export function useRecentTradeEvents(limit: number = 20) {
  return useLiveQuery(() =>
    db.tradeEvents.orderBy("createdAt").reverse().limit(limit).toArray()
  );
}
