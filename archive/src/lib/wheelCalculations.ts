import type { Trade, Position } from "@/db/types";
import { calculateOptionPnL } from "./calculations";

const MULTIPLIER = 100;

function cents(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface PositionStats {
  position: Position;
  legs: Trade[];
  totalPremium: number;
  totalFees: number;
  netOptionIncome: number;
  netCostBasis: number | null;
  unrealizedPnL: number | null;
  optionPnL: number;
  sharesPnL: number;
  totalPnL: number;
  annualizedYield: number;
  daysActive: number;
  putLegs: number;
  callLegs: number;
}

export function calculatePositionStats(
  position: Position,
  legs: Trade[]
): PositionStats {
  let totalPremium = 0;
  let totalFees = 0;
  let optionPnL = 0;
  let netOptionIncome = 0;
  let putLegs = 0;
  let callLegs = 0;

  for (const leg of legs) {
    const premium = leg.premiumPerContract * leg.contracts * MULTIPLIER;
    totalPremium = cents(totalPremium + premium);
    totalFees = cents(totalFees + leg.fees);

    if (leg.optionType === "Put") putLegs++;
    else callLegs++;

    const legPnL = calculateOptionPnL(leg);
    if (legPnL != null) {
      optionPnL = cents(optionPnL + legPnL);
      netOptionIncome = cents(netOptionIncome + legPnL);
    } else if (leg.status === "Open") {
      if (leg.action === "Sell to Open") {
        netOptionIncome = cents(netOptionIncome + premium - leg.fees);
      } else {
        netOptionIncome = cents(netOptionIncome - premium - leg.fees);
      }
    }
  }

  // Shares P&L from position data
  let sharesPnL = 0;
  if (position.soldPrice != null && position.shareCostBasis != null && position.shareCount != null) {
    sharesPnL = cents((position.soldPrice - position.shareCostBasis) * position.shareCount);
  }

  const totalPnL = cents(optionPnL + sharesPnL);

  // Net cost basis: assignment strike minus net option income per share
  let netCostBasis: number | null = null;
  if (position.shareCostBasis != null && position.shareCount && position.shareCount > 0) {
    netCostBasis = cents(
      position.shareCostBasis - netOptionIncome / position.shareCount
    );
  }

  // Days active
  const endDate = position.completedDate
    ? new Date(position.completedDate)
    : new Date();
  const daysActive = Math.max(
    1,
    Math.round(
      (endDate.getTime() - new Date(position.entryDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  // Annualized yield: net option income / capital at risk, annualized
  const capitalAtRisk =
    position.shareCostBasis != null && position.shareCount
      ? position.shareCostBasis * position.shareCount
      : 0;
  const annualizedYield =
    capitalAtRisk > 0 ? ((netOptionIncome / capitalAtRisk) * 365) / daysActive * 100 : 0;

  // Unrealized P&L (only when holding shares)
  const netPremium = totalPremium - totalFees;
  const unrealizedPnL =
    position.phase === "holding_shares" ? cents(netPremium) : null;

  return {
    position,
    legs,
    totalPremium,
    totalFees,
    netOptionIncome,
    netCostBasis,
    unrealizedPnL,
    optionPnL,
    sharesPnL,
    totalPnL,
    annualizedYield,
    daysActive,
    putLegs,
    callLegs,
  };
}

export interface PortfolioStats {
  active: number;
  completed: number;
  totalPremiumCollected: number;
  totalCapitalDeployed: number;
  assignmentRate: number;
  avgDaysPerPosition: number;
  avgPremiumPerPosition: number;
}

export function calculatePortfolioStats(
  positions: Position[],
  allLegs: Map<string, Trade[]>
): PortfolioStats {
  let active = 0;
  let completed = 0;
  let totalPremium = 0;
  let totalCapital = 0;
  let totalDays = 0;
  let assignedCount = 0;
  let wheelPositions = 0;

  for (const pos of positions) {
    const legs = allLegs.get(pos.id) ?? [];
    const stats = calculatePositionStats(pos, legs);

    if (pos.phase === "completed") {
      completed++;
    } else {
      active++;
    }

    totalPremium = cents(totalPremium + stats.totalPremium - stats.totalFees);
    totalDays += stats.daysActive;

    if (pos.shareCostBasis != null && pos.shareCount) {
      totalCapital = cents(totalCapital + pos.shareCostBasis * pos.shareCount);
    }

    if (pos.strategy === "wheel") {
      wheelPositions++;
      if (pos.phase !== "selling_puts") {
        assignedCount++;
      }
    }
  }

  const total = positions.length;

  return {
    active,
    completed,
    totalPremiumCollected: totalPremium,
    totalCapitalDeployed: totalCapital,
    assignmentRate: wheelPositions > 0 ? (assignedCount / wheelPositions) * 100 : 0,
    avgDaysPerPosition: total > 0 ? Math.round(totalDays / total) : 0,
    avgPremiumPerPosition: total > 0 ? cents(totalPremium / total) : 0,
  };
}
