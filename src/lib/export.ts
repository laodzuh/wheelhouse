import { db } from "@/db";
import { TradeSchema } from "@/db/schema";

const LAST_EXPORT_KEY = "wheelhouse-last-export";

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
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
}

export function getLastExportedAt(): Date | null {
  const stored = localStorage.getItem(LAST_EXPORT_KEY);
  return stored ? new Date(stored) : null;
}

export async function importTrades(file: File): Promise<number> {
  const text = await file.text();
  const data: unknown = JSON.parse(text);

  if (!Array.isArray(data)) {
    throw new Error("Invalid file format: expected an array of trades");
  }

  const result = TradeSchema.array().safeParse(data);
  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new Error(
      `Invalid trade data at index ${String(firstError.path[0])}: ${firstError.message} (field: ${firstError.path.slice(1).map(String).join(".")})`
    );
  }

  await db.trades.bulkPut(result.data);
  return result.data.length;
}

export async function deleteAllTrades(): Promise<void> {
  await db.trades.clear();
}
