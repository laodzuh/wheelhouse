/**
 * Database backup & restore.
 *
 * Export: dumps all tables to a JSON blob and triggers a file download.
 * Import: reads a JSON file and replaces all tables with the imported data.
 */

import { db } from "./database";

interface BackupData {
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

/**
 * Export the entire database as a JSON download.
 */
export async function exportDatabase(): Promise<void> {
  const data: BackupData = {
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

/**
 * Import a backup file, replacing all existing data.
 * Returns true on success, throws on failure.
 */
export async function importDatabase(file: File): Promise<void> {
  const text = await file.text();
  const data: BackupData = JSON.parse(text);

  if (!data.version || !data.tables) {
    throw new Error("Invalid backup file format");
  }

  // Clear all tables
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }

    // Restore each table
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
