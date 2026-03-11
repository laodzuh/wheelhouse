import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { TradeForm } from "@/components/trades/TradeForm";
import { CloseLegForm } from "@/components/wheels/CloseLegForm";
import { TradeTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useAccounts } from "@/hooks/useAccounts";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import type { Trade } from "@/db/types";
import { calculateOptionPnL } from "@/lib/calculations";
import { formatCurrency, formatDateShort, cn, todayISO } from "@/lib/utils";

type ModalState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; trade: Trade }
  | { type: "close"; trade: Trade };

export function CSPPage() {
  const accounts = useAccounts();
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; ticker: string } | null>(null);
  const [expireTarget, setExpireTarget] = useState<Trade | null>(null);
  const [assignTarget, setAssignTarget] = useState<Trade | null>(null);

  // Load all standalone CSP trades (not linked to a wheel)
  const cspTrades = useLiveQuery(() =>
    db.trades
      .where("strategy")
      .equals("Cash Secured Put")
      .filter((t) => !t.positionId)
      .reverse()
      .sortBy("dateOpened")
  );

  const stats = useMemo(() => {
    if (!cspTrades) return null;
    let totalPremium = 0;
    let totalFees = 0;
    let totalPnL = 0;
    let wins = 0;
    let closed = 0;
    let open = 0;

    for (const trade of cspTrades) {
      const premium = trade.premiumPerContract * trade.contracts * 100;
      totalPremium += premium;
      totalFees += trade.fees;

      if (trade.status === "Open") {
        open++;
      } else {
        closed++;
        const pnl = calculateOptionPnL(trade);
        if (pnl != null) {
          totalPnL += pnl;
          if (pnl >= 0) wins++;
        }
      }
    }

    return {
      total: cspTrades.length,
      open,
      closed,
      winRate: closed > 0 ? Math.round((wins / closed) * 100) : 0,
      totalPremium: Math.round(totalPremium * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      totalPnL: Math.round(totalPnL * 100) / 100,
    };
  }, [cspTrades]);

  if (!cspTrades) {
    return (
      <div>
        <PageHeader title="Cash-Secured Puts" />
        <TradeTableSkeleton />
      </div>
    );
  }

  async function handleAdd(data: Omit<Trade, "id" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString();
    await db.trades.add({
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
    setModal({ type: "none" });
  }

  async function handleEdit(data: Omit<Trade, "id" | "createdAt" | "updatedAt">) {
    if (modal.type !== "edit") return;
    await db.trades.update(modal.trade.id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    setModal({ type: "none" });
  }

  async function handleClose(closePrice: number, dateClosed: string) {
    if (modal.type !== "close") return;
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

  async function handleAssign() {
    if (!assignTarget) return;
    await db.trades.update(assignTarget.id, {
      status: "Assigned",
      closePrice: 0,
      dateClosed: todayISO(),
      updatedAt: new Date().toISOString(),
    });
    setAssignTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await db.trades.delete(deleteTarget.id);
    setDeleteTarget(null);
  }

  const openTrades = cspTrades.filter((t) => t.status === "Open");
  const closedTrades = cspTrades.filter((t) => t.status !== "Open");

  return (
    <div>
      <PageHeader
        title="Cash-Secured Puts"
        action={
          <Button onClick={() => setModal({ type: "add" })}>
            + Sell Put
          </Button>
        }
      />

      {cspTrades.length === 0 ? (
        <EmptyState
          title="No cash-secured puts yet"
          description="Sell a cash-secured put to start collecting premium."
          action={
            <Button onClick={() => setModal({ type: "add" })}>
              Sell Your First Put
            </Button>
          }
        />
      ) : (
        <>
          {/* Stats Bar */}
          {stats && (
            <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
              <StatCard label="Total P&L" value={formatCurrency(stats.totalPnL)} color={stats.totalPnL >= 0 ? "green" : "red"} />
              <StatCard label="Win Rate" value={`${stats.winRate}%`} color={stats.winRate >= 50 ? "green" : "red"} />
              <StatCard label="Open" value={String(stats.open)} />
              <StatCard label="Closed" value={String(stats.closed)} />
            </div>
          )}

          <div className="space-y-6">
            {openTrades.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
                  Open ({openTrades.length})
                </h2>
                <div className="space-y-2">
                  {openTrades.map((trade) => (
                    <CSPRow
                      key={trade.id}
                      trade={trade}
                      onClose={() => setModal({ type: "close", trade })}
                      onExpire={() => setExpireTarget(trade)}
                      onAssign={() => setAssignTarget(trade)}
                      onEdit={() => setModal({ type: "edit", trade })}
                      onDelete={() => setDeleteTarget({ id: trade.id, ticker: trade.ticker })}
                    />
                  ))}
                </div>
              </div>
            )}

            {closedTrades.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
                  Closed ({closedTrades.length})
                </h2>
                <div className="space-y-2">
                  {closedTrades.map((trade) => (
                    <CSPRow
                      key={trade.id}
                      trade={trade}
                      onEdit={() => setModal({ type: "edit", trade })}
                      onDelete={() => setDeleteTarget({ id: trade.id, ticker: trade.ticker })}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add CSP */}
      <Modal
        open={modal.type === "add"}
        onClose={() => setModal({ type: "none" })}
        title="Sell Cash-Secured Put"
      >
        <TradeForm
          initial={{
            optionType: "Put",
            action: "Sell to Open",
            strategy: "Cash Secured Put",
            contracts: 1,
          }}
          accounts={accounts}
          onSubmit={handleAdd}
          onCancel={() => setModal({ type: "none" })}
        />
      </Modal>

      {/* Edit CSP */}
      <Modal
        open={modal.type === "edit"}
        onClose={() => setModal({ type: "none" })}
        title="Edit Cash-Secured Put"
      >
        {modal.type === "edit" && (
          <TradeForm
            initial={modal.trade}
            accounts={accounts}
            onSubmit={handleEdit}
            onCancel={() => setModal({ type: "none" })}
          />
        )}
      </Modal>

      {/* Close CSP */}
      <Modal
        open={modal.type === "close"}
        onClose={() => setModal({ type: "none" })}
        title="Close Put"
      >
        {modal.type === "close" && (
          <CloseLegForm
            ticker={modal.trade.ticker}
            strikePrice={modal.trade.strikePrice}
            optionType="Put"
            onSubmit={handleClose}
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
        message={`Mark this ${expireTarget?.ticker ?? ""} $${expireTarget?.strikePrice ?? ""} put as expired? You'll keep the full premium.`}
        confirmLabel="Expire"
      />

      {/* Confirm Assign */}
      <ConfirmDialog
        open={assignTarget !== null}
        onClose={() => setAssignTarget(null)}
        onConfirm={handleAssign}
        title="Mark as Assigned"
        message={`Your ${assignTarget?.ticker ?? ""} $${assignTarget?.strikePrice ?? ""} put was assigned. You'll receive 100 shares at the strike price.`}
        confirmLabel="Confirm Assignment"
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Trade"
        message={`Delete this ${deleteTarget?.ticker ?? ""} cash-secured put? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function CSPRow({
  trade,
  onClose,
  onExpire,
  onAssign,
  onEdit,
  onDelete,
}: {
  trade: Trade;
  onClose?: () => void;
  onExpire?: () => void;
  onAssign?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pnl = calculateOptionPnL(trade);
  const premium = trade.premiumPerContract * trade.contracts * 100;
  const isOpen = trade.status === "Open";

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-3">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-bold text-gray-100 w-16">{trade.ticker}</span>
        <span className="text-gray-400">
          ${trade.strikePrice} · {formatDateShort(trade.expirationDate)}
        </span>
        <span className="text-gray-500">
          @ ${trade.premiumPerContract.toFixed(2)}
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
            "w-20 shrink-0 text-center rounded px-1.5 py-0.5 text-xs",
            isOpen ? "bg-green-500/10 text-green-400" : "bg-gray-700/50 text-gray-500"
          )}
        >
          {isOpen ? "Open" : trade.status}
        </span>
        <button
          onClick={onEdit}
          className="rounded p-1 text-gray-600 hover:text-gray-300 hover:bg-gray-700/50"
          title="Edit"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-gray-600 hover:text-red-400 hover:bg-red-500/10"
          title="Delete"
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
        <div className="flex gap-1.5 mt-2 ml-16">
          <ActionButton label="Expired" onClick={onExpire!} />
          <ActionButton label="Closed" onClick={onClose!} />
          <ActionButton label="Assigned" onClick={onAssign!} />
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
