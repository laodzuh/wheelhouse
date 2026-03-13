import { StatCard } from "./StatCard";
import { PnLChart } from "./PnLChart";
import { WinLossChart } from "./WinLossChart";
import { MonthlyPnLChart } from "./MonthlyPnLChart";
import { ROIChart } from "./ROIChart";
import { StrategyBreakdown } from "./StrategyBreakdown";
import { TickerBreakdown } from "./TickerBreakdown";
import { InsightsCard } from "./InsightsCard";
import type {
  DashboardStats,
  MonthlyPnL,
  CumulativePnLPoint,
  StrategyStats,
  TickerStats,
  TradeInsights,
} from "@/lib/calculations";
import { formatCurrency } from "@/lib/utils";

interface DashboardGridProps {
  stats: DashboardStats;
  monthlyPnL: MonthlyPnL[];
  cumulativePnL: CumulativePnLPoint[];
  strategyStats: StrategyStats[];
  tickerStats: TickerStats[];
  insights: TradeInsights | null;
}

export function DashboardGrid({
  stats,
  monthlyPnL,
  cumulativePnL,
  strategyStats,
  tickerStats,
  insights,
}: DashboardGridProps) {
  const winCount = Math.round(
    (stats.winRate / 100) * (stats.closedTrades > 0 ? stats.closedTrades : 0)
  );
  const lossCount = stats.closedTrades - winCount;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total P&L" value={formatCurrency(stats.totalPnL)} color={stats.totalPnL >= 0 ? "green" : "red"} />
        <StatCard label="Total ROI" value={`${stats.totalROI.toFixed(2)}%`} color={stats.totalROI >= 0 ? "green" : "red"} />
        <StatCard label="Ann. ROI" value={`${stats.totalAnnualizedROI.toFixed(2)}%`} color={stats.totalAnnualizedROI >= 0 ? "green" : "red"} />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} subValue={`${stats.closedTrades} closed trades`} />
        <StatCard label="Open Positions" value={String(stats.openTrades)} />
        <StatCard label="Avg Win" value={formatCurrency(stats.avgWin)} color="green" />
        <StatCard label="Avg Loss" value={formatCurrency(stats.avgLoss)} color="red" />
        <StatCard label="Best Trade" value={formatCurrency(stats.bestTrade)} color="green" />
        <StatCard label="Worst Trade" value={formatCurrency(stats.worstTrade)} color="red" />
        <StatCard label="Total Fees" value={formatCurrency(stats.totalFees)} />
      </div>

      {insights && (
        <div className="grid gap-6 lg:grid-cols-2">
          <InsightsCard insights={insights} />
          <WinLossChart wins={winCount} losses={lossCount} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PnLChart data={cumulativePnL} />
        </div>
        <StrategyBreakdown data={strategyStats} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyPnLChart data={monthlyPnL} />
        <TickerBreakdown data={tickerStats} />
      </div>

      <ROIChart data={cumulativePnL} />
    </div>
  );
}
