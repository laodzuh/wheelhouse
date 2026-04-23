/**
 * Database backup & restore.
 *
 * `serializeBackup` and `applyBackup` are the reusable primitives —
 * both the manual file export/import flow and the sync push/pull flow
 * build on them. Only data tables are included; the device-local
 * `syncState` (holds the sync URL and secret) is never touched.
 */

import { db } from "./database";

export interface BackupData {
  version: 1;
  exportedAt: string;
  tables: {
    userProfile: unknown[];
    strategies: unknown[];
    tickerTheses: unknown[];
    wheels: unknown[];
    dots: unknown[];
    tradeEvents: unknown[];
    aiInteractions: unknown[];
  };
}

export async function serializeBackup(): Promise<BackupData> {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: {
      userProfile: await db.userProfile.toArray(),
      strategies: await db.strategies.toArray(),
      tickerTheses: await db.tickerTheses.toArray(),
      wheels: await db.wheels.toArray(),
      dots: await db.dots.toArray(),
      tradeEvents: await db.tradeEvents.toArray(),
      aiInteractions: await db.aiInteractions.toArray(),
    },
  };
}

export async function applyBackup(data: BackupData): Promise<void> {
  if (!data.version || !data.tables) {
    throw new Error("Invalid backup format");
  }
  const dataTables = [
    db.userProfile,
    db.strategies,
    db.tickerTheses,
    db.wheels,
    db.dots,
    db.tradeEvents,
    db.aiInteractions,
  ];
  await db.transaction("rw", dataTables, async () => {
    for (const table of dataTables) {
      await table.clear();
    }
    if (data.tables.userProfile?.length) {
      await db.userProfile.bulkAdd(data.tables.userProfile as never[]);
    }
    if (data.tables.strategies?.length) {
      await db.strategies.bulkAdd(data.tables.strategies as never[]);
    }
    if (data.tables.tickerTheses?.length) {
      await db.tickerTheses.bulkAdd(data.tables.tickerTheses as never[]);
    }
    if (data.tables.wheels?.length) {
      await db.wheels.bulkAdd(data.tables.wheels as never[]);
    }
    if (data.tables.dots?.length) {
      await db.dots.bulkAdd(data.tables.dots as never[]);
    }
    if (data.tables.tradeEvents?.length) {
      await db.tradeEvents.bulkAdd(data.tables.tradeEvents as never[]);
    }
    if (data.tables.aiInteractions?.length) {
      await db.aiInteractions.bulkAdd(data.tables.aiInteractions as never[]);
    }
  });
}

export async function exportDatabase(): Promise<void> {
  const data = await serializeBackup();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `wheelhouse-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importDatabase(file: File): Promise<void> {
  const text = await file.text();
  const data: BackupData = JSON.parse(text);
  await applyBackup(data);
}
