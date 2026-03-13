import { useState } from "react";
import { useAllTrades, addTrade, updateTrade, deleteTrade } from "@/hooks/useTrades";
import { useAccounts } from "@/hooks/useAccounts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TradeTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { TradeForm } from "@/components/trades/TradeForm";
import { TradeTable } from "@/components/trades/TradeTable";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Trade } from "@/db/types";
import { generateId } from "@/lib/utils";

export function TradesPage() {
  const trades = useAllTrades();
  const accounts = useAccounts();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Trade | null>(null);
  const [rollPrefill, setRollPrefill] = useState<Partial<Trade> | null>(null);

  // Confirm dialog state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [rollTarget, setRollTarget] = useState<Trade | null>(null);

  function openAdd() {
    setEditing(null);
    setRollPrefill(null);
    setModalOpen(true);
  }

  function openEdit(trade: Trade) {
    setEditing(trade);
    setRollPrefill(null);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    setDeleteTarget(id);
  }

  async function confirmDelete() {
    if (deleteTarget) {
      await deleteTrade(deleteTarget);
    }
    setDeleteTarget(null);
  }

  function handleRoll(trade: Trade) {
    setRollTarget(trade);
  }

  async function confirmRoll(inputValue?: string) {
    if (!rollTarget || !inputValue) return;

    const closePrice = Number(inputValue);
    const trade = rollTarget;
    setRollTarget(null);

    await updateTrade(trade.id, {
      status: "Rolled",
      closePrice,
      dateClosed: new Date().toISOString().split("T")[0],
    });

    const groupId = trade.groupId ?? generateId();
    if (!trade.groupId) {
      await updateTrade(trade.id, { groupId });
    }

    setRollPrefill({
      groupId,
      ticker: trade.ticker,
      optionType: trade.optionType,
      action: trade.action,
      strategy: trade.strategy,
      underlyingPriceAtEntry: trade.underlyingPriceAtEntry,
      contracts: trade.contracts,
    });
    setEditing(null);
    setModalOpen(true);
  }

  async function handleSubmit(
    data: Omit<Trade, "id" | "createdAt" | "updatedAt">
  ) {
    if (editing) {
      await updateTrade(editing.id, data);
    } else {
      await addTrade(data);
    }
    setModalOpen(false);
    setEditing(null);
    setRollPrefill(null);
  }

  if (!trades) {
    return (
      <div>
        <PageHeader title="Trade Log" />
        <TradeTableSkeleton />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Trade Log"
        action={<Button onClick={openAdd}>+ Add Trade</Button>}
      />

      {trades.length === 0 ? (
        <EmptyState
          title="No trades yet"
          description="Start tracking your options trades."
          action={<Button onClick={openAdd}>Add Your First Trade</Button>}
        />
      ) : (
        <TradeTable
          trades={trades}
          accounts={accounts}
          onEdit={openEdit}
          onDelete={handleDelete}
          onRoll={handleRoll}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setRollPrefill(null);
        }}
        title={
          editing
            ? "Edit Trade"
            : rollPrefill
              ? "Roll Position — New Leg"
              : "Add Trade"
        }
      >
        <TradeForm
          initial={editing ?? rollPrefill ?? undefined}
          accounts={accounts}
          onSubmit={handleSubmit}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
            setRollPrefill(null);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Trade"
        message="Are you sure you want to delete this trade? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        open={rollTarget !== null}
        onClose={() => setRollTarget(null)}
        onConfirm={confirmRoll}
        title="Roll Position"
        message="Enter the close price for the current position before rolling to a new leg."
        confirmLabel="Roll"
        input={{
          label: "Close Price",
          type: "number",
          placeholder: "0.00",
        }}
      />
    </div>
  );
}
