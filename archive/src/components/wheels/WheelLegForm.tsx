import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Trade, Position } from "@/db/types";
import { todayISO } from "@/lib/utils";

interface WheelLegFormProps {
  position: Position;
  legType: "put" | "call";
  onSubmit: (data: Omit<Trade, "id" | "createdAt" | "updatedAt" | "positionId">) => void;
  onCancel: () => void;
}

interface FormValues {
  strikePrice: string;
  expirationDate: string;
  premiumPerContract: string;
  fees: string;
  dateOpened: string;
}

export function WheelLegForm({ position, legType, onSubmit, onCancel }: WheelLegFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      strikePrice: "",
      expirationDate: "",
      premiumPerContract: "",
      fees: "0",
      dateOpened: todayISO(),
    },
  });

  function onValid(data: FormValues) {
    onSubmit({
      groupId: null,
      dateOpened: data.dateOpened,
      dateClosed: null,
      ticker: position.ticker,
      optionType: legType === "put" ? "Put" : "Call",
      action: "Sell to Open",
      strikePrice: Number(data.strikePrice),
      expirationDate: data.expirationDate,
      contracts: 1,
      premiumPerContract: Number(data.premiumPerContract),
      closePrice: null,
      underlyingPriceAtEntry: 0,
      underlyingPriceAtExit: null,
      fees: Number(data.fees),
      strategy: legType === "put" ? "Cash Secured Put" : "Covered Call",
      notes: "",
      status: "Open",
      assignedShares: null,
      assignedCostBasis: null,
      sharesSoldPrice: null,
      sharesSoldDate: null,
      sharesPnL: null,
      accountId: position.accountId,
    });
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <p className="text-sm text-gray-400">
        Sell a {legType === "put" ? "cash-secured put" : "covered call"} on{" "}
        <span className="font-semibold text-gray-200">{position.ticker}</span>
      </p>

      <div className="grid grid-cols-2 gap-4">
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
          label="Fees"
          type="number"
          step="0.01"
          {...register("fees")}
        />
      </div>

      <Input
        label="Date Opened"
        type="date"
        error={errors.dateOpened?.message}
        {...register("dateOpened", { required: "Required" })}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Add {legType === "put" ? "Put" : "Call"} Leg
        </Button>
      </div>
    </form>
  );
}
