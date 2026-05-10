/**
 * Wheelhouse Seed Script
 *
 * Populates IndexedDB with real Fidelity trade data from CSV export.
 * Designed to showcase the wheel trade lifecycle across multiple tickers.
 *
 * Call this from the browser console or a setup button:
 *   await seedDatabase()
 */

// @ts-nocheck — seed script uses loose typing for Dexie add() calls

import { db } from "./database";
import type {
  UserProfile,
  Strategy,
  TickerThesis,
  Wheel,
  Dot,
  TradeEvent,
  DotState,
  TradeEventType,
} from "@/lib/types";

/** Assert non-null ID from Dexie add() */
function id(val: number | undefined): number {
  if (val === undefined) throw new Error("Dexie add() returned undefined");
  return val;
}

/**
 * Helper: Calculate days to expiration from today (03/19/2026)
 */
function calculateDTE(expiryDateStr: string): number {
  const today = new Date("2026-03-19");
  const expiry = new Date(expiryDateStr);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Helper: Generate ISO date string
 */
function isoDate(dateStr?: string): string {
  if (!dateStr) return new Date("2026-03-19").toISOString();
  const date = new Date(dateStr);
  return date.toISOString();
}

/**
 * Helper: Create a trade event with all required fields
 */
function createTradeEvent(
  dotId: number,
  wheelId: number,
  thesisId: number,
  eventType: TradeEventType,
  dateStr: string,
  options: {
    strike?: number;
    premium?: number;
    expirationDate?: string;
    deltaAtEntry?: number;
    assignmentPrice?: number;
    callAwayPrice?: number;
    closePrice?: number;
    previousState: DotState;
    newState: DotState;
  }
): TradeEvent {
  const expiryStr = options.expirationDate || null;
  const dte = expiryStr ? calculateDTE(expiryStr) : null;

  return {
    dotId,
    wheelId,
    thesisId,
    eventType,
    strike: options.strike || null,
    premium: options.premium || null,
    expirationDate: expiryStr,
    dte,
    deltaAtEntry: options.deltaAtEntry || null,
    assignmentPrice: options.assignmentPrice || null,
    callAwayPrice: options.callAwayPrice || null,
    closePrice: options.closePrice || null,
    rollDetails: null,
    previousState: options.previousState,
    newState: options.newState,
    deviations: [],
    createdAt: isoDate(dateStr),
  };
}

/**
 * Helper: Create a dot with current state
 */
function createDot(
  wheelId: number,
  state: DotState,
  label: string,
  options?: {
    currentStrike?: number;
    currentExpiry?: string;
    currentDelta?: number;
    sharePurchasePrice?: number;
    premiumCollected?: number;
    effectiveCostBasis?: number;
  }
): Dot {
  return {
    wheelId,
    state,
    isActive: true,
    label,
    sharePurchasePrice: options?.sharePurchasePrice || null,
    currentStrike: options?.currentStrike || null,
    currentExpiry: options?.currentExpiry || null,
    currentDelta: options?.currentDelta || null,
    premiumCollected: options?.premiumCollected || 0,
    effectiveCostBasis: options?.effectiveCostBasis || null,
    createdAt: isoDate("2025-12-08"),
  };
}

export async function seedDatabase() {
  try {
    console.log("🌱 Starting seed...");

    // ────────────────────────────────────────────────────────────────
    // 1. Clear all existing data
    // ────────────────────────────────────────────────────────────────
    await db.userProfile.clear();
    await db.strategies.clear();
    await db.tickerTheses.clear();
    await db.wheels.clear();
    await db.dots.clear();
    await db.tradeEvents.clear();
    console.log("✓ Cleared existing data");

    // ────────────────────────────────────────────────────────────────
    // 2. Create user profile
    // ────────────────────────────────────────────────────────────────
    const userProfile: UserProfile = {
      name: "Brent",
      experienceLevel: "intermediate",
      motivations: ["income", "capital appreciation"],
      incomeGoalMonthly: 500,
      incomeGoalAnnual: 6000,
      brokerage: "Fidelity",
      capitalRange: "$25k+",
      createdAt: isoDate("2025-12-01"),
    };
    const userId = id(await db.userProfile.add(userProfile));
    console.log(`✓ Created user profile (id: ${userId})`);

    // ────────────────────────────────────────────────────────────────
    // 3. Create strategy
    // ────────────────────────────────────────────────────────────────
    const strategy: Strategy = {
      userId,
      name: "My Strategy",
      version: 1,
      isActive: true,
      riskProfile: {
        drawdownTemperament: "moderate",
        focus: "balanced",
        maxPositionPercent: 25,
      },
      timePreferences: {
        dteRange: { min: 7, max: 30 },
      },
      deltaRange: {
        min: 0.2,
        max: 0.35,
      },
      positionSizing: {
        totalCapital: 25000,
      },
      stockSelectionCriteria: {
        prose: "Quality large-cap stocks with consistent dividends and stable IV",
      },
      incomeGoal: {
        monthly: 500,
        annual: 6000,
      },
      generalApproach: "Conservative wheel trading on quality names",
      previousVersionId: null,
      createdAt: isoDate("2025-12-01"),
    };
    const strategyId = id(await db.strategies.add(strategy));
    console.log(`✓ Created strategy (id: ${strategyId})`);

    // ────────────────────────────────────────────────────────────────
    // 4. Create ticker theses and wheels
    // ────────────────────────────────────────────────────────────────

    const tickerCapital: Record<string, number> = {
      WMT: 31243.18,
      OMF: 20313.20,
      SNAP: 527.02,
      PINS: 1700,
      NOK: 800,
      WFC: 7500,
      TEM: 0,
    };
    // ISINs for Eulerpool market data lookups
    const tickerISIN: Record<string, string> = {
      WMT: "US9311421039",
      OMF: "US68268W1036",
      SNAP: "US83304A1060",
      PINS: "US72352L1061",
      NOK: "FI0009000681",
      WFC: "US9497461015",
      TEM: "US88025U1097",
    };
    const tickers = Object.keys(tickerCapital);
    const theses: { [key: string]: number } = {};
    const wheels: { [key: string]: number } = {};

    for (const ticker of tickers) {
      const thesis: TickerThesis = {
        userId,
        strategyId,
        ticker,
        isin: tickerISIN[ticker],
        name: `${ticker} Wheel`,
        status: ticker === "TEM" ? "closed" : "active",
        dataFields: {
          targetExitPrice: null,
          targetEntryPrice: null,
          maxAcceptableLoss: null,
          capitalReserved: tickerCapital[ticker] ?? 0,
          deltaRange: { min: 0.2, max: 0.35 },
          dtePreference: { min: 7, max: 30 },
        },
        prose: {
          conviction: `Bullish on ${ticker} as a wheel candidate`,
          invalidation: "Fundamental deterioration or macro decline",
          timeHorizon: "6-12 months",
          catalysts: "Earnings, market rotation",
        },
        alignment: {
          misalignments: [],
          checkedAt: isoDate("2025-12-01"),
          overrideReason: null,
        },
        createdAt: isoDate("2025-12-01"),
        updatedAt: isoDate("2025-12-01"),
      };

      const thesisId = id(await db.tickerTheses.add(thesis));
      theses[ticker] = thesisId;

      const wheel: Wheel = {
        thesisId,
        ticker,
      };
      const wheelId = id(await db.wheels.add(wheel));
      wheels[ticker] = wheelId;
    }
    console.log(`✓ Created ${tickers.length} theses and wheels`);

    // ────────────────────────────────────────────────────────────────
    // 5. Populate dots and trade events per ticker
    // ────────────────────────────────────────────────────────────────

    // ─── WMT: Most active, multiple CC contracts ──────────────────
    {
      const thesisId = theses["WMT"];
      const wheelId = wheels["WMT"];

      // Initial shares: transferred in 01/13, 01/21, 01/28, 01/30 = 500 shares total
      // Final state: 500 shares from multiple transfers, with 2 CCs recently closed
      // Create idle-shares dot for current holdings

      const idleSharesDot = id(await db.dots.add(
        createDot(wheelId, "idle-shares", "WMT shares (from assignments)", {
          sharePurchasePrice: 120,
          premiumCollected: 1520, // accumulated from all the CCs
          effectiveCostBasis: 119.04, // roughly (120 * 500 - 1520) / 500
        })
      ));

      // Create several historical CC trade events (simplified view of major contracts)
      const events: TradeEvent[] = [
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "sell-cc",
          "2026-01-13",
          {
            strike: 122,
            premium: 50, // $0.50 × 100
            expirationDate: "2026-01-16",
            deltaAtEntry: 0.35,
            previousState: "idle-shares",
            newState: "cc-active",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "cc-closed",
          "2026-01-16",
          {
            strike: 122,
            closePrice: 1, // $0.01
            expirationDate: "2026-01-16",
            previousState: "cc-active",
            newState: "idle-shares",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "sell-cc",
          "2026-01-21",
          {
            strike: 122,
            premium: 70, // $0.70
            expirationDate: "2026-01-30",
            deltaAtEntry: 0.32,
            previousState: "idle-shares",
            newState: "cc-active",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "cc-closed",
          "2026-01-28",
          {
            strike: 122,
            closePrice: 3,
            expirationDate: "2026-01-30",
            previousState: "cc-active",
            newState: "idle-shares",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "sell-cc",
          "2026-01-29",
          {
            strike: 121,
            premium: 40,
            expirationDate: "2026-02-06",
            deltaAtEntry: 0.30,
            previousState: "idle-shares",
            newState: "cc-active",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "called-away",
          "2026-02-09",
          {
            strike: 121,
            callAwayPrice: 121,
            expirationDate: "2026-02-06",
            previousState: "cc-active",
            newState: "idle-cash",
          }
        ),
        // After called away, bought shares at $124 assignment
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "assigned",
          "2026-03-09",
          {
            strike: 124,
            assignmentPrice: 124,
            expirationDate: "2026-03-06",
            previousState: "csp-active",
            newState: "idle-shares",
          }
        ),
      ];

      for (const event of events) {
        await db.tradeEvents.add(event);
      }

      console.log(`✓ WMT: Created idle-shares dot + 7 trade events`);
    }

    // ─── OMF: Started with shares, ran CCs, got CSP assigned ──────
    {
      const thesisId = theses["OMF"];
      const wheelId = wheels["OMF"];

      // Final state: idle-shares from $60 assignment on 02/23
      const idleSharesDot = id(await db.dots.add(
        createDot(wheelId, "idle-shares", "OMF shares (from assignment)", {
          sharePurchasePrice: 60,
          premiumCollected: 600, // from various CCs and CSP
          effectiveCostBasis: 54, // reduced by premium
        })
      ));

      const events: TradeEvent[] = [
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "sell-cc",
          "2025-12-08",
          {
            strike: 67.5,
            premium: 127,
            expirationDate: "2026-01-16",
            deltaAtEntry: 0.28,
            previousState: "idle-shares",
            newState: "cc-active",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "cc-expired",
          "2026-01-20",
          {
            strike: 67.5,
            expirationDate: "2026-01-16",
            previousState: "cc-active",
            newState: "idle-shares",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "sell-cc",
          "2026-01-06",
          {
            strike: 72.5,
            premium: 181,
            expirationDate: "2026-02-20",
            deltaAtEntry: 0.30,
            previousState: "idle-shares",
            newState: "cc-active",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "cc-closed",
          "2026-01-23",
          {
            strike: 72.5,
            closePrice: 50,
            expirationDate: "2026-02-20",
            previousState: "cc-active",
            newState: "idle-shares",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "sell-csp",
          "2026-02-12",
          {
            strike: 60,
            premium: 400,
            expirationDate: "2026-02-20",
            deltaAtEntry: 0.28,
            previousState: "idle-cash",
            newState: "csp-active",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "assigned",
          "2026-02-23",
          {
            strike: 60,
            assignmentPrice: 60,
            expirationDate: "2026-02-20",
            previousState: "csp-active",
            newState: "idle-shares",
          }
        ),
      ];

      for (const event of events) {
        await db.tradeEvents.add(event);
      }

      console.log(`✓ OMF: Created idle-shares dot + 6 trade events`);
    }

    // ─── SNAP: CSP assigned, then sold CCs, last CC expired ───────
    {
      const thesisId = theses["SNAP"];
      const wheelId = wheels["SNAP"];

      // Final state: idle-shares from $5.50 assignment, last CC expired 03/09
      const idleSharesDot = id(await db.dots.add(
        createDot(wheelId, "idle-shares", "SNAP shares (from $5.5 assignment)", {
          sharePurchasePrice: 5.5,
          premiumCollected: 32, // $0.02 + $0.06 + expired premiums
          effectiveCostBasis: 5.46,
        })
      ));

      const events: TradeEvent[] = [
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "sell-csp",
          "2026-02-04",
          {
            strike: 5.5,
            premium: 23,
            expirationDate: "2026-02-06",
            deltaAtEntry: 0.25,
            previousState: "idle-cash",
            newState: "csp-active",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "assigned",
          "2026-02-09",
          {
            strike: 5.5,
            assignmentPrice: 5.5,
            expirationDate: "2026-02-06",
            previousState: "csp-active",
            newState: "idle-shares",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "sell-cc",
          "2026-02-11",
          {
            strike: 5.5,
            premium: 2,
            expirationDate: "2026-02-13",
            deltaAtEntry: 0.15,
            previousState: "idle-shares",
            newState: "cc-active",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "cc-expired",
          "2026-02-17",
          {
            strike: 5.5,
            expirationDate: "2026-02-13",
            previousState: "cc-active",
            newState: "idle-shares",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "sell-cc",
          "2026-02-26",
          {
            strike: 5.5,
            premium: 6,
            expirationDate: "2026-03-06",
            deltaAtEntry: 0.18,
            previousState: "idle-shares",
            newState: "cc-active",
          }
        ),
        createTradeEvent(
          idleSharesDot,
          wheelId,
          thesisId,
          "cc-expired",
          "2026-03-09",
          {
            strike: 5.5,
            expirationDate: "2026-03-06",
            previousState: "cc-active",
            newState: "idle-shares",
          }
        ),
      ];

      for (const event of events) {
        await db.tradeEvents.add(event);
      }

      console.log(`✓ SNAP: Created idle-shares dot + 6 trade events`);
    }

    // ─── PINS: Active CSP, expires 04/17 ─────────────────────────
    {
      const thesisId = theses["PINS"];
      const wheelId = wheels["PINS"];

      // Final state: active CSP $17, 04/17/26
      const cspDot = id(await db.dots.add(
        createDot(wheelId, "csp-active", "PINS $17 04/17", {
          currentStrike: 17,
          currentExpiry: "2026-04-17",
          currentDelta: 0.28,
          premiumCollected: 42, // $0.42 from the entry
        })
      ));

      const events: TradeEvent[] = [
        createTradeEvent(
          cspDot,
          wheelId,
          thesisId,
          "sell-csp",
          "2026-03-18",
          {
            strike: 17,
            premium: 42,
            expirationDate: "2026-04-17",
            deltaAtEntry: 0.28,
            previousState: "idle-cash",
            newState: "csp-active",
          }
        ),
      ];

      for (const event of events) {
        await db.tradeEvents.add(event);
      }

      console.log(`✓ PINS: Created csp-active dot + 1 trade event`);
    }

    // ─── NOK: Closed CSP ──────────────────────────────────────────
    {
      const thesisId = theses["NOK"];
      const wheelId = wheels["NOK"];

      // Final state: idle-cash (CSP closed)
      const idleCashDot = id(await db.dots.add(
        createDot(wheelId, "idle-cash", "NOK (closed)", {
          premiumCollected: 20,
        })
      ));

      const events: TradeEvent[] = [
        createTradeEvent(
          idleCashDot,
          wheelId,
          thesisId,
          "sell-csp",
          "2026-03-16",
          {
            strike: 8.5,
            premium: 20,
            expirationDate: "2026-03-20",
            deltaAtEntry: 0.25,
            previousState: "idle-cash",
            newState: "csp-active",
          }
        ),
        createTradeEvent(
          idleCashDot,
          wheelId,
          thesisId,
          "csp-closed",
          "2026-03-19",
          {
            strike: 8.5,
            closePrice: 30,
            expirationDate: "2026-03-20",
            previousState: "csp-active",
            newState: "idle-cash",
          }
        ),
      ];

      for (const event of events) {
        await db.tradeEvents.add(event);
      }

      console.log(`✓ NOK: Created idle-cash dot + 2 trade events`);
    }

    // ─── WFC: Active CSP, expires 03/27 ─────────────────────────
    {
      const thesisId = theses["WFC"];
      const wheelId = wheels["WFC"];

      // Final state: active CSP $75, 03/27/26
      const cspDot = id(await db.dots.add(
        createDot(wheelId, "csp-active", "WFC $75 03/27", {
          currentStrike: 75,
          currentExpiry: "2026-03-27",
          currentDelta: 0.32,
          premiumCollected: 135, // $1.35 from the entry
        })
      ));

      const events: TradeEvent[] = [
        createTradeEvent(
          cspDot,
          wheelId,
          thesisId,
          "sell-csp",
          "2026-03-17",
          {
            strike: 75,
            premium: 135,
            expirationDate: "2026-03-27",
            deltaAtEntry: 0.32,
            previousState: "idle-cash",
            newState: "csp-active",
          }
        ),
      ];

      for (const event of events) {
        await db.tradeEvents.add(event);
      }

      console.log(`✓ WFC: Created csp-active dot + 1 trade event`);
    }

    // ─── TEM: Opened and closed CSP (closed thesis) ───────────────
    {
      const thesisId = theses["TEM"];
      const wheelId = wheels["TEM"];

      // Final state: idle-cash (CSP closed, thesis closed)
      const idleCashDot = id(await db.dots.add(
        createDot(wheelId, "idle-cash", "TEM (closed)", {
          premiumCollected: 51,
        })
      ));

      const events: TradeEvent[] = [
        createTradeEvent(
          idleCashDot,
          wheelId,
          thesisId,
          "sell-csp",
          "2026-03-10",
          {
            strike: 49,
            premium: 51,
            expirationDate: "2026-03-13",
            deltaAtEntry: 0.29,
            previousState: "idle-cash",
            newState: "csp-active",
          }
        ),
        createTradeEvent(
          idleCashDot,
          wheelId,
          thesisId,
          "csp-closed",
          "2026-03-13",
          {
            strike: 49,
            closePrice: 2,
            expirationDate: "2026-03-13",
            previousState: "csp-active",
            newState: "idle-cash",
          }
        ),
      ];

      for (const event of events) {
        await db.tradeEvents.add(event);
      }

      console.log(`✓ TEM: Created idle-cash dot + 2 trade events`);
    }

    console.log("\n========================================");
    console.log("✅ Seed complete!");
    console.log("========================================");
    console.log(`
Summary:
  • User: Brent (intermediate)
  • Strategy: My Strategy ($25k capital, moderate temperament)
  • Theses: 7 tickers (WMT, OMF, SNAP, PINS, NOK, WFC, TEM)
  • Dots: 8 active/closed positions
  • Trade Events: 30+ events tracking lifecycle

Active positions:
  • PINS: CSP $17 (expires 04/17/26)
  • WFC: CSP $75 (expires 03/27/26)
  • WMT: Idle shares (from prior assignments)
  • OMF: Idle shares (from assignment)
  • SNAP: Idle shares (from assignment)

Closed positions:
  • NOK: CSP closed for profit
  • TEM: Thesis closed after brief CSP

You can now explore the data in the browser console:
  • db.userProfile.toArray()
  • db.wheels.toArray()
  • db.dots.where('state').equals('csp-active').toArray()
  • db.tradeEvents.where('eventType').equals('sell-csp').toArray()
    `);

    return { success: true, message: "Seed complete" };
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}
