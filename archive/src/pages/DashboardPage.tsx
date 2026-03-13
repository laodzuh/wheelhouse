import { useMemo, useState } from "react";
import { useAllTrades } from "@/hooks/useTrades";
import { useTradeStats } from "@/hooks/useTradeStats";
import { useAccounts } from "@/hooks/useAccounts";
import { usePositions } from "@/hooks/useWheelPositions";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { StrategyOverview, type StrategySummary } from "@/components/dashboard/StrategyOverview";
import { BackupBanner } from "@/components/dashboard/BackupBanner";
import { DashboardSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useNavigate } from "react-router-dom";
import type { Trade } from "@/db/types";
import { calculateOptionPnL } from "@/lib/calculations";
import { calculatePositionStats } from "@/lib/wheelCalculations";

export function DashboardPage() {
  const allTrades = useAllTrades();
  const accounts = useAccounts();
  const allPositions = usePositions();
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

  const effectiveAccountSize = selectedAccountId ? accountSize : totalAccountSize;

  const { stats, monthlyPnL, cumulativePnL, strategyStats, tickerStats, insights } = useTradeStats(
    filteredTrades,
    effectiveAccountSize
  );

  // Compute wheel shares P&L to add to total
  const positionSharesPnL = useMemo(() => {
    if (!allPositions || !allTrades) return 0;
    let total = 0;
    for (const pos of allPositions) {
      if (selectedAccountId && pos.accountId !== selectedAccountId) continue;
      if (pos.soldPrice != null && pos.shareCostBasis != null && pos.shareCount != null) {
        total += (pos.soldPrice - pos.shareCostBasis) * pos.shareCount;
      }
    }
    return Math.round(total * 100) / 100;
  }, [allPositions, allTrades, selectedAccountId]);

  // Build strategy summaries
  const strategySummaries = useMemo((): StrategySummary[] => {
    if (!allTrades || !allPositions) return [];
    const trades = filteredTrades ?? allTrades;

    const summaries: StrategySummary[] = [];

    // Build trade map for all positions
    const positionTradeMap = new Map<string, Trade[]>();
    for (const t of trades) {
      if (t.positionId) {
        const existing = positionTradeMap.get(t.positionId) ?? [];
        existing.push(t);
        positionTradeMap.set(t.positionId, existing);
      }
    }

    // --- Wheels ---
    const filteredWheels = allPositions.filter(
      (p) => p.strategy === "wheel" && (!selectedAccountId || p.accountId === selectedAccountId)
    );

    if (filteredWheels.length > 0) {

      let wheelOptionPnL = 0;
      let positionSharesPnLTotal = 0;
      let wheelOpen = 0;
      let wheelWins = 0;
      let wheelClosed = 0;

      for (const pos of filteredWheels) {
        const legs = positionTradeMap.get(pos.id) ?? [];
        const posStats = calculatePositionStats(pos, legs);
        wheelOptionPnL += posStats.optionPnL;
        positionSharesPnLTotal += posStats.sharesPnL;

        if (pos.phase === "completed") {
          wheelClosed++;
          if (posStats.totalPnL >= 0) wheelWins++;
        } else {
          wheelOpen++;
        }
      }

      summaries.push({
        name: "Wheels",
        totalPnL: Math.round((wheelOptionPnL + positionSharesPnLTotal) * 100) / 100,
        optionPnL: Math.round(wheelOptionPnL * 100) / 100,
        sharesPnL: Math.round(positionSharesPnLTotal * 100) / 100,
        positions: filteredWheels.length,
        openPositions: wheelOpen,
        winRate: wheelClosed > 0 ? (wheelWins / wheelClosed) * 100 : 0,
      });
    }

    // --- Covered Calls (position-based) ---
    const filteredCCs = allPositions.filter(
      (p) => p.strategy === "covered_call" && (!selectedAccountId || p.accountId === selectedAccountId)
    );

    if (filteredCCs.length > 0) {
      let ccOptionPnL = 0;
      let ccSharesPnL = 0;
      let ccOpen = 0;
      let ccWins = 0;
      let ccClosed = 0;

      for (const pos of filteredCCs) {
        const legs = positionTradeMap.get(pos.id) ?? [];
        const posStats = calculatePositionStats(pos, legs);
        ccOptionPnL += posStats.optionPnL;
        ccSharesPnL += posStats.sharesPnL;

        if (pos.phase === "completed") {
          ccClosed++;
          if (posStats.totalPnL >= 0) ccWins++;
        } else {
          ccOpen++;
        }
      }

      summaries.push({
        name: "Covered Calls",
        totalPnL: Math.round((ccOptionPnL + ccSharesPnL) * 100) / 100,
        optionPnL: Math.round(ccOptionPnL * 100) / 100,
        sharesPnL: Math.round(ccSharesPnL * 100) / 100,
        positions: filteredCCs.length,
        openPositions: ccOpen,
        winRate: ccClosed > 0 ? (ccWins / ccClosed) * 100 : 0,
      });
    }

    // --- Cash-Secured Puts (standalone) ---
    const cspTrades = trades.filter(
      (t) => t.strategy === "Cash Secured Put" && !t.positionId
    );
    if (cspTrades.length > 0) {
      let cspPnL = 0;
      let cspWins = 0;
      let cspClosed = 0;
      let cspOpen = 0;
      for (const t of cspTrades) {
        if (t.status === "Open") {
          cspOpen++;
        } else {
          const pnl = calculateOptionPnL(t);
          if (pnl != null) {
            cspPnL += pnl;
            cspClosed++;
            if (pnl >= 0) cspWins++;
          }
        }
      }
      summaries.push({
        name: "Cash-Secured Puts",
        totalPnL: Math.round(cspPnL * 100) / 100,
        optionPnL: Math.round(cspPnL * 100) / 100,
        sharesPnL: 0,
        positions: cspTrades.length,
        openPositions: cspOpen,
        winRate: cspClosed > 0 ? (cspWins / cspClosed) * 100 : 0,
      });
    }

    return summaries;
  }, [allTrades, filteredTrades, allPositions, selectedAccountId]);

  // Augmented stats that includes wheel shares P&L
  const augmentedStats = useMemo(() => {
    if (!stats) return null;
    if (positionSharesPnL === 0) return stats;
    const totalPnL = Math.round((stats.totalPnL + positionSharesPnL) * 100) / 100;
    const totalROI = effectiveAccountSize > 0 ? (totalPnL / effectiveAccountSize) * 100 : 0;
    return {
      ...stats,
      totalPnL,
      totalROI,
      totalAnnualizedROI: stats.totalAnnualizedROI + (effectiveAccountSize > 0 ? ((positionSharesPnL / effectiveAccountSize) * 100 / Math.max(1, stats.closedTrades)) * 365 : 0),
    };
  }, [stats, positionSharesPnL, effectiveAccountSize]);

  if (!allTrades || !accounts || !allPositions) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <DashboardSkeleton />
      </div>
    );
  }

  const accountOptions = [
    { value: "", label: "All Accounts" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  if (allTrades.length === 0 && allPositions.length === 0) {
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

  if (!augmentedStats) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <DashboardSkeleton />
      </div>
    );
  }

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
      <BackupBanner />

      {strategySummaries.length > 0 && (
        <div className="mb-6">
          <StrategyOverview strategies={strategySummaries} />
        </div>
      )}

      <DashboardGrid
        stats={augmentedStats}
        monthlyPnL={monthlyPnL}
        cumulativePnL={cumulativePnL}
        strategyStats={strategyStats}
        tickerStats={tickerStats}
        insights={insights}
      />
    </div>
  );
}
