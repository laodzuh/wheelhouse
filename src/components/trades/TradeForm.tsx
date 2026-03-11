import { useForm } from "react-hook-form";
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

interface FormValues {
  ticker: string;
  optionType: string;
  action: string;
  strikePrice: string;
  expirationDate: string;
  contracts: string;
  premiumPerContract: string;
  closePrice: string;
  underlyingPriceAtEntry: string;
  underlyingPriceAtExit: string;
  fees: string;
  strategy: string;
  status: string;
  dateOpened: string;
  dateClosed: string;
  notes: string;
  accountId: string;
  assignedShares: string;
  assignedCostBasis: string;
  sharesSoldPrice: string;
  sharesSoldDate: string;
}

export function TradeForm({ initial, accounts, onSubmit, onCancel }: TradeFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      ticker: initial?.ticker ?? "",
      optionType: initial?.optionType ?? "Call",
      action: initial?.action ?? "Sell to Open",
      strikePrice: initial?.strikePrice?.toString() ?? "",
      expirationDate: initial?.expirationDate ?? "",
      contracts: initial?.contracts?.toString() ?? "1",
      premiumPerContract: initial?.premiumPerContract?.toString() ?? "",
      closePrice: initial?.closePrice?.toString() ?? "",
      underlyingPriceAtEntry: initial?.underlyingPriceAtEntry?.toString() ?? "",
      underlyingPriceAtExit: initial?.underlyingPriceAtExit?.toString() ?? "",
      fees: initial?.fees?.toString() ?? "0",
      strategy: initial?.strategy ?? "Covered Call",
      status: initial?.status ?? "Open",
      dateOpened: initial?.dateOpened ?? todayISO(),
      dateClosed: initial?.dateClosed ?? "",
      notes: initial?.notes ?? "",
      accountId: initial?.accountId ?? "",
      assignedShares: initial?.assignedShares?.toString() ?? "",
      assignedCostBasis: initial?.assignedCostBasis?.toString() ?? "",
      sharesSoldPrice: initial?.sharesSoldPrice?.toString() ?? "",
      sharesSoldDate: initial?.sharesSoldDate ?? "",
    },
  });

  const status = watch("status");
  const contracts = watch("contracts");
  const isAssigned = status === "Assigned";

  function onValid(data: FormValues) {
    const sharesNum = data.assignedShares ? Number(data.assignedShares) : null;
    const costBasis = data.assignedCostBasis ? Number(data.assignedCostBasis) : null;
    const soldPrice = data.sharesSoldPrice ? Number(data.sharesSoldPrice) : null;
    let sharesPnL: number | null = null;
    if (isAssigned && sharesNum && costBasis && soldPrice) {
      sharesPnL = (soldPrice - costBasis) * sharesNum;
    }

    onSubmit({
      groupId: initial?.groupId ?? null,
      dateOpened: data.dateOpened,
      dateClosed: data.dateClosed || null,
      ticker: data.ticker.toUpperCase().trim(),
      optionType: data.optionType as Trade["optionType"],
      action: data.action as Trade["action"],
      strikePrice: Number(data.strikePrice),
      expirationDate: data.expirationDate,
      contracts: Number(data.contracts),
      premiumPerContract: Number(data.premiumPerContract),
      closePrice: data.closePrice ? Number(data.closePrice) : null,
      underlyingPriceAtEntry: Number(data.underlyingPriceAtEntry),
      underlyingPriceAtExit: data.underlyingPriceAtExit
        ? Number(data.underlyingPriceAtExit)
        : null,
      fees: Number(data.fees),
      strategy: data.strategy,
      notes: data.notes,
      status: data.status as Trade["status"],
      assignedShares: isAssigned ? sharesNum : null,
      assignedCostBasis: isAssigned ? costBasis : null,
      sharesSoldPrice: isAssigned ? soldPrice : null,
      sharesSoldDate: isAssigned && data.sharesSoldDate ? data.sharesSoldDate : null,
      sharesPnL: isAssigned ? sharesPnL : null,
      accountId: data.accountId || null,
      positionId: initial?.positionId ?? null,
    });
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
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

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Ticker"
          placeholder="AAPL"
          error={errors.ticker?.message}
          {...register("ticker", { required: "Required" })}
        />
        <Select
          label="Strategy"
          {...register("strategy")}
          options={STRATEGIES.map((s) => s)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Option Type"
          {...register("optionType")}
          options={OPTION_TYPES.map((t) => t)}
        />
        <Select
          label="Action"
          {...register("action")}
          options={ACTIONS.map((a) => a)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Strike Price"
          type="number"
          step="0.01"
          error={errors.strikePrice?.message}
          {...register("strikePrice", {
            required: "Required",
            validate: (v) => Number(v) > 0 || "Must be positive",
          })}
        />
        <Input
          label="Expiration"
          type="date"
          error={errors.expirationDate?.message}
          {...register("expirationDate", { required: "Required" })}
        />
        <Input
          label="Contracts"
          type="number"
          min="1"
          error={errors.contracts?.message}
          {...register("contracts", {
            required: "Required",
            validate: (v) => Number(v) > 0 || "Must be positive",
          })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Premium / Contract"
          type="number"
          step="0.01"
          error={errors.premiumPerContract?.message}
          {...register("premiumPerContract", {
            required: "Required",
            validate: (v) => Number(v) >= 0 || "Must be non-negative",
          })}
        />
        <Input
          label="Close Price"
          type="number"
          step="0.01"
          placeholder="Leave blank if open"
          {...register("closePrice")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Underlying @ Entry"
          type="number"
          step="0.01"
          error={errors.underlyingPriceAtEntry?.message}
          {...register("underlyingPriceAtEntry", {
            required: "Required",
            validate: (v) => Number(v) > 0 || "Must be positive",
          })}
        />
        <Input
          label="Underlying @ Exit"
          type="number"
          step="0.01"
          placeholder="Leave blank if open"
          {...register("underlyingPriceAtExit")}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Fees"
          type="number"
          step="0.01"
          {...register("fees")}
        />
        <Select
          label="Status"
          {...register("status")}
          options={STATUSES.map((s) => s)}
        />
        <Input
          label="Date Opened"
          type="date"
          error={errors.dateOpened?.message}
          {...register("dateOpened", { required: "Required" })}
        />
      </div>

      {status !== "Open" && (
        <Input
          label="Date Closed"
          type="date"
          {...register("dateClosed")}
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
              placeholder={`${Number(contracts) * 100}`}
              {...register("assignedShares")}
            />
            <Input
              label="Cost Basis / Share"
              type="number"
              step="0.01"
              {...register("assignedCostBasis")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Shares Sold Price"
              type="number"
              step="0.01"
              {...register("sharesSoldPrice")}
            />
            <Input
              label="Shares Sold Date"
              type="date"
              {...register("sharesSoldDate")}
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Trade notes..."
          {...register("notes")}
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
