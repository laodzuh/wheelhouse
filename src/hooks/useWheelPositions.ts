import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import type { Position, PositionPhase, PositionStrategy, Trade } from "@/db/types";
import { generateId, nowISO, todayISO } from "@/lib/utils";

// --- Generic position hooks ---

export function usePositions(strategy?: PositionStrategy) {
  return useLiveQuery(() => {
    if (strategy) {
      return db.positions.where("strategy").equals(strategy).reverse().sortBy("entryDate");
    }
    return db.positions.orderBy("entryDate").reverse().toArray();
  }, [strategy]);
}

export function useActivePositions(strategy?: PositionStrategy) {
  return useLiveQuery(() =>
    db.positions
      .where("phase")
      .notEqual("completed")
      .filter((p) => !strategy || p.strategy === strategy)
      .reverse()
      .sortBy("entryDate"),
    [strategy]
  );
}

export function usePosition(id: string | undefined) {
  return useLiveQuery(() => (id ? db.positions.get(id) : undefined), [id]);
}

export function usePositionTrades(positionId: string | undefined) {
  return useLiveQuery(
    () =>
      positionId
        ? db.trades.where("positionId").equals(positionId).sortBy("dateOpened")
        : [],
    [positionId]
  );
}

// --- Wheel-specific ---

export function useWheelPositions() {
  return usePositions("wheel");
}

export interface StartWheelData {
  ticker: string;
  accountId: string | null;
  notes?: string;
}

export async function startWheel(data: StartWheelData): Promise<string> {
  const now = nowISO();
  const today = todayISO();
  const positionId = generateId();

  const position: Position = {
    id: positionId,
    ticker: data.ticker.toUpperCase().trim(),
    strategy: "wheel",
    phase: "selling_puts",
    shareCount: null,
    shareCostBasis: null,
    assignedDate: null,
    soldPrice: null,
    entryDate: today,
    completedDate: null,
    accountId: data.accountId,
    notes: data.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };

  await db.positions.add(position);
  return positionId;
}

// --- Covered Call-specific ---

export function useCCPositions() {
  return usePositions("covered_call");
}

export interface StartCCData {
  ticker: string;
  shareCostBasis: number;
  accountId: string | null;
  notes?: string;
}

export async function startCCPosition(data: StartCCData): Promise<string> {
  const now = nowISO();
  const today = todayISO();
  const positionId = generateId();

  const position: Position = {
    id: positionId,
    ticker: data.ticker.toUpperCase().trim(),
    strategy: "covered_call",
    phase: "holding_shares",
    shareCount: 100,
    shareCostBasis: data.shareCostBasis,
    assignedDate: today,
    soldPrice: null,
    entryDate: today,
    completedDate: null,
    accountId: data.accountId,
    notes: data.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };

  await db.positions.add(position);
  return positionId;
}

// --- Shared operations ---

export async function addLegToPosition(
  positionId: string,
  data: Omit<Trade, "id" | "createdAt" | "updatedAt" | "positionId">
): Promise<string> {
  const now = nowISO();
  const id = generateId();

  await db.trades.add({
    ...data,
    id,
    positionId,
    createdAt: now,
    updatedAt: now,
  });
  await db.positions.update(positionId, { updatedAt: now });
  return id;
}

export async function transitionToHoldingShares(
  positionId: string,
  costBasis: number
): Promise<void> {
  const now = nowISO();
  const today = todayISO();

  await db.positions.update(positionId, {
    phase: "holding_shares" as PositionPhase,
    shareCount: 100,
    shareCostBasis: costBasis,
    assignedDate: today,
    updatedAt: now,
  });
}

export async function completePosition(
  positionId: string,
  soldPrice?: number
): Promise<void> {
  const now = nowISO();
  const today = todayISO();

  const updates: Partial<Position> & { updatedAt: string } = {
    phase: "completed" as PositionPhase,
    completedDate: today,
    updatedAt: now,
  };

  if (soldPrice != null) {
    updates.soldPrice = soldPrice;
  }

  await db.positions.update(positionId, updates);
}

export async function updatePosition(
  id: string,
  data: Partial<Omit<Position, "id" | "createdAt">>
): Promise<void> {
  await db.positions.update(id, { ...data, updatedAt: nowISO() });
}

export async function deletePosition(id: string): Promise<void> {
  await db.transaction("rw", db.positions, db.trades, async () => {
    await db.trades
      .where("positionId")
      .equals(id)
      .modify({ positionId: null });
    await db.positions.delete(id);
  });
}
