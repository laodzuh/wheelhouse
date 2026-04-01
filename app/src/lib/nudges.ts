import type { Strategy, ThesisDataFields } from "./types";

/**
 * Smart Nudges — Tier 1 (Rule-Based)
 *
 * From flow 04: "Inline, subtle, contextual (not pop-ups).
 * Reference the user's own words. Never advise; always reflect."
 *
 * These are pure comparisons. No API calls, instant response.
 * Each nudge references back to the user's strategy or thesis.
 */

export interface Nudge {
  type: "info" | "warning" | "flag";
  message: string;
}

// ─── Trade Entry Nudges ────────────────────────────────────────────

/**
 * Check a trade's delta against strategy and per-ticker ranges.
 */
export function checkDelta(
  delta: number,
  strategy: Strategy,
  thesis: ThesisDataFields
): Nudge | null {
  const range = thesis.deltaRange || strategy.deltaRange;
  if (delta < range.min) {
    return {
      type: "flag",
      message: `Delta ${delta} is below your range (${range.min}–${range.max}). Lower delta = less premium, less assignment risk.`,
    };
  }
  if (delta > range.max) {
    return {
      type: "flag",
      message: `Delta ${delta} is above your range (${range.min}–${range.max}). Higher delta = more premium, but more likely to be assigned.`,
    };
  }
  return null;
}

/**
 * Check a trade's DTE against strategy and per-ticker ranges.
 */
export function checkDTE(
  dte: number,
  strategy: Strategy,
  thesis: ThesisDataFields
): Nudge | null {
  const range = thesis.dtePreference || strategy.timePreferences.dteRange;
  if (dte < range.min) {
    return {
      type: "flag",
      message: `${dte} DTE is shorter than your preference (${range.min}–${range.max} days). Shorter = faster turnover but less theta.`,
    };
  }
  if (dte > range.max) {
    return {
      type: "flag",
      message: `${dte} DTE is longer than your preference (${range.min}–${range.max} days). Longer = more theta but ties up capital.`,
    };
  }
  return null;
}

/**
 * Check CSP strike against thesis target entry price.
 * CSP strike should be at or below target entry ("buy low").
 */
export function checkCSPStrike(
  strike: number,
  thesis: ThesisDataFields
): Nudge | null {
  if (thesis.targetEntryPrice === null) return null;
  if (strike > thesis.targetEntryPrice) {
    return {
      type: "warning",
      message: `Strike $${strike} is above your target entry of $${thesis.targetEntryPrice}. Your thesis says to buy at or below that price.`,
    };
  }
  return null;
}

/**
 * Check CC strike against thesis target exit price.
 * CC strike should be at or above target exit ("sell high").
 */
export function checkCCStrike(
  strike: number,
  thesis: ThesisDataFields
): Nudge | null {
  if (thesis.targetExitPrice === null) return null;
  if (strike < thesis.targetExitPrice) {
    return {
      type: "warning",
      message: `Strike $${strike} is below your target exit of $${thesis.targetExitPrice}. Your thesis says to sell at or above that price.`,
    };
  }
  return null;
}

/**
 * Collect all applicable nudges for a trade being entered.
 */
export function getTradeNudges(params: {
  eventType: string;
  strike: number | null;
  delta: number | null;
  dte: number | null;
  strategy: Strategy;
  thesis: ThesisDataFields;
}): Nudge[] {
  const nudges: Nudge[] = [];
  const { eventType, strike, delta, dte, strategy, thesis } = params;

  if (delta !== null) {
    const n = checkDelta(delta, strategy, thesis);
    if (n) nudges.push(n);
  }

  if (dte !== null) {
    const n = checkDTE(dte, strategy, thesis);
    if (n) nudges.push(n);
  }

  if (strike !== null) {
    if (eventType === "sell-csp") {
      const n = checkCSPStrike(strike, thesis);
      if (n) nudges.push(n);
    } else if (eventType === "sell-cc") {
      const n = checkCCStrike(strike, thesis);
      if (n) nudges.push(n);
    }
  }

  return nudges;
}

// ─── Dashboard Nudges ──────────────────────────────────────────────

export interface DashboardNudge {
  type: "info" | "warning" | "action";
  message: string;
  tickerId?: number;
  ticker?: string;
}

/**
 * Comprehensive Tier 1 dashboard nudges.
 * These are pure rule-based checks — no API calls, instant response.
 *
 * Checks for:
 * - Contracts nearing expiry or already expired
 * - Idle capital (< 50% deployed)
 * - Idle shares without an active covered call
 * - Position concentration (single ticker > maxPositionPercent)
 * - Stale theses (not updated in 30+ days)
 */
export function getDashboardNudges(params: {
  dots: Array<{
    state: string;
    currentExpiry: string | null;
    wheelId: number;
    createdAt: string;
  }>;
  totalCapital: number;
  capitalDeployed: number;
  theses: Array<{
    id?: number;
    ticker: string;
    status: string;
    dataFields: { capitalReserved: number };
    updatedAt: string;
  }>;
  maxPositionPercent?: number;
}): DashboardNudge[] {
  const nudges: DashboardNudge[] = [];
  const { dots, totalCapital, capitalDeployed, theses, maxPositionPercent } = params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Expiring contracts ────────────────────────────────────────
  for (const dot of dots) {
    if (!dot.currentExpiry) continue;
    if (dot.state !== "csp-active" && dot.state !== "cc-active") continue;

    const expiry = new Date(dot.currentExpiry);
    expiry.setHours(0, 0, 0, 0);
    const daysLeft = Math.round(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft <= 0) {
      nudges.push({
        type: "warning",
        message: `You have a contract that expired or expires today. Time to log the outcome.`,
      });
    } else if (daysLeft <= 3) {
      nudges.push({
        type: "info",
        message: `A contract expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Keep an eye on it.`,
      });
    }
  }

  // ── Idle shares without a covered call ────────────────────────
  // Group dots by wheelId to find theses with idle shares but no active CC
  const idleSharesDots = dots.filter((d) => d.state === "idle-shares");
  for (const dot of idleSharesDots) {
    const hasActiveCC = dots.some(
      (d) => d.wheelId === dot.wheelId && d.state === "cc-active"
    );
    if (!hasActiveCC) {
      // Find the ticker name from theses via wheelId match
      // (we don't have direct wheel→thesis mapping here, but idle shares
      //  with no CC is worth flagging regardless)
      const daysSinceCreated = Math.round(
        (today.getTime() - new Date(dot.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysSinceCreated >= 3) {
        nudges.push({
          type: "action",
          message: `You have idle shares that haven't had a covered call in ${daysSinceCreated} days. Opportunity to collect premium?`,
        });
      }
    }
  }

  // ── Idle capital ──────────────────────────────────────────────
  if (totalCapital > 0) {
    const utilization = capitalDeployed / totalCapital;
    if (utilization < 0.5 && theses.length > 0) {
      const idle = totalCapital - capitalDeployed;
      nudges.push({
        type: "action",
        message: `$${idle.toLocaleString()} of your capital is idle. Consider adding a new wheel or contract.`,
      });
    }
  }

  // ── Position concentration ────────────────────────────────────
  const maxPct = maxPositionPercent ?? 25;
  if (totalCapital > 0) {
    for (const thesis of theses) {
      if (thesis.status !== "active") continue;
      const pct = (thesis.dataFields.capitalReserved / totalCapital) * 100;
      if (pct > maxPct) {
        nudges.push({
          type: "warning",
          tickerId: thesis.id,
          ticker: thesis.ticker,
          message: `${thesis.ticker} uses ${pct.toFixed(0)}% of your capital — above your ${maxPct}% position limit.`,
        });
      }
    }
  }

  // ── Stale theses (not updated in 30+ days) ────────────────────
  for (const thesis of theses) {
    if (thesis.status !== "active") continue;
    const daysSinceUpdate = Math.round(
      (today.getTime() - new Date(thesis.updatedAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSinceUpdate >= 30) {
      nudges.push({
        type: "info",
        tickerId: thesis.id,
        ticker: thesis.ticker,
        message: `Your ${thesis.ticker} thesis hasn't been reviewed in ${daysSinceUpdate} days. Still feeling convicted?`,
      });
    }
  }

  return nudges;
}
