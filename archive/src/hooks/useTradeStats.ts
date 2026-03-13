import { useMemo } from "react";
import type { Trade } from "@/db/types";
import {
  calculateDashboardStats,
  calculateMonthlyPnL,
  calculateCumulativePnL,
  calculateStatsByStrategy,
  calculateStatsByTicker,
  calculateTradeInsights,
  groupTrades,
} from "@/lib/calculations";

export function useTradeStats(trades: Trade[] | undefined, accountSize: number = 0) {
  const stats = useMemo(
    () => (trades ? calculateDashboardStats(trades, accountSize) : null),
    [trades, accountSize]
  );

  const monthlyPnL = useMemo(
    () => (trades ? calculateMonthlyPnL(trades, accountSize) : []),
    [trades, accountSize]
  );

  const cumulativePnL = useMemo(
    () => (trades ? calculateCumulativePnL(trades, accountSize) : []),
    [trades, accountSize]
  );

  const groups = useMemo(
    () => (trades ? groupTrades(trades) : []),
    [trades]
  );

  const strategyStats = useMemo(
    () => (trades ? calculateStatsByStrategy(trades) : []),
    [trades]
  );

  const tickerStats = useMemo(
    () => (trades ? calculateStatsByTicker(trades) : []),
    [trades]
  );

  const insights = useMemo(
    () => (trades ? calculateTradeInsights(trades) : null),
    [trades]
  );

  return { stats, monthlyPnL, cumulativePnL, groups, strategyStats, tickerStats, insights };
}
