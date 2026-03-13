import type { Trade } from "@/db/types";

const MULTIPLIER = 100;

/** Round to the nearest cent to avoid floating-point drift. */
function cents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateOptionPnL(trade: Trade): number | null {
  if (trade.status === "Open") return null;

  const { action, premiumPerContract, contracts, fees, closePrice, status } =
    trade;

  if (action === "Sell to Open") {
    const credit = premiumPerContract * contracts * MULTIPLIER - fees;
    if (status === "Expired") return cents(credit);
    if (closePrice == null) return null;
    const debit = closePrice * contracts * MULTIPLIER;
    return cents(credit - debit);
  }

  // Buy to Open
  const cost = premiumPerContract * contracts * MULTIPLIER + fees;
  if (status === "Expired") return cents(-cost);
  if (closePrice == null) return null;
  const revenue = closePrice * contracts * MULTIPLIER;
  return cents(revenue - cost);
}

export function calculateTotalPnL(trade: Trade): number | null {
  const optionPnL = calculateOptionPnL(trade);
  if (optionPnL == null) return null;
  const stockPnL = trade.sharesPnL ?? 0;
  return cents(optionPnL + stockPnL);
}

export function calculateROI(trade: Trade): number | null {
  const pnl = calculateTotalPnL(trade);
  if (pnl == null) return null;

  const basis = calculateBasis(trade);
  if (basis == null) return null;
  return (pnl / basis) * 100;
}

export function calculateAnnualizedROI(trade: Trade): number | null {
  const roi = calculateROI(trade);
  if (roi == null) return null;

  const start = new Date(trade.dateOpened);
  const end = trade.dateClosed ? new Date(trade.dateClosed) : new Date();
  const days = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  return (roi / days) * 365;
}

export interface TradeGroup {
  groupId: string | null;
  trades: Trade[];
  totalPnL: number | null;
}

export function groupTrades(trades: Trade[]): TradeGroup[] {
  const grouped = new Map<string, Trade[]>();
  const standalone: Trade[] = [];

  for (const trade of trades) {
    if (trade.groupId) {
      const existing = grouped.get(trade.groupId) ?? [];
      existing.push(trade);
      grouped.set(trade.groupId, existing);
    } else {
      standalone.push(trade);
    }
  }

  const groups: TradeGroup[] = [];

  for (const [groupId, groupTrades] of grouped) {
    groupTrades.sort(
      (a, b) =>
        new Date(a.dateOpened).getTime() - new Date(b.dateOpened).getTime()
    );
    const pnls = groupTrades.map(calculateTotalPnL);
    const totalPnL = pnls.some((p) => p != null)
      ? pnls.reduce((sum, p) => (sum ?? 0) + (p ?? 0), 0)
      : null;
    groups.push({ groupId, trades: groupTrades, totalPnL });
  }

  for (const trade of standalone) {
    groups.push({
      groupId: null,
      trades: [trade],
      totalPnL: calculateTotalPnL(trade),
    });
  }

  groups.sort((a, b) => {
    const aDate = a.trades[0].dateOpened;
    const bDate = b.trades[0].dateOpened;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  return groups;
}

export function calculateBasis(trade: Trade): number | null {
  const { action, premiumPerContract, contracts, fees } = trade;
  let basis: number;
  if (action === "Buy to Open") {
    basis = premiumPerContract * contracts * MULTIPLIER + fees;
  } else if (trade.optionType === "Put") {
    basis = trade.strikePrice * contracts * MULTIPLIER;
  } else if (trade.underlyingPriceAtEntry > 0) {
    basis = trade.underlyingPriceAtEntry * contracts * MULTIPLIER;
  } else {
    basis = trade.strikePrice * contracts * MULTIPLIER;
  }
  return basis > 0 ? cents(basis) : null;
}

export interface DashboardStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  totalPnL: number;
  totalROI: number;
  totalAnnualizedROI: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  totalFees: number;
}

export function calculateDashboardStats(trades: Trade[], accountSize: number = 0): DashboardStats {
  const groups = groupTrades(trades);
  const openTrades = trades.filter((t) => t.status === "Open").length;

  const closedGroups = groups.filter(
    (g) =>
      g.totalPnL != null && g.trades.every((t) => t.status !== "Open")
  );

  const pnls = closedGroups
    .map((g) => g.totalPnL)
    .filter((p): p is number => p != null);

  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p <= 0);

  const totalPnL = cents(pnls.reduce((sum, p) => sum + p, 0));

  // Total ROI: total P&L / account size
  const totalROI = accountSize > 0 ? (totalPnL / accountSize) * 100 : 0;

  // Annualized: use span from first open to last close
  const closedTrades2 = trades.filter((t) => t.status !== "Open");
  const dates = closedTrades2
    .map((t) => new Date(t.dateClosed ?? t.dateOpened).getTime())
    .concat(closedTrades2.map((t) => new Date(t.dateOpened).getTime()));
  const earliest = dates.length > 0 ? Math.min(...dates) : 0;
  const latest = dates.length > 0 ? Math.max(...dates) : 0;
  const totalDays = Math.max(1, Math.round((latest - earliest) / (1000 * 60 * 60 * 24)));
  const totalAnnualizedROI = accountSize > 0 ? (totalROI / totalDays) * 365 : 0;

  return {
    totalTrades: trades.length,
    openTrades,
    closedTrades: trades.length - openTrades,
    totalPnL,
    totalROI,
    totalAnnualizedROI,
    winRate: pnls.length > 0 ? (wins.length / pnls.length) * 100 : 0,
    avgWin: wins.length > 0 ? cents(wins.reduce((s, w) => s + w, 0) / wins.length) : 0,
    avgLoss:
      losses.length > 0
        ? cents(losses.reduce((s, l) => s + l, 0) / losses.length)
        : 0,
    bestTrade: pnls.length > 0 ? Math.max(...pnls) : 0,
    worstTrade: pnls.length > 0 ? Math.min(...pnls) : 0,
    totalFees: cents(trades.reduce((sum, t) => sum + t.fees, 0)),
  };
}

export interface MonthlyPnL {
  month: string;
  pnl: number;
  roi: number;
  annualizedRoi: number;
  wins: number;
  losses: number;
}

export function calculateMonthlyPnL(trades: Trade[], accountSize: number = 0): MonthlyPnL[] {
  const monthMap = new Map<
    string,
    { pnl: number; wins: number; losses: number }
  >();

  for (const trade of trades) {
    if (trade.status === "Open") continue;
    const pnl = calculateTotalPnL(trade);
    if (pnl == null) continue;
    const date = trade.dateClosed ?? trade.dateOpened;
    const month = date.slice(0, 7);
    const entry = monthMap.get(month) ?? { pnl: 0, wins: 0, losses: 0 };
    entry.pnl = cents(entry.pnl + pnl);
    if (pnl > 0) entry.wins++;
    else entry.losses++;
    monthMap.set(month, entry);
  }

  return Array.from(monthMap.entries())
    .map(([month, data]) => {
      const roi = accountSize > 0 ? (data.pnl / accountSize) * 100 : 0;
      return {
        month,
        pnl: data.pnl,
        roi,
        annualizedRoi: roi * 12,
        wins: data.wins,
        losses: data.losses,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface CumulativePnLPoint {
  date: string;
  pnl: number;
  roi: number;
  annualizedRoi: number;
}

// ---------------------------------------------------------------------------
// Strategy breakdown
// ---------------------------------------------------------------------------

export interface StrategyStats {
  strategy: string;
  totalPnL: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

export function calculateStatsByStrategy(trades: Trade[]): StrategyStats[] {
  const map = new Map<string, { pnl: number; trades: number; wins: number; losses: number }>();

  for (const trade of trades) {
    if (trade.status === "Open") continue;
    const pnl = calculateTotalPnL(trade);
    if (pnl == null) continue;

    const entry = map.get(trade.strategy) ?? { pnl: 0, trades: 0, wins: 0, losses: 0 };
    entry.pnl = cents(entry.pnl + pnl);
    entry.trades++;
    if (pnl > 0) entry.wins++;
    else entry.losses++;
    map.set(trade.strategy, entry);
  }

  return Array.from(map.entries())
    .map(([strategy, d]) => ({
      strategy,
      totalPnL: d.pnl,
      trades: d.trades,
      wins: d.wins,
      losses: d.losses,
      winRate: d.trades > 0 ? (d.wins / d.trades) * 100 : 0,
    }))
    .sort((a, b) => b.totalPnL - a.totalPnL);
}

// ---------------------------------------------------------------------------
// Ticker breakdown
// ---------------------------------------------------------------------------

export interface TickerStats {
  ticker: string;
  totalPnL: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

export function calculateStatsByTicker(trades: Trade[]): TickerStats[] {
  const map = new Map<string, { pnl: number; trades: number; wins: number; losses: number }>();

  for (const trade of trades) {
    if (trade.status === "Open") continue;
    const pnl = calculateTotalPnL(trade);
    if (pnl == null) continue;

    const entry = map.get(trade.ticker) ?? { pnl: 0, trades: 0, wins: 0, losses: 0 };
    entry.pnl = cents(entry.pnl + pnl);
    entry.trades++;
    if (pnl > 0) entry.wins++;
    else entry.losses++;
    map.set(trade.ticker, entry);
  }

  return Array.from(map.entries())
    .map(([ticker, d]) => ({
      ticker,
      totalPnL: d.pnl,
      trades: d.trades,
      wins: d.wins,
      losses: d.losses,
      winRate: d.trades > 0 ? (d.wins / d.trades) * 100 : 0,
    }))
    .sort((a, b) => b.totalPnL - a.totalPnL);
}

// ---------------------------------------------------------------------------
// Trade insights (streaks, avg days, profit factor)
// ---------------------------------------------------------------------------

export interface TradeInsights {
  avgDaysInTrade: number;
  profitFactor: number;
  currentStreak: { type: "win" | "loss" | "none"; count: number };
  longestWinStreak: number;
  longestLossStreak: number;
}

export function calculateTradeInsights(trades: Trade[]): TradeInsights {
  const closed = trades
    .filter((t) => t.status !== "Open" && t.dateClosed)
    .sort((a, b) => (a.dateClosed ?? "").localeCompare(b.dateClosed ?? ""));

  // Average days in trade
  let totalDays = 0;
  let dayCount = 0;
  for (const t of closed) {
    if (t.dateClosed) {
      const days = Math.max(
        0,
        Math.round(
          (new Date(t.dateClosed).getTime() - new Date(t.dateOpened).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      totalDays += days;
      dayCount++;
    }
  }
  const avgDaysInTrade = dayCount > 0 ? Math.round(totalDays / dayCount) : 0;

  // Profit factor and streaks
  let grossWins = 0;
  let grossLosses = 0;
  let currentType: "win" | "loss" | "none" = "none";
  let currentCount = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let winStreak = 0;
  let lossStreak = 0;

  for (const t of closed) {
    const pnl = calculateTotalPnL(t);
    if (pnl == null) continue;

    if (pnl > 0) {
      grossWins += pnl;
      winStreak++;
      lossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, winStreak);
      currentType = "win";
      currentCount = winStreak;
    } else {
      grossLosses += Math.abs(pnl);
      lossStreak++;
      winStreak = 0;
      longestLossStreak = Math.max(longestLossStreak, lossStreak);
      currentType = "loss";
      currentCount = lossStreak;
    }
  }

  const profitFactor = grossLosses > 0 ? cents(grossWins / grossLosses) : grossWins > 0 ? Infinity : 0;

  return {
    avgDaysInTrade,
    profitFactor: profitFactor === Infinity ? 0 : profitFactor,
    currentStreak: { type: currentType, count: currentCount },
    longestWinStreak,
    longestLossStreak,
  };
}

// ---------------------------------------------------------------------------
// Cumulative P&L
// ---------------------------------------------------------------------------

export function calculateCumulativePnL(trades: Trade[], accountSize: number = 0): CumulativePnLPoint[] {
  const closedTrades = trades
    .filter((t) => t.status !== "Open")
    .map((t) => ({
      date: t.dateClosed ?? t.dateOpened,
      dateOpened: t.dateOpened,
      pnl: calculateTotalPnL(t),
    }))
    .filter((t): t is typeof t & { pnl: number } => t.pnl != null)
    .sort((a, b) => a.date.localeCompare(b.date));

  let cumulativePnL = 0;
  let earliestDate: string | null = null;

  return closedTrades.map((t) => {
    cumulativePnL = cents(cumulativePnL + t.pnl);
    if (!earliestDate || t.dateOpened < earliestDate) earliestDate = t.dateOpened;

    const roi = accountSize > 0 ? (cumulativePnL / accountSize) * 100 : 0;
    const days = Math.max(
      1,
      Math.round(
        (new Date(t.date).getTime() - new Date(earliestDate!).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const annualizedRoi = (roi / days) * 365;

    return { date: t.date, pnl: cumulativePnL, roi, annualizedRoi };
  });
}
