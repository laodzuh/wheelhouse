import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProgressBar } from "@/components/ProgressBar";
import { OnboardingCard } from "@/components/OnboardingCard";
import { useUserProfile, useActiveStrategy } from "@/db";
import { db } from "@/db";

const TOTAL_STEPS = 4;

// ─── State ─────────────────────────────────────────────────────────

interface ThesisFormState {
  ticker: string;
  name: string;
  // Prose
  conviction: string;
  invalidation: string;
  timeHorizon: string;
  catalysts: string;
  // Data fields
  targetEntryPrice: string;
  targetExitPrice: string;
  maxAcceptableLoss: string;
  deltaMin: string;
  deltaMax: string;
  dteMin: string;
  dteMax: string;
}

// ─── Component ─────────────────────────────────────────────────────

export function NewThesis() {
  const profile = useUserProfile();
  const strategy = useActiveStrategy();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<ThesisFormState | null>(null);

  if (profile === undefined || strategy === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-wh-text-muted">Loading...</div>
      </div>
    );
  }

  if (!strategy || !profile) {
    navigate("/");
    return null;
  }

  // Initialize form with strategy defaults once loaded
  if (!state) {
    setState({
      ticker: "",
      name: "",
      conviction: "",
      invalidation: "",
      timeHorizon: "",
      catalysts: "",
      targetEntryPrice: "",
      targetExitPrice: "",
      maxAcceptableLoss: "",
      deltaMin: String(strategy.deltaRange.min),
      deltaMax: String(strategy.deltaRange.max),
      dteMin: String(strategy.timePreferences.dteRange.min),
      dteMax: String(strategy.timePreferences.dteRange.max),
    });
    return null;
  }

  const update = <K extends keyof ThesisFormState>(key: K, value: ThesisFormState[K]) =>
    setState((prev) => prev ? { ...prev, [key]: value } : prev);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => {
    if (step === 1) {
      navigate("/");
    } else {
      setStep((s) => s - 1);
    }
  };

  const save = async () => {
    const now = new Date().toISOString();

    // Create the thesis
    const thesisId = await db.tickerTheses.add({
      userId: profile.id!,
      strategyId: strategy.id!,
      ticker: state.ticker.toUpperCase(),
      name: state.name || `${state.ticker.toUpperCase()} Wheel`,
      status: "active",
      dataFields: {
        targetEntryPrice: state.targetEntryPrice ? parseFloat(state.targetEntryPrice) : null,
        targetExitPrice: state.targetExitPrice ? parseFloat(state.targetExitPrice) : null,
        maxAcceptableLoss: state.maxAcceptableLoss ? parseFloat(state.maxAcceptableLoss) : null,
        capitalReserved: 0, // computed from trades — grows as contracts are added
        deltaRange: {
          min: parseFloat(state.deltaMin) || strategy.deltaRange.min,
          max: parseFloat(state.deltaMax) || strategy.deltaRange.max,
        },
        dtePreference: {
          min: parseInt(state.dteMin) || strategy.timePreferences.dteRange.min,
          max: parseInt(state.dteMax) || strategy.timePreferences.dteRange.max,
        },
      },
      prose: {
        conviction: state.conviction,
        invalidation: state.invalidation,
        timeHorizon: state.timeHorizon,
        catalysts: state.catalysts,
      },
      alignment: {
        misalignments: [],
        checkedAt: now,
        overrideReason: null,
      },
      createdAt: now,
      updatedAt: now,
    });

    // Create the wheel (dots are created when trades are entered)
    await db.wheels.add({
      thesisId,
      ticker: state.ticker.toUpperCase(),
    });

    navigate(`/thesis/${thesisId}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="mb-8 w-full max-w-lg">
        <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />
      </div>

      {/* Step 1: Ticker */}
      {step === 1 && (
        <OnboardingCard
          headline="What stock do you want to wheel?"
          onNext={next}
          onBack={back}
          nextDisabled={!state.ticker.trim()}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-wh-text-muted">
                Ticker symbol
              </label>
              <input
                type="text"
                value={state.ticker}
                onChange={(e) => update("ticker", e.target.value.toUpperCase())}
                placeholder="e.g. AAPL, MSFT, SOFI"
                maxLength={5}
                className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-4 py-3 text-2xl font-bold uppercase text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-wh-text-muted">
                Name this wheel <span className="opacity-50">(optional)</span>
              </label>
              <input
                type="text"
                value={state.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder={state.ticker ? `${state.ticker.toUpperCase()} Wheel` : "e.g. AAPL Income Wheel"}
                className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-4 py-2.5 text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
              />
            </div>
          </div>
        </OnboardingCard>
      )}

      {/* Step 2: Conviction (prose) */}
      {step === 2 && (
        <OnboardingCard
          headline={`Why ${state.ticker}?`}
          subtext="This is your conviction narrative. There are no wrong answers — just capture how you're thinking right now."
          onNext={next}
          onBack={back}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-wh-text-muted">
                Why do you believe in this stock?
              </label>
              <textarea
                value={state.conviction}
                onChange={(e) => update("conviction", e.target.value)}
                placeholder="What makes this a good stock to wheel? What's the thesis?"
                rows={3}
                className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-4 py-3 text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-wh-text-muted">
                What would change your mind?
              </label>
              <textarea
                value={state.invalidation}
                onChange={(e) => update("invalidation", e.target.value)}
                placeholder="What would make you stop wheeling this stock?"
                rows={2}
                className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-4 py-3 text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-wh-text-muted">
                How long are you willing to hold if assigned?
              </label>
              <input
                type="text"
                value={state.timeHorizon}
                onChange={(e) => update("timeHorizon", e.target.value)}
                placeholder="e.g. 6 months, indefinitely, through next earnings"
                className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-4 py-2.5 text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-wh-text-muted">
                Any upcoming catalysts? <span className="opacity-50">(optional)</span>
              </label>
              <input
                type="text"
                value={state.catalysts}
                onChange={(e) => update("catalysts", e.target.value)}
                placeholder="e.g. earnings in 3 weeks, product launch, FDA approval"
                className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-4 py-2.5 text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
              />
            </div>
          </div>
        </OnboardingCard>
      )}

      {/* Step 3: Data fields (guardrails) */}
      {step === 3 && (
        <OnboardingCard
          headline="Set your guardrails"
          subtext={`These are the rules ${state.ticker} trades get measured against. Pre-filled from your strategy — adjust per-ticker if needed.`}
          onNext={next}
          onBack={back}
        >
          <div className="flex flex-col gap-4">
            {/* Strike targets */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs text-wh-text-muted">
                  Target entry price
                </label>
                <p className="mb-1.5 text-xs text-wh-text-muted/60">CSP strike ceiling — "buy low"</p>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-wh-text-muted">$</span>
                  <input
                    type="number"
                    value={state.targetEntryPrice}
                    onChange={(e) => update("targetEntryPrice", e.target.value)}
                    placeholder="—"
                    className="w-full rounded-lg border border-wh-border bg-wh-surface-raised py-2 pl-8 pr-3 text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-wh-text-muted">
                  Target exit price
                </label>
                <p className="mb-1.5 text-xs text-wh-text-muted/60">CC strike floor — "sell high"</p>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-wh-text-muted">$</span>
                  <input
                    type="number"
                    value={state.targetExitPrice}
                    onChange={(e) => update("targetExitPrice", e.target.value)}
                    placeholder="—"
                    className="w-full rounded-lg border border-wh-border bg-wh-surface-raised py-2 pl-8 pr-3 text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
                  />
                </div>
              </div>
            </div>

            {/* Max loss */}
            <div>
              <label className="mb-1.5 block text-xs text-wh-text-muted">
                Max acceptable loss <span className="opacity-50">(optional)</span>
              </label>
              <p className="mb-1.5 text-xs text-wh-text-muted/60">The point where you'd close the position and walk away</p>
              <div className="relative">
                <span className="absolute left-3 top-2 text-wh-text-muted">$</span>
                <input
                  type="number"
                  value={state.maxAcceptableLoss}
                  onChange={(e) => update("maxAcceptableLoss", e.target.value)}
                  placeholder="—"
                  className="w-full rounded-lg border border-wh-border bg-wh-surface-raised py-2 pl-8 pr-3 text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
                />
              </div>
            </div>

            {/* Delta range */}
            <div>
              <label className="mb-1.5 block text-xs text-wh-text-muted">
                Delta range for this ticker
              </label>
              <p className="mb-1.5 text-xs text-wh-text-muted/60">
                Your strategy default is {strategy.deltaRange.min}–{strategy.deltaRange.max}
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step={0.01}
                  value={state.deltaMin}
                  onChange={(e) => update("deltaMin", e.target.value)}
                  className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-3 py-2 text-wh-text outline-none focus:border-wh-accent"
                />
                <span className="text-wh-text-muted">–</span>
                <input
                  type="number"
                  step={0.01}
                  value={state.deltaMax}
                  onChange={(e) => update("deltaMax", e.target.value)}
                  className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-3 py-2 text-wh-text outline-none focus:border-wh-accent"
                />
              </div>
            </div>

            {/* DTE preference */}
            <div>
              <label className="mb-1.5 block text-xs text-wh-text-muted">
                DTE preference for this ticker
              </label>
              <p className="mb-1.5 text-xs text-wh-text-muted/60">
                Your strategy default is {strategy.timePreferences.dteRange.min}–{strategy.timePreferences.dteRange.max} days
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={state.dteMin}
                  onChange={(e) => update("dteMin", e.target.value)}
                  className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-3 py-2 text-wh-text outline-none focus:border-wh-accent"
                />
                <span className="text-wh-text-muted">–</span>
                <input
                  type="number"
                  value={state.dteMax}
                  onChange={(e) => update("dteMax", e.target.value)}
                  className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-3 py-2 text-wh-text outline-none focus:border-wh-accent"
                />
                <span className="text-sm text-wh-text-muted">days</span>
              </div>
            </div>

            {/* Capital note */}
            <div className="rounded-lg bg-wh-bg/50 p-3">
              <p className="text-xs text-wh-text-muted">
                Capital reserved is calculated automatically from your trades — strike × 100 for CSPs, purchase price × 100 for shares.
              </p>
            </div>
          </div>
        </OnboardingCard>
      )}

      {/* Step 4: Review & Save */}
      {step === 4 && (
        <OnboardingCard
          headline={`${state.ticker} thesis`}
          subtext="Here's what you've written. Save to create your wheel and start tracking."
          onNext={save}
          onBack={back}
          nextLabel="Create wheel"
        >
          <div className="flex flex-col gap-3">
            {/* Conviction summary */}
            {state.conviction && (
              <div className="rounded-xl border border-wh-border bg-wh-surface-raised p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-wh-text-muted">
                  Conviction
                </div>
                <p className="mt-1 text-sm text-wh-text">{state.conviction}</p>
              </div>
            )}
            {state.invalidation && (
              <div className="rounded-xl border border-wh-border bg-wh-surface-raised p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-wh-text-muted">
                  Invalidation
                </div>
                <p className="mt-1 text-sm text-wh-text">{state.invalidation}</p>
              </div>
            )}

            {/* Guardrails summary */}
            <div className="rounded-xl border border-wh-border bg-wh-surface-raised p-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-wh-text-muted">
                Guardrails
              </div>
              <div className="flex flex-col gap-1.5 text-sm">
                {state.targetEntryPrice && (
                  <div className="flex justify-between">
                    <span className="text-wh-text-muted">Entry target (CSP ceiling)</span>
                    <span className="text-wh-text">${state.targetEntryPrice}</span>
                  </div>
                )}
                {state.targetExitPrice && (
                  <div className="flex justify-between">
                    <span className="text-wh-text-muted">Exit target (CC floor)</span>
                    <span className="text-wh-text">${state.targetExitPrice}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-wh-text-muted">Delta range</span>
                  <span className="text-wh-text">{state.deltaMin} – {state.deltaMax}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-wh-text-muted">DTE preference</span>
                  <span className="text-wh-text">{state.dteMin}–{state.dteMax} days</span>
                </div>
              </div>
            </div>
          </div>
        </OnboardingCard>
      )}
    </div>
  );
}
