import { useMemo, useState } from "react";
import type { Trade, Account } from "@/db/types";
import { TradeGroup } from "./TradeGroup";
import { TradeFilters, type TradeFilterValues } from "./TradeFilters";
import { groupTrades } from "@/lib/calculations";

interface TradeTableProps {
  trades: Trade[];
  accounts?: Account[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onRoll: (trade: Trade) => void;
}

export function TradeTable({ trades, accounts, onEdit, onDelete, onRoll }: TradeTableProps) {
  const [filters, setFilters] = useState<TradeFilterValues>({
    search: "",
    status: "",
    strategy: "",
    accountId: "",
  });

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (
        filters.search &&
        !t.ticker.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.strategy && t.strategy !== filters.strategy) return false;
      if (filters.accountId && t.accountId !== filters.accountId) return false;
      return true;
    });
  }, [trades, filters]);

  const groups = useMemo(() => groupTrades(filtered), [filtered]);

  return (
    <div>
      <TradeFilters filters={filters} onChange={setFilters} accounts={accounts} />
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800/50">
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-400">
                Ticker
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-400">
                Account
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-400">
                Type / Action
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-400">
                Strike / Exp
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-400">
                Qty
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-400">
                Premium
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-400">
                Strategy
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-400">
                P&L
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-400">
                ROI
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-400">
                Ann. ROI
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-400">
                Opened
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, i) => (
              <TradeGroup
                key={group.groupId ?? group.trades[0].id ?? i}
                group={group}
                accounts={accounts}
                onEdit={onEdit}
                onDelete={onDelete}
                onRoll={onRoll}
              />
            ))}
          </tbody>
        </table>
        {groups.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">
            No trades found
          </div>
        )}
      </div>
    </div>
  );
}
