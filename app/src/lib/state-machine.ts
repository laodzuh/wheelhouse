import type { DotState, TradeEventType } from "./types";

/**
 * Wheel Lifecycle State Machine (flow 05).
 *
 * A dot is always in exactly one of four states.
 * Only valid transitions are possible.
 * This file defines the rules — the UI reads from it.
 */

export interface Action {
  eventType: TradeEventType;
  label: string;
  description: string;
  fromState: DotState;
  toState: DotState;
  /** Which fields the trade entry form needs for this action */
  fields: ActionField[];
}

export type ActionField =
  | "strike"
  | "premium"
  | "expirationDate"
  | "deltaAtEntry"
  | "assignmentPrice"
  | "callAwayPrice"
  | "closePrice"
  | "rollStrike"
  | "rollExpiration"
  | "rollPremium";

/**
 * All valid actions indexed by current dot state.
 */
export const ACTIONS: Record<DotState, Action[]> = {
  "idle-cash": [
    {
      eventType: "sell-csp",
      label: "Sell CSP",
      description: "Sell a cash-secured put",
      fromState: "idle-cash",
      toState: "csp-active",
      fields: ["strike", "premium", "expirationDate", "deltaAtEntry"],
    },
  ],
  "idle-shares": [
    {
      eventType: "sell-cc",
      label: "Sell CC",
      description: "Sell a covered call",
      fromState: "idle-shares",
      toState: "cc-active",
      fields: ["strike", "premium", "expirationDate", "deltaAtEntry"],
    },
  ],
  "csp-active": [
    {
      eventType: "assigned",
      label: "Assigned",
      description: "Put was assigned — you bought 100 shares",
      fromState: "csp-active",
      toState: "idle-shares",
      fields: ["assignmentPrice"],
    },
    {
      eventType: "csp-expired",
      label: "Expired",
      description: "Put expired worthless — you keep the premium",
      fromState: "csp-active",
      toState: "idle-cash",
      fields: [],
    },
    {
      eventType: "csp-closed",
      label: "Closed",
      description: "Bought back the put to close",
      fromState: "csp-active",
      toState: "idle-cash",
      fields: ["closePrice"],
    },
    {
      eventType: "csp-rolled",
      label: "Rolled",
      description: "Closed current put and opened a new one",
      fromState: "csp-active",
      toState: "csp-active",
      fields: ["closePrice", "rollStrike", "rollExpiration", "rollPremium", "deltaAtEntry"],
    },
  ],
  "cc-active": [
    {
      eventType: "called-away",
      label: "Called Away",
      description: "Call was exercised — shares sold",
      fromState: "cc-active",
      toState: "idle-cash",
      fields: ["callAwayPrice"],
    },
    {
      eventType: "cc-expired",
      label: "Expired",
      description: "Call expired worthless — you keep shares and premium",
      fromState: "cc-active",
      toState: "idle-shares",
      fields: [],
    },
    {
      eventType: "cc-closed",
      label: "Closed",
      description: "Bought back the call to close",
      fromState: "cc-active",
      toState: "idle-shares",
      fields: ["closePrice"],
    },
    {
      eventType: "cc-rolled",
      label: "Rolled",
      description: "Closed current call and opened a new one",
      fromState: "cc-active",
      toState: "cc-active",
      fields: ["closePrice", "rollStrike", "rollExpiration", "rollPremium", "deltaAtEntry"],
    },
  ],
};

/**
 * Get valid actions for a dot based on its current state.
 */
export function getValidActions(state: DotState): Action[] {
  return ACTIONS[state];
}

/**
 * Calculate DTE from an expiration date string.
 */
export function calculateDTE(expirationDate: string): number {
  const expiry = new Date(expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
