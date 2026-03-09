import { useMemo, useState } from "react";
import { useAllTrades } from "@/hooks/useTrades";
import { useTradeStats } from "@/hooks/useTradeStats";
import { useAccounts } from "@/hooks/useAccounts";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useNavigate } from "react-router-dom";

export function DashboardPage() {
  const allTrades = useAllTrades();
  const accounts = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const navigate = useNavigate();

  const filteredTrades = useMemo(() => {
    if (!allTrades) return undefined;
    if (!selectedAccountId) return allTrades;
    return allTrades.filter((t) => t.accountId === selectedAccountId);
  }, [allTrades, selectedAccountId]);

  const accountSize = useMemo(() => {
    if (!selectedAccountId || !accounts) return 0;
    const account = accounts.find((a) => a.id === selectedAccountId);
    return account?.size ?? 0;
  }, [selectedAccountId, accounts]);

  const totalAccountSize = useMemo(() => {
    if (!accounts) return 0;
    return accounts.reduce((sum, a) => sum + a.size, 0);
  }, [accounts]);

  const { stats, monthlyPnL, cumulativePnL } = useTradeStats(
    filteredTrades,
    selectedAccountId ? accountSize : totalAccountSize
  );

  if (!allTrades || !accounts) return null;

  const accountOptions = [
    { value: "", label: "All Accounts" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  if (allTrades.length === 0) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <EmptyState
          title="No trades yet"
          description="Add your first trade to see performance metrics and charts."
          action={
            <Button onClick={() => navigate("/trades")}>
              Go to Trade Log
            </Button>
          }
        />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        action={
          accounts.length > 0 ? (
            <div className="w-48">
              <Select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                options={accountOptions}
              />
            </div>
          ) : undefined
        }
      />
      <DashboardGrid
        stats={stats}
        monthlyPnL={monthlyPnL}
        cumulativePnL={cumulativePnL}
      />
    </div>
  );
}
