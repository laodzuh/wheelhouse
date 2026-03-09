import { db } from "@/db";
import type { Trade } from "@/db/types";

export async function exportTrades(): Promise<void> {
  const trades = await db.trades.toArray();
  const data = JSON.stringify(trades, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wheelhouse-export-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importTrades(file: File): Promise<number> {
  const text = await file.text();
  const data: unknown = JSON.parse(text);

  if (!Array.isArray(data)) {
    throw new Error("Invalid file format: expected an array of trades");
  }

  const trades = data as Trade[];

  for (const trade of trades) {
    if (!trade.id || !trade.ticker || !trade.dateOpened) {
      throw new Error("Invalid trade data: missing required fields");
    }
  }

  await db.trades.bulkPut(trades);
  return trades.length;
}

export async function deleteAllTrades(): Promise<void> {
  await db.trades.clear();
}
