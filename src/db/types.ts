export const OPTION_TYPES = ["Call", "Put"] as const;
export type OptionType = (typeof OPTION_TYPES)[number];

export const ACTIONS = [
  "Buy to Open",
  "Sell to Open",
  "Buy to Close",
  "Sell to Close",
] as const;
export type Action = (typeof ACTIONS)[number];

export const STATUSES = [
  "Open",
  "Closed (Win)",
  "Closed (Loss)",
  "Expired",
  "Assigned",
  "Rolled",
] as const;
export type Status = (typeof STATUSES)[number];

export const STRATEGIES = [
  "Long Call",
  "Long Put",
  "Covered Call",
  "Cash Secured Put",
  "Bull Call Spread",
  "Bear Put Spread",
  "Iron Condor",
  "Iron Butterfly",
  "Straddle",
  "Strangle",
  "Calendar Spread",
  "Diagonal Spread",
  "Butterfly Spread",
  "Collar",
  "Wheel",
  "Other",
] as const;
export type Strategy = (typeof STRATEGIES)[number];

export interface Account {
  id: string;
  name: string;
  size: number;
}

export interface Trade {
  id: string;
  groupId: string | null;
  dateOpened: string;
  dateClosed: string | null;
  ticker: string;
  optionType: OptionType;
  action: Action;
  strikePrice: number;
  expirationDate: string;
  contracts: number;
  premiumPerContract: number;
  closePrice: number | null;
  underlyingPriceAtEntry: number;
  underlyingPriceAtExit: number | null;
  fees: number;
  strategy: string;
  notes: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  assignedShares: number | null;
  assignedCostBasis: number | null;
  sharesSoldPrice: number | null;
  sharesSoldDate: string | null;
  sharesPnL: number | null;
  accountId: string | null;
}
