import { useState } from "react";
import type { TradeGroup as TradeGroupType } from "@/lib/calculations";
import { TradeRow } from "./TradeRow";
import { formatCurrency, cn } from "@/lib/utils";
import type { Trade, Account } from "@/db/types";

interface TradeGroupProps {
  group: TradeGroupType;
  accounts?: Account[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onRoll: (trade: Trade) => void;
}

export function TradeGroup({ group, accounts, onEdit, onDelete, onRoll }: TradeGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const isMultiLeg = group.trades.length > 1;

  if (!isMultiLeg) {
    return (
      <TradeRow
        trade={group.trades[0]}
        accounts={accounts}
        onEdit={onEdit}
        onDelete={onDelete}
        onRoll={onRoll}
      />
    );
  }

  const firstTrade = group.trades[0];

  return (
    <>
      <tr
        className="border-b border-gray-800 bg-gray-800/30 cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-sm" colSpan={8}>
          <div className="flex items-center gap-2">
            <svg
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                expanded && "rotate-90"
              )}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium text-gray-100">
              {firstTrade.ticker}
            </span>
            <span className="text-xs text-gray-500">
              {group.trades.length} legs &middot; {firstTrade.strategy}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          {group.totalPnL != null ? (
            <span
              className={cn(
                "font-medium",
                group.totalPnL >= 0 ? "text-green-400" : "text-red-400"
              )}
            >
              {formatCurrency(group.totalPnL)}
            </span>
          ) : (
            <span className="text-gray-500">&mdash;</span>
          )}
        </td>
        <td className="px-4 py-3" colSpan={5} />
      </tr>
      {expanded &&
        group.trades.map((trade) => (
          <TradeRow
            key={trade.id}
            trade={trade}
            accounts={accounts}
            onEdit={onEdit}
            onDelete={onDelete}
            onRoll={onRoll}
            isGrouped
          />
        ))}
    </>
  );
}
