import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import type { Account } from "@/db/types";
import { generateId } from "@/lib/utils";

export function useAccounts() {
  return useLiveQuery(() => db.accounts.toArray());
}

export async function addAccount(name: string, size: number): Promise<string> {
  const id = generateId();
  await db.accounts.add({ id, name, size });
  return id;
}

export async function updateAccount(
  id: string,
  data: Partial<Omit<Account, "id">>
): Promise<void> {
  await db.accounts.update(id, data);
}

export async function deleteAccount(id: string): Promise<void> {
  await db.transaction("rw", db.accounts, db.trades, async () => {
    await db.trades.where("accountId").equals(id).modify({ accountId: null });
    await db.accounts.delete(id);
  });
}
