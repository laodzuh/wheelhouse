import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { STATUSES, STRATEGIES, type Account } from "@/db/types";

export interface TradeFilterValues {
  search: string;
  status: string;
  strategy: string;
  accountId: string;
}

interface TradeFiltersProps {
  filters: TradeFilterValues;
  onChange: (filters: TradeFilterValues) => void;
  accounts?: Account[];
}

export function TradeFilters({ filters, onChange, accounts }: TradeFiltersProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1">
        <Input
          placeholder="Search ticker..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>
      {accounts && accounts.length > 0 && (
        <div className="w-44">
          <Select
            value={filters.accountId}
            onChange={(e) => onChange({ ...filters, accountId: e.target.value })}
            options={[
              { value: "", label: "All Accounts" },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
        </div>
      )}
      <div className="w-44">
        <Select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          options={[
            { value: "", label: "All Statuses" },
            ...STATUSES.map((s) => ({ value: s, label: s })),
          ]}
        />
      </div>
      <div className="w-48">
        <Select
          value={filters.strategy}
          onChange={(e) => onChange({ ...filters, strategy: e.target.value })}
          options={[
            { value: "", label: "All Strategies" },
            ...STRATEGIES.map((s) => ({ value: s, label: s })),
          ]}
        />
      </div>
    </div>
  );
}
