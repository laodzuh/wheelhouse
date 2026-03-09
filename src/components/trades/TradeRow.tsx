import type { Trade, Account } from "@/db/types";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, formatDateShort, cn } from "@/lib/utils";
import { calculateTotalPnL, calculateROI, calculateAnnualizedROI } from "@/lib/calculations";

interface TradeRowProps {
  trade: Trade;
  accounts?: Account[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onRoll: (trade: Trade) => void;
  isGrouped?: boolean;
}

export function TradeRow({
  trade,
  accounts,
  onEdit,
  onDelete,
  onRoll,
  isGrouped,
}: TradeRowProps) {
  const accountName = accounts?.find((a) => a.id === trade.accountId)?.name;
  const pnl = calculateTotalPnL(trade);
  const roi = calculateROI(trade);
  const annualized = calculateAnnualizedROI(trade);

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
      <td className={cn("px-4 py-3 text-sm", isGrouped && "pl-10")}>
        <span className="font-medium text-gray-100">{trade.ticker}</span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {accountName ?? "\u2014"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">
        {trade.optionType} &middot; {trade.action}
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">
        ${trade.strikePrice} &middot; {formatDateShort(trade.expirationDate)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">{trade.contracts}</td>
      <td className="px-4 py-3 text-sm text-gray-300">
        {formatCurrency(trade.premiumPerContract)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {trade.strategy}
      </td>
      <td className="px-4 py-3 text-sm">
        <StatusBadge status={trade.status} />
      </td>
      <td className="px-4 py-3 text-sm">
        {pnl != null ? (
          <span className={pnl >= 0 ? "text-green-400" : "text-red-400"}>
            {formatCurrency(pnl)}
          </span>
        ) : (
          <span className="text-gray-500">&mdash;</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {roi != null ? `${roi.toFixed(1)}%` : "\u2014"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {annualized != null ? `${annualized.toFixed(1)}%` : "\u2014"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {formatDateShort(trade.dateOpened)}
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-1">
          {trade.status === "Open" && (
            <button
              onClick={() => onRoll(trade)}
              className="rounded px-2 py-1 text-xs text-orange-400 hover:bg-orange-500/10 cursor-pointer"
              title="Roll"
            >
              Roll
            </button>
          )}
          <button
            onClick={() => onEdit(trade)}
            className="rounded px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/10 cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(trade.id)}
            className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 cursor-pointer"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
