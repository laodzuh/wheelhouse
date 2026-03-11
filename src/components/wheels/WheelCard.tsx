import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PhaseIndicator } from "./PhaseIndicator";
import { formatCurrency, formatDateShort, cn } from "@/lib/utils";
import { calculateOptionPnL } from "@/lib/calculations";
import type { Trade } from "@/db/types";
import type { PositionStats } from "@/lib/wheelCalculations";

export type LegAction = "expire" | "close" | "assign" | "called_away";

interface WheelCardProps {
  stats: PositionStats;
  onSellPut: () => void;
  onSellCall: () => void;
  onComplete: () => void;
  onLegAction: (action: LegAction, trade: Trade) => void;
  onEditLeg: (trade: Trade) => void;
  onDeleteLeg: (tradeId: string) => void;
  onDelete: () => void;
}

export function WheelCard({
  stats,
  onSellPut,
  onSellCall,
  onComplete,
  onLegAction,
  onEditLeg,
  onDeleteLeg,
  onDelete,
}: WheelCardProps) {
  const { position, legs, netOptionIncome, netCostBasis, sharesPnL, totalPnL, annualizedYield, daysActive, putLegs, callLegs } = stats;
  const [expanded, setExpanded] = useState(true);

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-100">{position.ticker}</h3>
          <PhaseIndicator phase={position.phase} />
        </div>
        <div className="text-right">
          <p className={cn("text-lg font-bold", totalPnL >= 0 ? "text-green-400" : "text-red-400")}>
            {formatCurrency(totalPnL)}
          </p>
          <p className="text-xs text-gray-500">total P&L</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
        <Metric
          label="Premium"
          value={formatCurrency(netOptionIncome)}
          color={netOptionIncome >= 0 ? "green" : "red"}
        />
        {sharesPnL !== 0 && (
          <Metric
            label="Shares P&L"
            value={formatCurrency(sharesPnL)}
            color={sharesPnL >= 0 ? "green" : "red"}
          />
        )}
        <Metric label="Days Active" value={`${daysActive}d`} />
        <Metric label="Legs" value={`${putLegs}P / ${callLegs}C`} />
        {netCostBasis != null && (
          <Metric label="Net Cost Basis" value={formatCurrency(netCostBasis)} />
        )}
        {position.soldPrice != null && (
          <Metric label="Sold Price" value={formatCurrency(position.soldPrice)} />
        )}
        {annualizedYield > 0 && (
          <Metric
            label="Ann. Yield"
            value={`${annualizedYield.toFixed(1)}%`}
            color={annualizedYield >= 0 ? "green" : "red"}
          />
        )}
      </div>

      {/* Legs */}
      {legs.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-2 text-xs text-gray-500 mb-2 hover:text-gray-300"
          >
            <svg
              className={cn("h-3 w-3 shrink-0 transition-transform", expanded && "rotate-90")}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {legs.length} {legs.length === 1 ? "leg" : "legs"}
          </button>
          {expanded && (
            <div className="space-y-1.5">
              {legs.map((leg) => (
                <LegRow
                  key={leg.id}
                  leg={leg}
                  onAction={(action) => onLegAction(action, leg)}
                  onEdit={() => onEditLeg(leg)}
                  onDelete={() => onDeleteLeg(leg.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {position.phase === "selling_puts" && (
          <Button variant="secondary" onClick={onSellPut}>
            Sell Put
          </Button>
        )}
        {position.phase === "holding_shares" && (
          <Button variant="secondary" onClick={onSellCall}>
            Sell Call
          </Button>
        )}
        {position.phase !== "completed" && (
          <Button variant="secondary" onClick={onComplete}>
            Complete
          </Button>
        )}
        <button
          onClick={onDelete}
          className="ml-auto rounded p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </Card>
  );
}

function LegRow({
  leg,
  onAction,
  onEdit,
  onDelete,
}: {
  leg: Trade;
  onAction: (action: LegAction) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pnl = calculateOptionPnL(leg);
  const premium = leg.premiumPerContract * leg.contracts * 100;
  const isOpen = leg.status === "Open";

  return (
    <div className="rounded-lg bg-gray-800/40 px-3 py-2 text-xs">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "w-14 shrink-0 rounded px-1.5 py-0.5 text-center font-medium",
            leg.optionType === "Put"
              ? "bg-purple-500/15 text-purple-400"
              : "bg-blue-500/15 text-blue-400"
          )}
        >
          {leg.optionType === "Put" ? "CSP" : "CC"}
        </span>
        <span className="text-gray-400">
          ${leg.strikePrice} · {formatDateShort(leg.expirationDate)}
        </span>
        <span className="text-gray-500">
          @ ${leg.premiumPerContract.toFixed(2)}
        </span>
        <span
          className={cn(
            "ml-auto font-medium",
            isOpen && "text-gray-300",
            !isOpen && pnl != null && pnl >= 0 && "text-green-400",
            !isOpen && pnl != null && pnl < 0 && "text-red-400"
          )}
        >
          {isOpen
            ? formatCurrency(premium)
            : pnl != null
              ? formatCurrency(pnl)
              : "—"}
        </span>
        <span
          className={cn(
            "w-16 shrink-0 text-center rounded px-1.5 py-0.5",
            isOpen ? "bg-green-500/10 text-green-400" : "bg-gray-700/50 text-gray-500"
          )}
        >
          {isOpen ? "Open" : leg.status}
        </span>
        <button
          onClick={onEdit}
          className="rounded p-1 text-gray-600 hover:text-gray-300 hover:bg-gray-700/50"
          title="Edit leg"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-gray-600 hover:text-red-400 hover:bg-red-500/10"
          title="Delete leg"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {isOpen && (
        <div className="flex gap-1.5 mt-1.5 ml-[4.25rem]">
          <LegActionButton label="Expired" onClick={() => onAction("expire")} />
          <LegActionButton label="Closed" onClick={() => onAction("close")} />
          {leg.optionType === "Put" ? (
            <LegActionButton label="Assigned" onClick={() => onAction("assign")} />
          ) : (
            <LegActionButton label="Called" onClick={() => onAction("called_away")} />
          )}
        </div>
      )}
    </div>
  );
}

function LegActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded px-2 py-0.5 text-[11px] font-medium transition-colors bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
    >
      {label}
    </button>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "green" | "red";
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={cn(
          "text-sm font-semibold",
          color === "green" && "text-green-400",
          color === "red" && "text-red-400",
          !color && "text-gray-200"
        )}
      >
        {value}
      </p>
    </div>
  );
}
