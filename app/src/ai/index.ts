/**
 * AI Integration Layer — Stubs for Tier 2 (single-turn) touchpoints.
 *
 * From flow 09: Most AI value comes from single turns, not conversations.
 * These stubs define the interface for each AI touchpoint so the
 * architecture is ready when the Anthropic API gets wired in.
 *
 * Each function takes structured context and returns a structured response.
 * For now they return placeholder text.
 */

// ─── Thesis Review ─────────────────────────────────────────────────

export interface ThesisReviewInput {
  ticker: string;
  conviction: string;
  invalidation: string;
  timeHorizon: string;
  targetEntry: number | null;
  targetExit: number | null;
  deltaRange: { min: number; max: number };
  strategyFocus: string;
  strategyTemperament: string;
}

export interface ThesisReviewCard {
  type: "flag" | "question" | "affirmation";
  message: string;
}

export async function reviewThesis(
  _input: ThesisReviewInput
): Promise<ThesisReviewCard[]> {
  // Stub — will call Claude Sonnet via Anthropic API
  return [
    {
      type: "affirmation",
      message: "AI thesis review will be available in a future update. For now, your thesis has been saved.",
    },
  ];
}

// ─── Weekly Insight ────────────────────────────────────────────────

export interface WeeklyInsightInput {
  tradesThisWeek: number;
  premiumThisWeek: number;
  deviations: Array<{ field: string; reason: string }>;
  activeTheses: number;
}

export async function generateWeeklyInsight(
  _input: WeeklyInsightInput
): Promise<string> {
  // Stub — will call Claude Haiku for cost-efficient weekly summaries
  return "Weekly AI insights will be available in a future update.";
}

// ─── Strategy Review ───────────────────────────────────────────────

export interface StrategyReviewInput {
  currentStrategy: {
    name: string;
    deltaRange: { min: number; max: number };
    dteRange: { min: number; max: number };
    maxPositionPercent: number;
    focus: string;
    temperament: string;
  };
  proposedChanges: Record<string, unknown>;
  tradeHistory: {
    totalTrades: number;
    deviationCount: number;
    commonDeviations: string[];
  };
}

export async function reviewStrategyChange(
  _input: StrategyReviewInput
): Promise<string> {
  // Stub — will call Claude Sonnet with full context
  return "AI strategy review will be available in a future update.";
}

// ─── Thesis Check-In ───────────────────────────────────────────────

export interface ThesisCheckInInput {
  ticker: string;
  daysSinceCreated: number;
  conviction: string;
  invalidation: string;
  premiumCollected: number;
  tradeCount: number;
}

export async function checkInOnThesis(
  _input: ThesisCheckInInput
): Promise<string | null> {
  // Stub — will call Claude Haiku to generate periodic check-in prompts
  // Returns null if no check-in is needed
  return null;
}

// ─── Quarterly Retrospective (Tier 3 — Conversation) ──────────────

export interface QuarterlyRetroInput {
  quarterStart: string;
  quarterEnd: string;
  totalPremium: number;
  totalTrades: number;
  thesesReviewed: number;
  deviationPatterns: Array<{ pattern: string; count: number }>;
  strategyChanges: number;
  goalProgress: number; // percentage toward income goal
}

export async function generateQuarterlyReport(
  _input: QuarterlyRetroInput
): Promise<string> {
  // Stub — will call Claude Sonnet for pre-generated analysis
  // Phase 2: followed by Tier 3 conversational chat
  return "Quarterly retrospective will be available in a future update.";
}
