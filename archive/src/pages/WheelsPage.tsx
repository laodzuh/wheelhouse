import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { WheelCard } from "@/components/wheels/WheelCard";
import { StartWheelForm } from "@/components/wheels/StartWheelForm";
import { WheelLegForm } from "@/components/wheels/WheelLegForm";
import { CloseLegForm } from "@/components/wheels/CloseLegForm";
import { TradeForm } from "@/components/trades/TradeForm";
import { useAccounts } from "@/hooks/useAccounts";
import {
  useWheelPositions,
  startWheel,
  addLegToPosition,
  transitionToHoldingShares,
  completePosition,
  deletePosition,
} from "@/hooks/useWheelPositions";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import type { Trade, Position } from "@/db/types";
import type { LegAction } from "@/components/wheels/WheelCard";
import { calculatePositionStats } from "@/lib/wheelCalculations";
import { TradeTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { todayISO, formatCurrency, cn } from "@/lib/utils";

type ModalState =
  | { type: "none" }
  | { type: "start" }
  | { type: "sell_put"; position: Position }
  | { type: "sell_call"; position: Position }
  | { type: "edit_leg"; trade: Trade }
  | { type: "close_leg"; trade: Trade };

export function WheelsPage() {
  const positions = useWheelPositions();
  const accounts = useAccounts();
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Position | null>(null);
  const [deleteLegTarget, setDeleteLegTarget] = useState<{ id: string; ticker: string } | null>(null);
  const [expireTarget, setExpireTarget] = useState<Trade | null>(null);
  const [assignTarget, setAssignTarget] = useState<Trade | null>(null);
  const [calledAwayTarget, setCalledAwayTarget] = useState<Trade | null>(null);

  // Load all wheel trades in one query
  const allWheelTrades = useLiveQuery(() =>
    db.trades.where("positionId").notEqual("").toArray()
  );

  // Filter to only trades linked to wheel positions
  const wheelTradesByPosition = useMemo(() => {
    const map = new Map<string, Trade[]>();
    if (!allWheelTrades || !positions) return map;
    const wheelIds = new Set(positions.map((p) => p.id));
    for (const trade of allWheelTrades) {
      if (!trade.positionId || !wheelIds.has(trade.positionId)) continue;
      const existing = map.get(trade.positionId) ?? [];
      existing.push(trade);
      map.set(trade.positionId, existing);
    }
    return map;
  }, [allWheelTrades, positions]);

  const stats = useMemo(() => {
    if (!positions || !allWheelTrades) return null;
    let totalPnL = 0;
    let wins = 0;
    let active = 0;
    let completed = 0;

    for (const pos of positions) {
      const legs = wheelTradesByPosition.get(pos.id) ?? [];
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
  }, [positions, allWheelTrades, wheelTradesByPosition]);

  if (!positions || !allWheelTrades) {
    return (
      <div>
        <PageHeader title="Wheels" />
        <TradeTableSkeleton />
      </div>
    );
  }

  const activePositions = positions.filter((p) => p.phase !== "completed");
  const completedPositions = positions.filter((p) => p.phase === "completed");

  async function handleStartWheel(data: { ticker: string; accountId: string | null }) {
    await startWheel(data);
    setModal({ type: "none" });
  }

  async function handleAddLeg(
    positionId: string,
    data: Omit<Trade, "id" | "createdAt" | "updatedAt" | "positionId">
  ) {
    await addLegToPosition(positionId, data);
    setModal({ type: "none" });
  }

  function handleLegAction(action: LegAction, trade: Trade) {
    switch (action) {
      case "expire":
        setExpireTarget(trade);
        break;
      case "close":
        setModal({ type: "close_leg", trade });
        break;
      case "assign":
        setAssignTarget(trade);
        break;
      case "called_away":
        setCalledAwayTarget(trade);
        break;
    }
  }

  async function handleExpireLeg() {
    if (!expireTarget) return;
    await db.trades.update(expireTarget.id, {
      status: "Expired",
      closePrice: 0,
      dateClosed: todayISO(),
      updatedAt: new Date().toISOString(),
    });
    setExpireTarget(null);
  }

  async function handleCloseLeg(closePrice: number, dateClosed: string) {
    if (modal.type !== "close_leg") return;
    const trade = modal.trade;
    const premiumPerContract = trade.premiumPerContract;

    let status: Trade["status"];
    if (trade.action === "Sell to Open") {
      status = premiumPerContract > closePrice ? "Closed (Win)" : "Closed (Loss)";
    } else {
      status = closePrice > premiumPerContract ? "Closed (Win)" : "Closed (Loss)";
    }

    await db.trades.update(trade.id, {
      status,
      closePrice,
      dateClosed,
      updatedAt: new Date().toISOString(),
    });
    setModal({ type: "none" });
  }

  async function handleAssignLeg() {
    if (!assignTarget || !assignTarget.positionId) return;
    const today = todayISO();

    await db.trades.update(assignTarget.id, {
      status: "Assigned",
      closePrice: 0,
      dateClosed: today,
      updatedAt: new Date().toISOString(),
    });

    await transitionToHoldingShares(
      assignTarget.positionId,
      assignTarget.strikePrice
    );
    setAssignTarget(null);
  }

  async function handleCalledAwayLeg() {
    if (!calledAwayTarget || !calledAwayTarget.positionId) return;
    const today = todayISO();

    await db.trades.update(calledAwayTarget.id, {
      status: "Assigned",
      closePrice: 0,
      dateClosed: today,
      updatedAt: new Date().toISOString(),
    });

    await completePosition(
      calledAwayTarget.positionId,
      calledAwayTarget.strikePrice
    );
    setCalledAwayTarget(null);
  }

  async function handleComplete() {
    if (!completeTarget) return;
    await completePosition(completeTarget.id);
    setCompleteTarget(null);
  }

  async function handleDelete() {
    if (deleteTarget) {
      await deletePosition(deleteTarget);
    }
    setDeleteTarget(null);
  }

  async function handleEditLeg(data: Omit<Trade, "id" | "createdAt" | "updatedAt">) {
    if (modal.type !== "edit_leg") return;
    await db.trades.update(modal.trade.id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    setModal({ type: "none" });
  }

  async function handleDeleteLeg() {
    if (!deleteLegTarget) return;
    await db.trades.delete(deleteLegTarget.id);
    setDeleteLegTarget(null);
  }

  return (
    <div>
      <PageHeader
        title="Wheels"
        action={
          <Button onClick={() => setModal({ type: "start" })}>
            + Start New Wheel
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
          title="No wheel positions yet"
          description="Start the wheel by selling a cash-secured put."
          action={
            <Button onClick={() => setModal({ type: "start" })}>
              Start Your First Wheel
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
                  const legs = wheelTradesByPosition.get(pos.id) ?? [];
                  const stats = calculatePositionStats(pos, legs);
                  return (
                    <WheelCard
                      key={pos.id}
                      stats={stats}
                      onSellPut={() => setModal({ type: "sell_put", position: pos })}
                      onSellCall={() => setModal({ type: "sell_call", position: pos })}
                      onComplete={() => setCompleteTarget(pos)}
                      onLegAction={handleLegAction}
                      onEditLeg={(trade) => setModal({ type: "edit_leg", trade })}
                      onDeleteLeg={(tradeId) => {
                        const trade = allWheelTrades?.find((t) => t.id === tradeId);
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
                  const legs = wheelTradesByPosition.get(pos.id) ?? [];
                  const stats = calculatePositionStats(pos, legs);
                  return (
                    <WheelCard
                      key={pos.id}
                      stats={stats}
                      onSellPut={() => {}}
                      onSellCall={() => {}}
                      onComplete={() => {}}
                      onLegAction={handleLegAction}
                      onEditLeg={(trade) => setModal({ type: "edit_leg", trade })}
                      onDeleteLeg={(tradeId) => {
                        const trade = allWheelTrades?.find((t) => t.id === tradeId);
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

      {/* Start New Wheel */}
      <Modal
        open={modal.type === "start"}
        onClose={() => setModal({ type: "none" })}
        title="Start New Wheel"
      >
        <StartWheelForm
          accounts={accounts}
          onSubmit={handleStartWheel}
          onCancel={() => setModal({ type: "none" })}
        />
      </Modal>

      {/* Sell Put Leg */}
      <Modal
        open={modal.type === "sell_put"}
        onClose={() => setModal({ type: "none" })}
        title="Sell Cash-Secured Put"
      >
        {modal.type === "sell_put" && (
          <WheelLegForm
            position={modal.position}
            legType="put"
            onSubmit={(data) => handleAddLeg(modal.position.id, data)}
            onCancel={() => setModal({ type: "none" })}
          />
        )}
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
        title="Close Leg"
      >
        {modal.type === "close_leg" && (
          <CloseLegForm
            ticker={modal.trade.ticker}
            strikePrice={modal.trade.strikePrice}
            optionType={modal.trade.optionType}
            onSubmit={handleCloseLeg}
            onCancel={() => setModal({ type: "none" })}
          />
        )}
      </Modal>

      {/* Edit Leg */}
      <Modal
        open={modal.type === "edit_leg"}
        onClose={() => setModal({ type: "none" })}
        title="Edit Trade Leg"
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

      {/* Confirm Expire Leg */}
      <ConfirmDialog
        open={expireTarget !== null}
        onClose={() => setExpireTarget(null)}
        onConfirm={handleExpireLeg}
        title="Mark as Expired"
        message={`Mark this ${expireTarget?.ticker ?? ""} $${expireTarget?.strikePrice ?? ""} ${expireTarget?.optionType === "Put" ? "put" : "call"} as expired? You'll keep the full premium.`}
        confirmLabel="Expire"
      />

      {/* Confirm Assign Leg */}
      <ConfirmDialog
        open={assignTarget !== null}
        onClose={() => setAssignTarget(null)}
        onConfirm={handleAssignLeg}
        title="Mark as Assigned"
        message={`Your ${assignTarget?.ticker ?? ""} $${assignTarget?.strikePrice ?? ""} put was assigned. You'll receive 100 shares and transition to selling covered calls.`}
        confirmLabel="Confirm Assignment"
      />

      {/* Confirm Called Away Leg */}
      <ConfirmDialog
        open={calledAwayTarget !== null}
        onClose={() => setCalledAwayTarget(null)}
        onConfirm={handleCalledAwayLeg}
        title="Shares Called Away"
        message={`Your ${calledAwayTarget?.ticker ?? ""} $${calledAwayTarget?.strikePrice ?? ""} call was exercised. Shares will be sold and the wheel will be completed.`}
        confirmLabel="Complete Wheel"
      />

      {/* Confirm Complete */}
      <ConfirmDialog
        open={completeTarget !== null}
        onClose={() => setCompleteTarget(null)}
        onConfirm={handleComplete}
        title="Complete Wheel"
        message={`Mark your ${completeTarget?.ticker ?? ""} wheel as complete? To wheel this ticker again, start a new wheel.`}
        confirmLabel="Complete"
      />

      {/* Confirm Delete Position */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Wheel Position"
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
