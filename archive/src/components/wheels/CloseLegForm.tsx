import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { todayISO } from "@/lib/utils";

interface CloseLegFormProps {
  ticker: string;
  strikePrice: number;
  optionType: string;
  onSubmit: (closePrice: number, dateClosed: string) => void;
  onCancel: () => void;
}

export function CloseLegForm({ ticker, strikePrice, optionType, onSubmit, onCancel }: CloseLegFormProps) {
  const [closePrice, setClosePrice] = useState("");
  const [dateClosed, setDateClosed] = useState(todayISO());
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(closePrice);
    if (isNaN(price) || price < 0) {
      setError("Enter a valid price (0 or greater)");
      return;
    }
    onSubmit(price, dateClosed);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-400">
        Close the {optionType === "Put" ? "CSP" : "CC"} on {ticker} at ${strikePrice} strike.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Close Price"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={closePrice}
          onChange={(e) => { setClosePrice(e.target.value); setError(""); }}
          error={error}
          autoFocus
        />
        <Input
          label="Date Closed"
          type="date"
          value={dateClosed}
          onChange={(e) => setDateClosed(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Close Leg</Button>
      </div>
    </form>
  );
}
