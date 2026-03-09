import Dexie, { type Table } from "dexie";
import type { Trade, Account } from "./types";

class WheelhouseDB extends Dexie {
  trades!: Table<Trade, string>;
  accounts!: Table<Account, string>;

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
  }
}

export const db = new WheelhouseDB();
