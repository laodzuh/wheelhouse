import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Account } from "@/db/types";

interface StartWheelFormProps {
  accounts?: Account[];
  onSubmit: (data: {
    ticker: string;
    accountId: string | null;
  }) => void;
  onCancel: () => void;
}

interface FormValues {
  ticker: string;
  accountId: string;
}

export function StartWheelForm({ accounts, onSubmit, onCancel }: StartWheelFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      ticker: "",
      accountId: "",
    },
  });

  function onValid(data: FormValues) {
    onSubmit({
      ticker: data.ticker,
      accountId: data.accountId || null,
    });
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <Input
        label="Ticker"
        placeholder="AAPL"
        error={errors.ticker?.message}
        {...register("ticker", { required: "Required" })}
      />

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
        <Button type="submit">Start Wheel</Button>
      </div>
    </form>
  );
}
