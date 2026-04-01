// ─── Enums & Unions ────────────────────────────────────────────────

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type DrawdownTemperament = "conservative" | "moderate" | "aggressive";

export type Focus = "premium-income" | "accumulation" | "balanced";

export type ActivityLevel = "passive" | "moderate" | "active";

export type AssignmentComfort = "high" | "moderate" | "low";

export type ThesisStatus = "active" | "paused" | "closed";

/**
 * The four states a dot (contract) can be in.
 * From flow 05: Wheel Lifecycle State Machine.
 */
export type DotState = "idle-cash" | "idle-shares" | "csp-active" | "cc-active";

/**
 * Every possible trade event type — maps to state transitions.
 * From flow 05: each event moves a dot from one state to another.
 */
export type TradeEventType =
  | "sell-csp"       // idle-cash → csp-active
  | "assigned"       // csp-active → idle-shares
  | "csp-expired"    // csp-active → idle-cash
  | "csp-closed"     // csp-active → idle-cash
  | "csp-rolled"     // csp-active → csp-active (updated)
  | "sell-cc"        // idle-shares → cc-active
  | "called-away"    // cc-active → idle-cash
  | "cc-expired"     // cc-active → idle-shares
  | "cc-closed"      // cc-active → idle-shares
  | "cc-rolled";     // cc-active → cc-active (updated)

// ─── User Profile ──────────────────────────────────────────────────

export interface UserProfile {
  id?: number;
  name: string;
  experienceLevel: ExperienceLevel;
  motivations: string[];
  incomeGoalMonthly: number | null;
  incomeGoalAnnual: number | null;
  brokerage: string;
  capitalRange: string; // e.g. "$10k-$25k"
  createdAt: string;    // ISO timestamp
}

// ─── Strategy ──────────────────────────────────────────────────────

export interface RiskProfile {
  drawdownTemperament: DrawdownTemperament;
  focus: Focus;
  maxPositionPercent: number; // e.g. 20 = 20% of capital per position
}

export interface TimePreferences {
  dteRange: { min: number; max: number }; // e.g. { min: 30, max: 60 }
}

export interface PositionSizing {
  totalCapital: number; // actual dollar amount for capital utilization calcs
}

export interface StockSelectionCriteria {
  prose: string; // free-form description of what draws them to a stock
}

/**
 * Strategy — versioned via linked list (previousVersionId).
 * Only one strategy has isActive = true at a time.
 */
export interface Strategy {
  id?: number;
  userId: number;
  name: string;
  version: number;
  isActive: boolean;
  riskProfile: RiskProfile;
  timePreferences: TimePreferences;
  positionSizing: PositionSizing;
  deltaRange: { min: number; max: number }; // target delta for CSP/CC entries
  stockSelectionCriteria: StockSelectionCriteria;
  incomeGoal: { monthly: number | null; annual: number | null };
  generalApproach: string; // prose: overall approach to the wheel
  previousVersionId: number | null;
  createdAt: string;
}

// ─── Ticker Thesis ─────────────────────────────────────────────────

export interface ThesisDataFields {
  targetExitPrice: number | null;    // CC strike floor — "sell high"
  targetEntryPrice: number | null;   // CSP strike ceiling — "buy low"
  maxAcceptableLoss: number | null;
  capitalReserved: number;           // how much capital committed to this ticker
  deltaRange: { min: number; max: number };
  dtePreference: { min: number; max: number };
}

export interface ThesisProse {
  conviction: string;     // Why do you believe in this stock?
  invalidation: string;   // What would change your mind?
  timeHorizon: string;    // How long are you willing to hold?
  catalysts: string;      // Upcoming catalysts or events?
}

export interface StrategyAlignment {
  misalignments: string[]; // e.g. ["Price exceeds capital range", "Weekly expiries not available"]
  checkedAt: string;
  overrideReason: string | null; // if user proceeds despite misalignment
}

export interface TickerThesis {
  id?: number;
  userId: number;
  strategyId: number;
  ticker: string;         // e.g. "AAPL"
  name: string;           // e.g. "AAPL Wheel"
  status: ThesisStatus;
  dataFields: ThesisDataFields;
  prose: ThesisProse;
  alignment: StrategyAlignment;
  createdAt: string;
  updatedAt: string;
}

// ─── Wheel ─────────────────────────────────────────────────────────

/**
 * Thin container grouping dots under a thesis.
 * One wheel per thesis.
 */
export interface Wheel {
  id?: number;
  thesisId: number;
  ticker: string;
}

// ─── Dot (Contract) ────────────────────────────────────────────────

export interface Dot {
  id?: number;
  wheelId: number;
  state: DotState;
  isActive: boolean;        // false = soft-deleted / removed from wheel
  label: string;            // e.g. "AAPL $180 3/28" — auto-generated from current contract
  sharePurchasePrice: number | null;  // if holding shares, what did you pay?
  currentStrike: number | null;
  currentExpiry: string | null;       // ISO date
  currentDelta: number | null;
  premiumCollected: number;           // running total for this dot
  effectiveCostBasis: number | null;  // running calc
  createdAt: string;
}

// ─── Trade Event ───────────────────────────────────────────────────

export interface RollDetails {
  previousStrike: number;
  previousExpiry: string;
  previousPremium: number;
  netCredit: number; // positive = credit, negative = debit
}

export interface Deviation {
  field: string;      // which field deviated (e.g. "strike", "delta", "dte")
  expected: string;   // what strategy/thesis says
  actual: string;     // what the trade is
  reason: string;     // user's explanation
}

export interface TradeEvent {
  id?: number;
  dotId: number;
  wheelId: number;
  thesisId: number;
  eventType: TradeEventType;
  strike: number | null;
  premium: number | null;
  expirationDate: string | null;  // ISO date
  dte: number | null;
  deltaAtEntry: number | null;
  assignmentPrice: number | null;
  callAwayPrice: number | null;
  closePrice: number | null;
  rollDetails: RollDetails | null;
  previousState: DotState;
  newState: DotState;
  deviations: Deviation[];
  createdAt: string;
}

// ─── AI Interaction (stub for now) ─────────────────────────────────

export type AIContextType = "thesis-review" | "weekly-insight" | "quarterly-retro" | "strategy-review" | "thesis-checkin";

export interface AIInteraction {
  id?: number;
  userId: number;
  context: AIContextType;
  relatedEntityId: number;
  relatedEntityType: "strategy" | "thesis" | "tradeEvent";
  prompt: string;
  response: string;
  createdAt: string;
}
