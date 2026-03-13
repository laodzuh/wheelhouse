import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { WheelLegForm } from "@/components/wheels/WheelLegForm";
import { CloseLegForm } from "@/components/wheels/CloseLegForm";
import { TradeForm } from "@/components/trades/TradeForm";
import { TradeTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useAccounts } from "@/hooks/useAccounts";
import {
  useCCPositions,
  startCCPosition,
  addLegToPosition,
  completePosition,
  deletePosition,
} from "@/hooks/useWheelPositions";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import type { Trade, Position } from "@/db/types";
import { calculateOptionPnL } from "@/lib/calculations";
import { calculatePositionStats } from "@/lib/wheelCalculations";
import { formatCurrency, formatDateShort, cn, todayISO } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Account } from "@/db/types";

type ModalState =
  | { type: "none" }
  | { type: "start" }
  | { type: "sell_call"; position: Position }
  | { type: "edit_leg"; trade: Trade }
  | { type: "close_leg"; trade: Trade };

export function CoveredCallsPage() {
  const positions = useCCPositions();
  const accounts = useAccounts();
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Position | null>(null);
  const [deleteLegTarget, setDeleteLegTarget] = useState<{ id: string; ticker: string } | null>(null);
  const [expireTarget, setExpireTarget] = useState<Trade | null>(null);
  const [calledAwayTarget, setCalledAwayTarget] = useState<Trade | null>(null);

  // Load all trades linked to CC positions
  const allCCTrades = useLiveQuery(() =>
    db.trades.where("positionId").notEqual("").toArray()
  );

  const tradesByPosition = useMemo(() => {
    const map = new Map<string, Trade[]>();
    if (!allCCTrades || !positions) return map;
    const ccIds = new Set(positions.map((p) => p.id));
    for (const trade of allCCTrades) {
      if (!trade.positionId || !ccIds.has(trade.positionId)) continue;
      const existing = map.get(trade.positionId) ?? [];
      existing.push(trade);
      map.set(trade.positionId, existing);
    }
    return map;
  }, [allCCTrades, positions]);

  const stats = useMemo(() => {
    if (!positions || !allCCTrades) return null;
    let totalPnL = 0;
    let wins = 0;
    let active = 0;
    let completed = 0;

    for (const pos of positions) {
      const legs = tradesByPosition.get(pos.id) ?? [];
      const posStats = calculatePositionStats(pos, legs);
      totalPnL += posStats.totalPnL;

      if (pos.phase === "completed") {
        completed++;
        if (posStats.totalPnL >= 0) wins++;
      } else {
        active++;
      }
    }

    return {
      totalPnL: Math.round(totalPnL * 100) / 100,
      winRate: completed > 0 ? Math.round((wins / completed) * 100) : 0,
      active,
      completed,
    };
  }, [positions, allCCTrades, tradesByPosition]);

  if (!positions || !allCCTrades) {
    return (
      <div>
        <PageHeader title="Covered Calls" />
        <TradeTableSkeleton />
      </div>
    );
  }

  const activePositions = positions.filter((p) => p.phase !== "completed");
  const completedPositions = positions.filter((p) => p.phase === "completed");

  async function handleStart(data: { ticker: string; shareCostBasis: number; accountId: string | null }) {
    await startCCPosition({
      ticker: data.ticker,
      shareCostBasis: data.shareCostBasis,
      accountId: data.accountId,
    });
    setModal({ type: "none" });
  }

  async function handleAddLeg(
    positionId: string,
    data: Omit<Trade, "id" | "createdAt" | "updatedAt" | "positionId">
  ) {
    await addLegToPosition(positionId, data);
    setModal({ type: "none" });
  }

  async function handleEditLeg(data: Omit<Trade, "id" | "createdAt" | "updatedAt">) {
    if (modal.type !== "edit_leg") return;
    await db.trades.update(modal.trade.id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    setModal({ type: "none" });
  }

  async function handleCloseLeg(closePrice: number, dateClosed: string) {
    if (modal.type !== "close_leg") return;
    const trade = modal.trade;
    const status: Trade["status"] =
      trade.premiumPerContract > closePrice ? "Closed (Win)" : "Closed (Loss)";
    await db.trades.update(trade.id, {
      status,
      closePrice,
      dateClosed,
      updatedAt: new Date().toISOString(),
    });
    setModal({ type: "none" });
  }

  async function handleExpire() {
    if (!expireTarget) return;
    await db.trades.update(expireTarget.id, {
      status: "Expired",
      closePrice: 0,
      dateClosed: todayISO(),
      updatedAt: new Date().toISOString(),
    });
    setExpireTarget(null);
  }

  async function handleCalledAway() {
    if (!calledAwayTarget || !calledAwayTarget.positionId) return;
    await db.trades.update(calledAwayTarget.id, {
      status: "Assigned",
      closePrice: 0,
      dateClosed: todayISO(),
      updatedAt: new Date().toISOString(),
    });
    await completePosition(calledAwayTarget.positionId, calledAwayTarget.strikePrice);
    setCalledAwayTarget(null);
  }

  async function handleComplete() {
    if (!completeTarget) return;
    await completePosition(completeTarget.id);
    setCompleteTarget(null);
  }

  async function handleDelete() {
    if (deleteTarget) await deletePosition(deleteTarget);
    setDeleteTarget(null);
  }

  async function handleDeleteLeg() {
    if (!deleteLegTarget) return;
    await db.trades.delete(deleteLegTarget.id);
    setDeleteLegTarget(null);
  }

  return (
    <div>
      <PageHeader
        title="Covered Calls"
        action={
          <Button onClick={() => setModal({ type: "start" })}>
            + New Position
          </Button>
        }
      />

      {stats && positions.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
          <StatCard label="Total P&L" value={formatCurrency(stats.totalPnL)} color={stats.totalPnL >= 0 ? "green" : "red"} />
          <StatCard label="Win Rate" value={`${stats.winRate}%`} color={stats.winRate >= 50 ? "green" : "red"} />
          <StatCard label="Active" value={String(stats.active)} />
          <StatCard label="Completed" value={String(stats.completed)} />
        </div>
      )}

      {positions.length === 0 ? (
        <EmptyState
          title="No covered call positions yet"
          description="Start selling covered calls against 100 shares you own."
          action={
            <Button onClick={() => setModal({ type: "start" })}>
              Start Selling Calls
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {activePositions.length > 0 && (
            <div>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500">
                Active ({activePositions.length})
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {activePositions.map((pos) => {
                  const legs = tradesByPosition.get(pos.id) ?? [];
                  const stats = calculatePositionStats(pos, legs);
                  return (
                    <CCCard
                      key={pos.id}
                      stats={stats}
                      onSellCall={() => setModal({ type: "sell_call", position: pos })}
                      onComplete={() => setCompleteTarget(pos)}
                      onClose={(trade) => setModal({ type: "close_leg", trade })}
                      onExpire={(trade) => setExpireTarget(trade)}
                      onCalledAway={(trade) => setCalledAwayTarget(trade)}
                      onEdit={(trade) => setModal({ type: "edit_leg", trade })}
                      onDeleteLeg={(tradeId) => {
                        const trade = allCCTrades?.find((t) => t.id === tradeId);
                        setDeleteLegTarget({ id: tradeId, ticker: trade?.ticker ?? "" });
                      }}
                      onDelete={() => setDeleteTarget(pos.id)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {completedPositions.length > 0 && (
            <div>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500">
                Completed ({completedPositions.length})
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {completedPositions.map((pos) => {
                  const legs = tradesByPosition.get(pos.id) ?? [];
                  const stats = calculatePositionStats(pos, legs);
                  return (
                    <CCCard
                      key={pos.id}
                      stats={stats}
                      onSellCall={() => {}}
                      onComplete={() => {}}
                      onClose={(trade) => setModal({ type: "close_leg", trade })}
                      onExpire={(trade) => setExpireTarget(trade)}
                      onCalledAway={(trade) => setCalledAwayTarget(trade)}
                      onEdit={(trade) => setModal({ type: "edit_leg", trade })}
                      onDeleteLeg={(tradeId) => {
                        const trade = allCCTrades?.find((t) => t.id === tradeId);
                        setDeleteLegTarget({ id: tradeId, ticker: trade?.ticker ?? "" });
                      }}
                      onDelete={() => setDeleteTarget(pos.id)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Start New CC Position */}
      <Modal
        open={modal.type === "start"}
        onClose={() => setModal({ type: "none" })}
        title="New Covered Call Position"
      >
        <StartCCForm
          accounts={accounts}
          onSubmit={handleStart}
          onCancel={() => setModal({ type: "none" })}
        />
      </Modal>

      {/* Sell Call Leg */}
      <Modal
        open={modal.type === "sell_call"}
        onClose={() => setModal({ type: "none" })}
        title="Sell Covered Call"
      >
        {modal.type === "sell_call" && (
          <WheelLegForm
            position={modal.position}
            legType="call"
            onSubmit={(data) => handleAddLeg(modal.position.id, data)}
            onCancel={() => setModal({ type: "none" })}
          />
        )}
      </Modal>

      {/* Close Leg */}
      <Modal
        open={modal.type === "close_leg"}
        onClose={() => setModal({ type: "none" })}
        title="Close Call"
      >
        {modal.type === "close_leg" && (
          <CloseLegForm
            ticker={modal.trade.ticker}
            strikePrice={modal.trade.strikePrice}
            optionType="Call"
            onSubmit={handleCloseLeg}
            onCancel={() => setModal({ type: "none" })}
          />
        )}
      </Modal>

      {/* Edit Leg */}
      <Modal
        open={modal.type === "edit_leg"}
        onClose={() => setModal({ type: "none" })}
        title="Edit Covered Call"
      >
        {modal.type === "edit_leg" && (
          <TradeForm
            initial={modal.trade}
            accounts={accounts}
            onSubmit={handleEditLeg}
            onCancel={() => setModal({ type: "none" })}
          />
        )}
      </Modal>

      {/* Confirm Expire */}
      <ConfirmDialog
        open={expireTarget !== null}
        onClose={() => setExpireTarget(null)}
        onConfirm={handleExpire}
        title="Mark as Expired"
        message={`Mark this ${expireTarget?.ticker ?? ""} $${expireTarget?.strikePrice ?? ""} call as expired? You'll keep the full premium.`}
        confirmLabel="Expire"
      />

      {/* Confirm Called Away */}
      <ConfirmDialog
        open={calledAwayTarget !== null}
        onClose={() => setCalledAwayTarget(null)}
        onConfirm={handleCalledAway}
        title="Shares Called Away"
        message={`Your ${calledAwayTarget?.ticker ?? ""} $${calledAwayTarget?.strikePrice ?? ""} call was exercised. Shares sold at the strike price. Position will be completed.`}
        confirmLabel="Complete Position"
      />

      {/* Confirm Complete */}
      <ConfirmDialog
        open={completeTarget !== null}
        onClose={() => setCompleteTarget(null)}
        onConfirm={handleComplete}
        title="Complete Position"
        message={`Mark your ${completeTarget?.ticker ?? ""} covered call position as complete?`}
        confirmLabel="Complete"
      />

      {/* Confirm Delete Position */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Position"
        message="Are you sure? Trade legs linked to this position will be unlinked but not deleted."
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Confirm Delete Leg */}
      <ConfirmDialog
        open={deleteLegTarget !== null}
        onClose={() => setDeleteLegTarget(null)}
        onConfirm={handleDeleteLeg}
        title="Delete Trade Leg"
        message={`Delete this ${deleteLegTarget?.ticker ?? ""} trade leg? This cannot be undone.`}
        confirmLabel="Delete Leg"
        variant="danger"
      />
    </div>
  );
}

// --- CC Position Card ---

import type { PositionStats } from "@/lib/wheelCalculations";

function CCCard({
  stats,
  onSellCall,
  onComplete,
  onClose,
  onExpire,
  onCalledAway,
  onEdit,
  onDeleteLeg,
  onDelete,
}: {
  stats: PositionStats;
  onSellCall: () => void;
  onComplete: () => void;
  onClose: (trade: Trade) => void;
  onExpire: (trade: Trade) => void;
  onCalledAway: (trade: Trade) => void;
  onEdit: (trade: Trade) => void;
  onDeleteLeg: (tradeId: string) => void;
  onDelete: () => void;
}) {
  const { position, legs, netOptionIncome, netCostBasis, sharesPnL, totalPnL, daysActive, callLegs } = stats;
  const [expanded, setExpanded] = useState(true);

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-100">{position.ticker}</h3>
          <p className="text-xs text-gray-500">100 shares</p>
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
        {position.shareCostBasis != null && (
          <Metric label="Cost Basis" value={formatCurrency(position.shareCostBasis)} />
        )}
        {netCostBasis != null && (
          <Metric label="Net Cost Basis" value={formatCurrency(netCostBasis)} />
        )}
        {sharesPnL !== 0 && (
          <Metric label="Shares P&L" value={formatCurrency(sharesPnL)} color={sharesPnL >= 0 ? "green" : "red"} />
        )}
        {position.soldPrice != null && (
          <Metric label="Sold Price" value={formatCurrency(position.soldPrice)} />
        )}
        <Metric label="Days" value={`${daysActive}d`} />
        <Metric label="Calls Sold" value={String(callLegs)} />
      </div>

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
              {[...legs].sort((a, b) => b.dateOpened.localeCompare(a.dateOpened)).map((leg) => (
                <LegRow
                  key={leg.id}
                  leg={leg}
                  onClose={() => onClose(leg)}
                  onExpire={() => onExpire(leg)}
                  onCalledAway={() => onCalledAway(leg)}
                  onEdit={() => onEdit(leg)}
                  onDelete={() => onDeleteLeg(leg.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {position.phase !== "completed" && (
          <>
            <Button variant="secondary" onClick={onSellCall}>
              Sell Call
            </Button>
            <Button variant="secondary" onClick={onComplete}>
              Complete
            </Button>
          </>
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
  onClose,
  onExpire,
  onCalledAway,
  onEdit,
  onDelete,
}: {
  leg: Trade;
  onClose: () => void;
  onExpire: () => void;
  onCalledAway: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pnl = calculateOptionPnL(leg);
  const premium = leg.premiumPerContract * leg.contracts * 100;
  const isOpen = leg.status === "Open";

  return (
    <div className="rounded-lg bg-gray-800/40 px-3 py-2 text-xs">
      <div className="flex items-center gap-3">
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
          {isOpen ? formatCurrency(premium) : pnl != null ? formatCurrency(pnl) : "—"}
        </span>
        <span
          className={cn(
            "w-16 shrink-0 text-center rounded px-1.5 py-0.5",
            isOpen ? "bg-green-500/10 text-green-400" : "bg-gray-700/50 text-gray-500"
          )}
        >
          {isOpen ? "Open" : leg.status}
        </span>
        <button onClick={onEdit} className="rounded p-1 text-gray-600 hover:text-gray-300 hover:bg-gray-700/50" title="Edit">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button onClick={onDelete} className="rounded p-1 text-gray-600 hover:text-red-400 hover:bg-red-500/10" title="Delete">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {isOpen && (
        <div className="flex gap-1.5 mt-1.5">
          <ActionButton label="Expired" onClick={onExpire} />
          <ActionButton label="Closed" onClick={onClose} />
          <ActionButton label="Called" onClick={onCalledAway} />
        </div>
      )}
    </div>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded px-2 py-0.5 text-[11px] font-medium transition-colors bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
    >
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "green" | "red";
}) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={cn(
          "text-lg font-bold",
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

function Metric({ label, value, color }: { label: string; value: string; color?: "green" | "red" }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn("text-sm font-semibold", color === "green" && "text-green-400", color === "red" && "text-red-400", !color && "text-gray-200")}>
        {value}
      </p>
    </div>
  );
}

// --- Start CC Form ---

function StartCCForm({
  accounts,
  onSubmit,
  onCancel,
}: {
  accounts?: Account[];
  onSubmit: (data: { ticker: string; shareCostBasis: number; accountId: string | null }) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ ticker: string; shareCostBasis: string; accountId: string }>({
    defaultValues: { ticker: "", shareCostBasis: "", accountId: "" },
  });

  return (
    <form
      onSubmit={handleSubmit((data) =>
        onSubmit({
          ticker: data.ticker,
          shareCostBasis: Number(data.shareCostBasis),
          accountId: data.accountId || null,
        })
      )}
      className="space-y-4"
    >
      <p className="text-sm text-gray-400">
        Enter the ticker and your cost basis per share for the 100 shares you own.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Ticker"
          placeholder="AAPL"
          error={errors.ticker?.message}
          {...register("ticker", { required: "Required" })}
        />
        <Input
          label="Cost Basis / Share"
          type="number"
          step="0.01"
          placeholder="What you paid per share"
          error={errors.shareCostBasis?.message}
          {...register("shareCostBasis", {
            required: "Required",
            validate: (v) => Number(v) > 0 || "Must be positive",
          })}
        />
      </div>
      {accounts && accounts.length > 0 && (
        <Select
          label="Account"
          {...register("accountId")}
          options={[
            { value: "", label: "No Account" },
            ...accounts.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Position</Button>
      </div>
    </form>
  );
}
