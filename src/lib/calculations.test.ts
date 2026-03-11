import { describe, it, expect } from "vitest";
import {
  calculateOptionPnL,
  calculateTotalPnL,
  calculateROI,
  calculateAnnualizedROI,
  calculateBasis,
  groupTrades,
  calculateDashboardStats,
  calculateMonthlyPnL,
  calculateCumulativePnL,
} from "./calculations";
import type { Trade } from "@/db/types";

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "test-1",
    groupId: null,
    dateOpened: "2025-01-01",
    dateClosed: "2025-01-15",
    ticker: "AAPL",
    optionType: "Put",
    action: "Sell to Open",
    strikePrice: 150,
    expirationDate: "2025-02-21",
    contracts: 1,
    premiumPerContract: 3.0,
    closePrice: 1.0,
    underlyingPriceAtEntry: 155,
    underlyingPriceAtExit: 152,
    fees: 1.3,
    strategy: "Cash Secured Put",
    notes: "",
    status: "Closed (Win)",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
    assignedShares: null,
    assignedCostBasis: null,
    sharesSoldPrice: null,
    sharesSoldDate: null,
    sharesPnL: null,
    accountId: null,
    positionId: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateOptionPnL
// ---------------------------------------------------------------------------
describe("calculateOptionPnL", () => {
  it("returns null for open trades", () => {
    const trade = makeTrade({ status: "Open", closePrice: null });
    expect(calculateOptionPnL(trade)).toBeNull();
  });

  it("calculates P&L for Sell to Open closed trade", () => {
    // Credit: 3.00 * 1 * 100 - 1.30 = 298.70
    // Debit:  1.00 * 1 * 100 = 100.00
    // P&L:   298.70 - 100.00 = 198.70
    const trade = makeTrade();
    expect(calculateOptionPnL(trade)).toBeCloseTo(198.7);
  });

  it("calculates P&L for Buy to Open closed trade (win)", () => {
    // Cost: 2.00 * 1 * 100 + 1.00 = 201.00
    // Revenue: 5.00 * 1 * 100 = 500.00
    // P&L: 500.00 - 201.00 = 299.00
    const trade = makeTrade({
      action: "Buy to Open",
      premiumPerContract: 2.0,
      closePrice: 5.0,
      fees: 1.0,
      status: "Closed (Win)",
    });
    expect(calculateOptionPnL(trade)).toBeCloseTo(299.0);
  });

  it("calculates P&L for Buy to Open closed trade (loss)", () => {
    // Cost: 5.00 * 1 * 100 + 1.00 = 501.00
    // Revenue: 2.00 * 1 * 100 = 200.00
    // P&L: 200.00 - 501.00 = -301.00
    const trade = makeTrade({
      action: "Buy to Open",
      premiumPerContract: 5.0,
      closePrice: 2.0,
      fees: 1.0,
      status: "Closed (Loss)",
    });
    expect(calculateOptionPnL(trade)).toBeCloseTo(-301.0);
  });

  it("handles expired Sell to Open — full credit kept", () => {
    // Credit: 3.00 * 1 * 100 - 1.30 = 298.70
    const trade = makeTrade({ status: "Expired", closePrice: 0 });
    expect(calculateOptionPnL(trade)).toBeCloseTo(298.7);
  });

  it("handles expired Buy to Open — full cost lost", () => {
    // Cost: 2.50 * 2 * 100 + 2.00 = 502.00
    const trade = makeTrade({
      action: "Buy to Open",
      premiumPerContract: 2.5,
      contracts: 2,
      fees: 2.0,
      status: "Expired",
      closePrice: 0,
    });
    expect(calculateOptionPnL(trade)).toBeCloseTo(-502.0);
  });

  it("returns null when closePrice is null on a closed trade", () => {
    const trade = makeTrade({
      status: "Closed (Win)",
      closePrice: null,
    });
    expect(calculateOptionPnL(trade)).toBeNull();
  });

  it("handles multiple contracts", () => {
    // Credit: 2.00 * 5 * 100 - 5.00 = 995.00
    // Debit:  0.50 * 5 * 100 = 250.00
    // P&L:   995.00 - 250.00 = 745.00
    const trade = makeTrade({
      contracts: 5,
      premiumPerContract: 2.0,
      closePrice: 0.5,
      fees: 5.0,
    });
    expect(calculateOptionPnL(trade)).toBeCloseTo(745.0);
  });
});

// ---------------------------------------------------------------------------
// calculateTotalPnL
// ---------------------------------------------------------------------------
describe("calculateTotalPnL", () => {
  it("returns option P&L when no shares P&L", () => {
    const trade = makeTrade();
    expect(calculateTotalPnL(trade)).toBeCloseTo(198.7);
  });

  it("adds shares P&L to option P&L", () => {
    const trade = makeTrade({ sharesPnL: 500 });
    expect(calculateTotalPnL(trade)).toBeCloseTo(698.7);
  });

  it("returns null for open trades", () => {
    const trade = makeTrade({ status: "Open", closePrice: null });
    expect(calculateTotalPnL(trade)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// calculateBasis
// ---------------------------------------------------------------------------
describe("calculateBasis", () => {
  it("returns premium cost for Buy to Open", () => {
    // 2.00 * 1 * 100 + 1.00 = 201.00
    const trade = makeTrade({
      action: "Buy to Open",
      premiumPerContract: 2.0,
      fees: 1.0,
    });
    expect(calculateBasis(trade)).toBeCloseTo(201.0);
  });

  it("returns strike * shares for cash secured put", () => {
    // 150 * 1 * 100 = 15000
    const trade = makeTrade({ optionType: "Put", action: "Sell to Open" });
    expect(calculateBasis(trade)).toBeCloseTo(15000);
  });

  it("returns underlying value for covered call", () => {
    // 155 * 1 * 100 = 15500
    const trade = makeTrade({
      optionType: "Call",
      action: "Sell to Open",
      underlyingPriceAtEntry: 155,
    });
    expect(calculateBasis(trade)).toBeCloseTo(15500);
  });

  it("falls back to strike for covered call without underlying price", () => {
    const trade = makeTrade({
      optionType: "Call",
      action: "Sell to Open",
      underlyingPriceAtEntry: 0,
      strikePrice: 150,
    });
    expect(calculateBasis(trade)).toBeCloseTo(15000);
  });

  it("returns null when basis would be 0", () => {
    const trade = makeTrade({
      action: "Buy to Open",
      premiumPerContract: 0,
      contracts: 1,
      fees: 0,
    });
    expect(calculateBasis(trade)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// calculateROI
// ---------------------------------------------------------------------------
describe("calculateROI", () => {
  it("calculates ROI for cash secured put", () => {
    // P&L: 198.70, Basis: 15000
    // ROI: (198.70 / 15000) * 100 ≈ 1.325%
    const trade = makeTrade();
    expect(calculateROI(trade)).toBeCloseTo(1.325, 1);
  });

  it("calculates ROI for Buy to Open", () => {
    // P&L: 299.00, Basis: 201.00
    // ROI: (299 / 201) * 100 ≈ 148.76%
    const trade = makeTrade({
      action: "Buy to Open",
      premiumPerContract: 2.0,
      closePrice: 5.0,
      fees: 1.0,
      status: "Closed (Win)",
    });
    expect(calculateROI(trade)).toBeCloseTo(148.76, 0);
  });

  it("returns null for open trades", () => {
    const trade = makeTrade({ status: "Open", closePrice: null });
    expect(calculateROI(trade)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// calculateAnnualizedROI
// ---------------------------------------------------------------------------
describe("calculateAnnualizedROI", () => {
  it("annualizes ROI over trade duration", () => {
    // Trade is 14 days (Jan 1 - Jan 15)
    // ROI ≈ 1.325%
    // Annualized: (1.325 / 14) * 365 ≈ 34.5%
    const trade = makeTrade();
    const annualized = calculateAnnualizedROI(trade);
    expect(annualized).not.toBeNull();
    expect(annualized!).toBeGreaterThan(30);
    expect(annualized!).toBeLessThan(40);
  });

  it("returns null for open trades", () => {
    const trade = makeTrade({ status: "Open", closePrice: null });
    expect(calculateAnnualizedROI(trade)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// groupTrades
// ---------------------------------------------------------------------------
describe("groupTrades", () => {
  it("groups standalone trades individually", () => {
    const trades = [
      makeTrade({ id: "1", groupId: null }),
      makeTrade({ id: "2", groupId: null }),
    ];
    const groups = groupTrades(trades);
    expect(groups).toHaveLength(2);
    expect(groups[0].trades).toHaveLength(1);
    expect(groups[1].trades).toHaveLength(1);
  });

  it("groups trades by groupId", () => {
    const trades = [
      makeTrade({ id: "1", groupId: "g1", dateOpened: "2025-01-01" }),
      makeTrade({ id: "2", groupId: "g1", dateOpened: "2025-01-15" }),
      makeTrade({ id: "3", groupId: null }),
    ];
    const groups = groupTrades(trades);
    expect(groups).toHaveLength(2);

    const grouped = groups.find((g) => g.groupId === "g1");
    expect(grouped).toBeDefined();
    expect(grouped!.trades).toHaveLength(2);
    // Should be sorted by dateOpened within group
    expect(grouped!.trades[0].id).toBe("1");
    expect(grouped!.trades[1].id).toBe("2");
  });

  it("calculates total P&L for a group", () => {
    const trades = [
      makeTrade({
        id: "1",
        groupId: "g1",
        premiumPerContract: 3.0,
        closePrice: 1.0,
        fees: 0,
      }),
      makeTrade({
        id: "2",
        groupId: "g1",
        premiumPerContract: 2.0,
        closePrice: 0.5,
        fees: 0,
      }),
    ];
    const groups = groupTrades(trades);
    const group = groups.find((g) => g.groupId === "g1")!;
    // Trade 1 P&L: (3*100) - (1*100) = 200
    // Trade 2 P&L: (2*100) - (0.5*100) = 150
    // Total: 350
    expect(group.totalPnL).toBeCloseTo(350);
  });

  it("sorts groups by most recent first", () => {
    const trades = [
      makeTrade({ id: "1", groupId: null, dateOpened: "2025-01-01" }),
      makeTrade({ id: "2", groupId: null, dateOpened: "2025-03-01" }),
      makeTrade({ id: "3", groupId: null, dateOpened: "2025-02-01" }),
    ];
    const groups = groupTrades(trades);
    expect(groups[0].trades[0].id).toBe("2");
    expect(groups[1].trades[0].id).toBe("3");
    expect(groups[2].trades[0].id).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// calculateDashboardStats
// ---------------------------------------------------------------------------
describe("calculateDashboardStats", () => {
  it("calculates basic stats", () => {
    const trades = [
      makeTrade({ id: "1", status: "Closed (Win)", premiumPerContract: 3.0, closePrice: 1.0, fees: 0 }),
      makeTrade({ id: "2", status: "Closed (Loss)", premiumPerContract: 1.0, closePrice: 3.0, fees: 0 }),
      makeTrade({ id: "3", status: "Open", closePrice: null }),
    ];
    const stats = calculateDashboardStats(trades, 10000);
    expect(stats.totalTrades).toBe(3);
    expect(stats.openTrades).toBe(1);
    expect(stats.closedTrades).toBe(2);
    expect(stats.winRate).toBe(50);
  });

  it("handles empty trades array", () => {
    const stats = calculateDashboardStats([], 10000);
    expect(stats.totalTrades).toBe(0);
    expect(stats.totalPnL).toBe(0);
    expect(stats.winRate).toBe(0);
  });

  it("calculates total ROI against account size", () => {
    const trades = [
      makeTrade({ id: "1", premiumPerContract: 3.0, closePrice: 1.0, fees: 0 }),
    ];
    const stats = calculateDashboardStats(trades, 10000);
    // P&L = 200, ROI = (200/10000)*100 = 2%
    expect(stats.totalROI).toBeCloseTo(2.0);
  });

  it("returns 0 ROI when account size is 0", () => {
    const trades = [makeTrade()];
    const stats = calculateDashboardStats(trades, 0);
    expect(stats.totalROI).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateMonthlyPnL
// ---------------------------------------------------------------------------
describe("calculateMonthlyPnL", () => {
  it("groups closed trades by month", () => {
    const trades = [
      makeTrade({ id: "1", dateClosed: "2025-01-15", premiumPerContract: 3, closePrice: 1, fees: 0 }),
      makeTrade({ id: "2", dateClosed: "2025-01-20", premiumPerContract: 2, closePrice: 1, fees: 0 }),
      makeTrade({ id: "3", dateClosed: "2025-02-10", premiumPerContract: 4, closePrice: 2, fees: 0 }),
    ];
    const monthly = calculateMonthlyPnL(trades, 10000);
    expect(monthly).toHaveLength(2);
    expect(monthly[0].month).toBe("2025-01");
    expect(monthly[1].month).toBe("2025-02");
    // Jan: 200 + 100 = 300
    expect(monthly[0].pnl).toBeCloseTo(300);
    // Feb: 200
    expect(monthly[1].pnl).toBeCloseTo(200);
  });

  it("skips open trades", () => {
    const trades = [
      makeTrade({ status: "Open", closePrice: null }),
    ];
    const monthly = calculateMonthlyPnL(trades);
    expect(monthly).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// calculateCumulativePnL
// ---------------------------------------------------------------------------
describe("calculateCumulativePnL", () => {
  it("accumulates P&L over time", () => {
    const trades = [
      makeTrade({ id: "1", dateOpened: "2025-01-01", dateClosed: "2025-01-10", premiumPerContract: 3, closePrice: 1, fees: 0 }),
      makeTrade({ id: "2", dateOpened: "2025-01-05", dateClosed: "2025-01-20", premiumPerContract: 2, closePrice: 1, fees: 0 }),
    ];
    const cumulative = calculateCumulativePnL(trades, 10000);
    expect(cumulative).toHaveLength(2);
    // First point: 200
    expect(cumulative[0].pnl).toBeCloseTo(200);
    // Second point: 200 + 100 = 300
    expect(cumulative[1].pnl).toBeCloseTo(300);
  });

  it("returns empty for all-open trades", () => {
    const trades = [makeTrade({ status: "Open", closePrice: null })];
    const cumulative = calculateCumulativePnL(trades);
    expect(cumulative).toHaveLength(0);
  });
});
