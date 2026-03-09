import { useState } from "react";
import { useAllTrades, addTrade, updateTrade, deleteTrade } from "@/hooks/useTrades";
import { useAccounts } from "@/hooks/useAccounts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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

  async function handleDelete(id: string) {
    if (confirm("Delete this trade?")) {
      await deleteTrade(id);
    }
  }

  async function handleRoll(trade: Trade) {
    const closePrice = prompt("Enter the close price for the current position:");
    if (closePrice === null) return;

    await updateTrade(trade.id, {
      status: "Rolled",
      closePrice: Number(closePrice),
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

  if (!trades) return null;

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
    </div>
  );
}
