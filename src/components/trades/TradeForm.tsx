import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  OPTION_TYPES,
  ACTIONS,
  STATUSES,
  STRATEGIES,
  type Trade,
  type Account,
} from "@/db/types";
import { todayISO } from "@/lib/utils";

interface TradeFormProps {
  initial?: Partial<Trade>;
  accounts?: Account[];
  onSubmit: (data: Omit<Trade, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

export function TradeForm({ initial, accounts, onSubmit, onCancel }: TradeFormProps) {
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [optionType, setOptionType] = useState(initial?.optionType ?? "Call");
  const [action, setAction] = useState(initial?.action ?? "Sell to Open");
  const [strikePrice, setStrikePrice] = useState(
    initial?.strikePrice?.toString() ?? ""
  );
  const [expirationDate, setExpirationDate] = useState(
    initial?.expirationDate ?? ""
  );
  const [contracts, setContracts] = useState(
    initial?.contracts?.toString() ?? "1"
  );
  const [premiumPerContract, setPremiumPerContract] = useState(
    initial?.premiumPerContract?.toString() ?? ""
  );
  const [closePrice, setClosePrice] = useState(
    initial?.closePrice?.toString() ?? ""
  );
  const [underlyingPriceAtEntry, setUnderlyingPriceAtEntry] = useState(
    initial?.underlyingPriceAtEntry?.toString() ?? ""
  );
  const [underlyingPriceAtExit, setUnderlyingPriceAtExit] = useState(
    initial?.underlyingPriceAtExit?.toString() ?? ""
  );
  const [fees, setFees] = useState(initial?.fees?.toString() ?? "0");
  const [strategy, setStrategy] = useState(initial?.strategy ?? "Covered Call");
  const [status, setStatus] = useState(initial?.status ?? "Open");
  const [dateOpened, setDateOpened] = useState(
    initial?.dateOpened ?? todayISO()
  );
  const [dateClosed, setDateClosed] = useState(initial?.dateClosed ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [groupId] = useState(initial?.groupId ?? null);
  const [accountId, setAccountId] = useState(initial?.accountId ?? "");

  // Assignment fields
  const [assignedShares, setAssignedShares] = useState(
    initial?.assignedShares?.toString() ?? ""
  );
  const [assignedCostBasis, setAssignedCostBasis] = useState(
    initial?.assignedCostBasis?.toString() ?? ""
  );
  const [sharesSoldPrice, setSharesSoldPrice] = useState(
    initial?.sharesSoldPrice?.toString() ?? ""
  );
  const [sharesSoldDate, setSharesSoldDate] = useState(
    initial?.sharesSoldDate ?? ""
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const isAssigned = status === "Assigned";

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!ticker.trim()) errs.ticker = "Required";
    if (!strikePrice || Number(strikePrice) <= 0) errs.strikePrice = "Must be positive";
    if (!expirationDate) errs.expirationDate = "Required";
    if (!contracts || Number(contracts) <= 0) errs.contracts = "Must be positive";
    if (!premiumPerContract || Number(premiumPerContract) < 0)
      errs.premiumPerContract = "Required";
    if (!underlyingPriceAtEntry || Number(underlyingPriceAtEntry) <= 0)
      errs.underlyingPriceAtEntry = "Must be positive";
    if (!dateOpened) errs.dateOpened = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const sharesNum = assignedShares ? Number(assignedShares) : null;
    const costBasis = assignedCostBasis ? Number(assignedCostBasis) : null;
    const soldPrice = sharesSoldPrice ? Number(sharesSoldPrice) : null;
    let sharesPnL: number | null = null;
    if (isAssigned && sharesNum && costBasis && soldPrice) {
      sharesPnL = (soldPrice - costBasis) * sharesNum;
    }

    onSubmit({
      groupId,
      dateOpened,
      dateClosed: dateClosed || null,
      ticker: ticker.toUpperCase().trim(),
      optionType,
      action,
      strikePrice: Number(strikePrice),
      expirationDate,
      contracts: Number(contracts),
      premiumPerContract: Number(premiumPerContract),
      closePrice: closePrice ? Number(closePrice) : null,
      underlyingPriceAtEntry: Number(underlyingPriceAtEntry),
      underlyingPriceAtExit: underlyingPriceAtExit
        ? Number(underlyingPriceAtExit)
        : null,
      fees: Number(fees),
      strategy,
      notes,
      status,
      assignedShares: isAssigned ? sharesNum : null,
      assignedCostBasis: isAssigned ? costBasis : null,
      sharesSoldPrice: isAssigned ? soldPrice : null,
      sharesSoldDate: isAssigned && sharesSoldDate ? sharesSoldDate : null,
      sharesPnL: isAssigned ? sharesPnL : null,
      accountId: accountId || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {accounts && accounts.length > 0 && (
        <Select
          label="Account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          options={[
            { value: "", label: "No Account" },
            ...accounts.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Ticker"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="AAPL"
          error={errors.ticker}
        />
        <Select
          label="Strategy"
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          options={STRATEGIES.map((s) => s)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Option Type"
          value={optionType}
          onChange={(e) => setOptionType(e.target.value as typeof optionType)}
          options={OPTION_TYPES.map((t) => t)}
        />
        <Select
          label="Action"
          value={action}
          onChange={(e) => setAction(e.target.value as typeof action)}
          options={ACTIONS.map((a) => a)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Strike Price"
          type="number"
          step="0.01"
          value={strikePrice}
          onChange={(e) => setStrikePrice(e.target.value)}
          error={errors.strikePrice}
        />
        <Input
          label="Expiration"
          type="date"
          value={expirationDate}
          onChange={(e) => setExpirationDate(e.target.value)}
          error={errors.expirationDate}
        />
        <Input
          label="Contracts"
          type="number"
          min="1"
          value={contracts}
          onChange={(e) => setContracts(e.target.value)}
          error={errors.contracts}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Premium / Contract"
          type="number"
          step="0.01"
          value={premiumPerContract}
          onChange={(e) => setPremiumPerContract(e.target.value)}
          error={errors.premiumPerContract}
        />
        <Input
          label="Close Price"
          type="number"
          step="0.01"
          value={closePrice}
          onChange={(e) => setClosePrice(e.target.value)}
          placeholder="Leave blank if open"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Underlying @ Entry"
          type="number"
          step="0.01"
          value={underlyingPriceAtEntry}
          onChange={(e) => setUnderlyingPriceAtEntry(e.target.value)}
          error={errors.underlyingPriceAtEntry}
        />
        <Input
          label="Underlying @ Exit"
          type="number"
          step="0.01"
          value={underlyingPriceAtExit}
          onChange={(e) => setUnderlyingPriceAtExit(e.target.value)}
          placeholder="Leave blank if open"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Fees"
          type="number"
          step="0.01"
          value={fees}
          onChange={(e) => setFees(e.target.value)}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          options={STATUSES.map((s) => s)}
        />
        <Input
          label="Date Opened"
          type="date"
          value={dateOpened}
          onChange={(e) => setDateOpened(e.target.value)}
          error={errors.dateOpened}
        />
      </div>

      {status !== "Open" && (
        <Input
          label="Date Closed"
          type="date"
          value={dateClosed}
          onChange={(e) => setDateClosed(e.target.value)}
        />
      )}

      {isAssigned && (
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-4">
          <h3 className="text-sm font-medium text-purple-400">
            Assignment Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Assigned Shares"
              type="number"
              value={assignedShares}
              onChange={(e) => setAssignedShares(e.target.value)}
              placeholder={`${Number(contracts) * 100}`}
            />
            <Input
              label="Cost Basis / Share"
              type="number"
              step="0.01"
              value={assignedCostBasis}
              onChange={(e) => setAssignedCostBasis(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Shares Sold Price"
              type="number"
              step="0.01"
              value={sharesSoldPrice}
              onChange={(e) => setSharesSoldPrice(e.target.value)}
            />
            <Input
              label="Shares Sold Date"
              type="date"
              value={sharesSoldDate}
              onChange={(e) => setSharesSoldDate(e.target.value)}
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Trade notes..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initial?.id ? "Update Trade" : "Add Trade"}
        </Button>
      </div>
    </form>
  );
}
