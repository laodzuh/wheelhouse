import Dexie, { type Table } from "dexie";
import type {
  UserProfile,
  Strategy,
  TickerThesis,
  Wheel,
  Dot,
  TradeEvent,
  AIInteraction,
} from "@/lib/types";

/**
 * Wheelhouse database — local-first via IndexedDB.
 *
 * Index notation:
 *   ++id    = auto-increment primary key
 *   field   = indexed for queries
 *   [a+b]   = compound index
 *
 * Non-indexed fields (like prose, dataFields, etc.) are still stored,
 * they just can't be queried directly — which is fine since we always
 * look them up by id or foreign key.
 */
export class WheelhouseDB extends Dexie {
  userProfile!: Table<UserProfile, number>;
  strategies!: Table<Strategy, number>;
  tickerTheses!: Table<TickerThesis, number>;
  wheels!: Table<Wheel, number>;
  dots!: Table<Dot, number>;
  tradeEvents!: Table<TradeEvent, number>;
  aiInteractions!: Table<AIInteraction, number>;

  constructor() {
    super("wheelhouse");

    this.version(1).stores({
      userProfile: "++id",
      strategies: "++id, userId, isActive, [userId+isActive], previousVersionId",
      tickerTheses: "++id, userId, strategyId, ticker, status, [userId+status]",
      wheels: "++id, thesisId, ticker",
      dots: "++id, wheelId, state, isActive, [wheelId+isActive]",
      tradeEvents: "++id, dotId, wheelId, thesisId, eventType, createdAt",
      aiInteractions: "++id, userId, context, relatedEntityId, relatedEntityType",
    });
  }
}

export const db = new WheelhouseDB();
