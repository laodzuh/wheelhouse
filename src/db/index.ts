import Dexie, { type Table } from "dexie";
import type { Trade, Account, Position } from "./types";

class WheelhouseDB extends Dexie {
  trades!: Table<Trade, string>;
  accounts!: Table<Account, string>;
  positions!: Table<Position, string>;

  constructor() {
    super("OptionTrackerDB");
    this.version(1).stores({
      trades:
        "id, groupId, ticker, status, dateOpened, dateClosed, expirationDate, strategy, createdAt",
    });
    this.version(2).stores({
      trades:
        "id, groupId, ticker, status, dateOpened, dateClosed, expirationDate, strategy, createdAt, accountId",
      accounts: "id",
    });
    this.version(3)
      .stores({
        trades:
          "id, groupId, ticker, status, dateOpened, dateClosed, expirationDate, strategy, createdAt, accountId, wheelPositionId",
        accounts: "id",
        wheelPositions: "id, ticker, phase, accountId, entryDate",
      })
      .upgrade((tx) => {
        return tx
          .table("trades")
          .toCollection()
          .modify((trade) => {
            if (trade.wheelPositionId === undefined) {
              trade.wheelPositionId = null;
            }
          });
      });
    this.version(4).stores({
      trades:
        "id, groupId, ticker, status, dateOpened, dateClosed, expirationDate, strategy, createdAt, accountId, wheelPositionId",
      accounts: "id",
      wheelPositions: "id, ticker, phase, accountId, entryDate",
      wheelLots: "id, wheelPositionId, status",
    });
    this.version(5)
      .stores({
        trades:
          "id, groupId, ticker, status, dateOpened, dateClosed, expirationDate, strategy, createdAt, accountId, wheelPositionId, wheelCycleId",
        accounts: "id",
        wheelPositions: "id, ticker, phase, accountId, entryDate",
        wheelLots: null as unknown as string, // drop old table
        wheelCycles: "id, wheelPositionId, status, cycleNumber",
      })
      .upgrade(async (tx) => {
        // Migrate wheelLots -> wheelCycles
        const lots = await tx.table("wheelLots").toArray();
        for (const lot of lots) {
          await tx.table("wheelCycles").add({
            id: lot.id,
            wheelPositionId: lot.wheelPositionId,
            cycleNumber: 1,
            startDate: lot.acquiredDate,
            endDate: lot.soldDate,
            assignedDate: lot.acquiredDate,
            costBasis: lot.costBasis,
            soldPrice: lot.soldPrice,
            shareCount: lot.shareCount,
            status: lot.status === "sold" ? "completed" : "holding_shares",
            createdAt: lot.createdAt,
            updatedAt: lot.updatedAt,
          });
        }

        // Create cycles for positions that had no lots
        const positions = await tx.table("wheelPositions").toArray();
        const lotPositionIds = new Set(lots.map((l: { wheelPositionId: string }) => l.wheelPositionId));
        const now = new Date().toISOString();
        for (const pos of positions) {
          if (!lotPositionIds.has(pos.id)) {
            await tx.table("wheelCycles").add({
              id: `cycle-${pos.id}`,
              wheelPositionId: pos.id,
              cycleNumber: 1,
              startDate: pos.entryDate,
              endDate: pos.completedDate,
              assignedDate: pos.phase !== "selling_puts" ? pos.entryDate : null,
              costBasis: pos.shareCostBasis,
              soldPrice: null,
              shareCount: pos.shareCount,
              status: pos.phase === "completed" ? "completed" : pos.phase,
              createdAt: now,
              updatedAt: now,
            });
          }
        }

        // Add wheelCycleId to all trades
        await tx.table("trades").toCollection().modify((trade: Record<string, unknown>) => {
          if (trade.wheelCycleId === undefined) {
            trade.wheelCycleId = null;
          }
        });
      });

    // v6: Flatten Wheel = one cycle. Move cycle data onto position, drop wheelCycles table.
    this.version(6)
      .stores({
        trades:
          "id, groupId, ticker, status, dateOpened, dateClosed, expirationDate, strategy, createdAt, accountId, wheelPositionId",
        accounts: "id",
        wheelPositions: "id, ticker, phase, accountId, entryDate",
        wheelCycles: null as unknown as string, // drop table
      })
      .upgrade(async (tx) => {
        // Merge cycle data into positions
        const cycles = await tx.table("wheelCycles").toArray();
        for (const cycle of cycles) {
          // Only apply data from the most relevant cycle (highest cycleNumber)
          const pos = await tx.table("wheelPositions").get(cycle.wheelPositionId);
          if (!pos) continue;
          // If position already has assignedDate from an earlier cycle migration, take the latest
          if (!pos.assignedDate || cycle.cycleNumber > 1) {
            const updates: Record<string, unknown> = {};
            if (cycle.assignedDate) updates.assignedDate = cycle.assignedDate;
            if (cycle.soldPrice != null) updates.soldPrice = cycle.soldPrice;
            if (cycle.costBasis != null) updates.shareCostBasis = cycle.costBasis;
            if (cycle.shareCount != null) updates.shareCount = cycle.shareCount;
            if (Object.keys(updates).length > 0) {
              await tx.table("wheelPositions").update(cycle.wheelPositionId, updates);
            }
          }
        }

        // Ensure new fields exist on all positions
        await tx.table("wheelPositions").toCollection().modify((pos: Record<string, unknown>) => {
          if (pos.assignedDate === undefined) pos.assignedDate = null;
          if (pos.soldPrice === undefined) pos.soldPrice = null;
        });

        // Remove wheelCycleId from trades
        await tx.table("trades").toCollection().modify((trade: Record<string, unknown>) => {
          delete trade.wheelCycleId;
        });
      });

    // v7: Rename wheelPositions → positions, wheelPositionId → positionId, add strategy field
    this.version(7)
      .stores({
        trades:
          "id, groupId, ticker, status, dateOpened, dateClosed, expirationDate, strategy, createdAt, accountId, positionId",
        accounts: "id",
        wheelPositions: null as unknown as string, // drop old table
        positions: "id, ticker, strategy, phase, accountId, entryDate",
      })
      .upgrade(async (tx) => {
        // Copy wheelPositions → positions with strategy field
        const oldPositions = await tx.table("wheelPositions").toArray();
        for (const pos of oldPositions) {
          await tx.table("positions").add({
            ...pos,
            strategy: pos.entryType === "shares" ? "covered_call" : "wheel",
          });
        }

        // Rename wheelPositionId → positionId on all trades
        await tx.table("trades").toCollection().modify((trade: Record<string, unknown>) => {
          trade.positionId = trade.wheelPositionId ?? null;
          delete trade.wheelPositionId;
        });
      });
  }
}

export const db = new WheelhouseDB();
