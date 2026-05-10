import Dexie, { type Table } from "dexie";
import type {
  UserProfile,
  Strategy,
  TickerThesis,
  Wheel,
  Dot,
  TradeEvent,
  AIInteraction,
  SyncState,
} from "@/lib/types";

/**
 * Wheelhouse database — local-first via IndexedDB.
 *
 * Index notation:
 *   ++id    = auto-increment primary key
 *   &id     = non-auto-increment primary key, unique
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
  syncState!: Table<SyncState, number>;

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

    // v2: add syncState. Device-local singleton; never synced.
    this.version(2).stores({
      userProfile: "++id",
      strategies: "++id, userId, isActive, [userId+isActive], previousVersionId",
      tickerTheses: "++id, userId, strategyId, ticker, status, [userId+status]",
      wheels: "++id, thesisId, ticker",
      dots: "++id, wheelId, state, isActive, [wheelId+isActive]",
      tradeEvents: "++id, dotId, wheelId, thesisId, eventType, createdAt",
      aiInteractions: "++id, userId, context, relatedEntityId, relatedEntityType",
      syncState: "&id",
    });
  }
}

export const db = new WheelhouseDB();

/**
 * Data tables that participate in sync. syncState is explicitly excluded —
 * it holds the per-device secret and cursors, which must stay local.
 */
export const SYNC_DATA_TABLE_NAMES = [
  "userProfile",
  "strategies",
  "tickerTheses",
  "wheels",
  "dots",
  "tradeEvents",
  "aiInteractions",
] as const;

// ─── Data-write event bus ──────────────────────────────────────────
//
// Hooks are installed at module load so they're in place before any
// component mounts. Sync (or anything else) subscribes via onDataWrite.

const writeListeners = new Set<() => void>();

export function onDataWrite(fn: () => void): () => void {
  writeListeners.add(fn);
  return () => writeListeners.delete(fn);
}

function fireWrite(reason: string): void {
  console.info(`[sync] ${reason}`);
  writeListeners.forEach((l) => {
    try {
      l();
    } catch (err) {
      console.error("[sync] write listener threw:", err);
    }
  });
}

const syncTables = [
  db.userProfile,
  db.strategies,
  db.tickerTheses,
  db.wheels,
  db.dots,
  db.tradeEvents,
  db.aiInteractions,
];

for (const table of syncTables) {
  const name = table.name;
  table.hook("creating", () => fireWrite(`creating on ${name}`));
  table.hook("updating", () => fireWrite(`updating on ${name}`));
  table.hook("deleting", () => fireWrite(`deleting on ${name}`));
}

console.info("[sync] hooks installed at module load for", syncTables.map((t) => t.name).join(", "));
