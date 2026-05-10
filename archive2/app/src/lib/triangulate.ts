import type {
  DrawdownTemperament,
  Focus,
  RiskProfile,
  TimePreferences,
  PositionSizing,
} from "./types";

/**
 * Triangulation engine.
 *
 * Takes personality-level answers and derives technical parameters.
 */

// ─── Risk Profile ──────────────────────────────────────────────────

export function deriveRiskProfile(
  temperament: DrawdownTemperament,
  focus: Focus,
): RiskProfile {
  const positionMap: Record<DrawdownTemperament, Record<Focus, number>> = {
    conservative: { "premium-income": 15, "accumulation": 10, "balanced": 12 },
    moderate:     { "premium-income": 25, "accumulation": 15, "balanced": 20 },
    aggressive:   { "premium-income": 35, "accumulation": 20, "balanced": 25 },
  };

  return {
    drawdownTemperament: temperament,
    focus,
    maxPositionPercent: positionMap[temperament][focus],
  };
}

// ─── Time Preferences (DTE from temperament) ───────────────────────

/**
 * Derives a sensible DTE default from temperament.
 * Conservative → longer (less management), aggressive → shorter (more turnover).
 * User can always override at the reveal.
 */
export function deriveTimePreferences(
  temperament: DrawdownTemperament,
): TimePreferences {
  const dteMap: Record<DrawdownTemperament, { min: number; max: number }> = {
    conservative: { min: 35, max: 50 },
    moderate:     { min: 25, max: 40 },
    aggressive:   { min: 14, max: 30 },
  };

  return {
    dteRange: dteMap[temperament],
  };
}

// ─── Delta Range ───────────────────────────────────────────────────

export function deriveDeltaRange(
  temperament: DrawdownTemperament,
  focus: Focus
): { min: number; max: number } {
  if (focus === "accumulation") {
    return { min: 0.15, max: 0.25 };
  }
  if (focus === "premium-income") {
    const map: Record<DrawdownTemperament, { min: number; max: number }> = {
      conservative: { min: 0.20, max: 0.30 },
      moderate:     { min: 0.25, max: 0.35 },
      aggressive:   { min: 0.30, max: 0.40 },
    };
    return map[temperament];
  }
  return { min: 0.20, max: 0.30 };
}

// ─── Bundled derivation ────────────────────────────────────────────

export interface DerivedStrategy {
  riskProfile: RiskProfile;
  timePreferences: TimePreferences;
  positionSizing: PositionSizing;
  deltaRange: { min: number; max: number };
}

export function deriveStrategy(params: {
  temperament: DrawdownTemperament;
  focus: Focus;
  totalCapital: number;
}): DerivedStrategy {
  const riskProfile = deriveRiskProfile(params.temperament, params.focus);
  const timePreferences = deriveTimePreferences(params.temperament);
  const deltaRange = deriveDeltaRange(params.temperament, params.focus);

  return {
    riskProfile,
    timePreferences,
    positionSizing: { totalCapital: params.totalCapital },
    deltaRange,
  };
}

// ─── Reveal params (editable) ──────────────────────────────────────

export interface RevealParam {
  key: string;
  label: string;
  explanation: string;
  tooltip: string;
  editType: "range" | "number" | "percent" | "currency";
  value: number | { min: number; max: number };
  displayValue: string;
}

export function generateRevealParams(strategy: DerivedStrategy): RevealParam[] {
  const { riskProfile, timePreferences, positionSizing, deltaRange } = strategy;

  return [
    {
      key: "totalCapital",
      label: "Total Capital",
      displayValue: `$${positionSizing.totalCapital.toLocaleString()}`,
      explanation: "Your capital available for wheeling. Drives all utilization calculations.",
      tooltip: "The total amount you have for running wheels. Combined with max position size, this determines how much you can commit per ticker.",
      editType: "currency",
      value: positionSizing.totalCapital,
    },
    {
      key: "maxPositionPercent",
      label: "Max Position Size",
      displayValue: `${riskProfile.maxPositionPercent}% of capital`,
      explanation: "The most you'll commit to any single ticker.",
      tooltip: "Limits how much of your total capital any one wheel can use. At $50k capital with 20% max, you'd commit up to $10k per ticker.",
      editType: "percent",
      value: riskProfile.maxPositionPercent,
    },
    {
      key: "dteRange",
      label: "DTE Range",
      displayValue: `${timePreferences.dteRange.min}–${timePreferences.dteRange.max} days`,
      explanation: "How long your contracts run before expiring.",
      tooltip: "Days to Expiration. Longer = more time for theta decay but ties up capital longer. Shorter = quicker turnover but more management.",
      editType: "range",
      value: timePreferences.dteRange,
    },
    {
      key: "deltaRange",
      label: "Delta Range",
      displayValue: `${deltaRange.min} – ${deltaRange.max}`,
      explanation: `Balances your ${riskProfile.focus.replace("-", " ")} focus with your ${riskProfile.drawdownTemperament} risk comfort.`,
      tooltip: "Delta measures the probability of assignment. Higher delta = more premium but more likely to be assigned shares.",
      editType: "range",
      value: deltaRange,
    },
  ];
}
