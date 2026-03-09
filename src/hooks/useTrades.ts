import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import type { Trade } from "@/db/types";
import { generateId, nowISO } from "@/lib/utils";

export function useAllTrades() {
  return useLiveQuery(() => db.trades.orderBy("dateOpened").reverse().toArray());
}

export function useOpenTrades() {
  return useLiveQuery(() =>
    db.trades.where("status").equals("Open").toArray()
  );
}

export function useTrade(id: string | undefined) {
  return useLiveQuery(() => (id ? db.trades.get(id) : undefined), [id]);
}

export async function addTrade(
  data: Omit<Trade, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = nowISO();
  const id = generateId();
  await db.trades.add({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateTrade(
  id: string,
  data: Partial<Trade>
): Promise<void> {
  await db.trades.update(id, { ...data, updatedAt: nowISO() });
}

export async function deleteTrade(id: string): Promise<void> {
  await db.trades.delete(id);
}
