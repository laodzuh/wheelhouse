import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProgressBar } from "@/components/ProgressBar";
import { OnboardingCard } from "@/components/OnboardingCard";
import { OptionSelector } from "@/components/OptionSelector";
import { SyncDialog } from "@/components/SyncDialog";
import { db } from "@/db";
import {
  deriveStrategy,
  generateRevealParams,
  type DerivedStrategy,
  type RevealParam,
} from "@/lib/triangulate";
import type {
  ExperienceLevel,
  DrawdownTemperament,
  Focus,
} from "@/lib/types";

const TOTAL_STEPS = 4;

// ─── State ─────────────────────────────────────────────────────────

interface OnboardingState {
  name: string;
  experienceLevel: ExperienceLevel | "";
  totalCapital: string;
  focus: Focus | "";
  temperament: DrawdownTemperament | "";
  strategyName: string;
}

const initialState: OnboardingState = {
  name: "",
  experienceLevel: "",
  totalCapital: "",
  focus: "",
  temperament: "",
  strategyName: "",
};

// ─── Component ─────────────────────────────────────────────────────

export function Onboarding() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<OnboardingState>(initialState);
  const [editableStrategy, setEditableStrategy] = useState<DerivedStrategy | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const navigate = useNavigate();

  const update = <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const next = () => {
    const nextStep = Math.min(step + 1, TOTAL_STEPS);
    if (nextStep === 4 && !editableStrategy) {
      setEditableStrategy(
        deriveStrategy({
          temperament: state.temperament as DrawdownTemperament,
          focus: state.focus as Focus,
          totalCapital: parseFloat(state.totalCapital) || 25000,
        })
      );
    }
    setStep(nextStep);
  };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const saveAndLaunch = async () => {
    if (!editableStrategy) return;
    const { riskProfile, timePreferences, positionSizing, deltaRange } = editableStrategy;

    const userId = await db.userProfile.add({
      name: state.name,
      experienceLevel: state.experienceLevel as ExperienceLevel,
      motivations: [],
      incomeGoalMonthly: null,
      incomeGoalAnnual: null,
      brokerage: "",
      capitalRange: "",
      createdAt: new Date().toISOString(),
    });

    await db.strategies.add({
      userId,
      name: state.strategyName || "My Strategy",
      version: 1,
      isActive: true,
      riskProfile,
      timePreferences,
      positionSizing,
      deltaRange,
      stockSelectionCriteria: { prose: "" },
      incomeGoal: { monthly: null, annual: null },
      generalApproach: "",
      previousVersionId: null,
      createdAt: new Date().toISOString(),
    });

    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      {step > 1 && (
        <div className="mb-8 w-full max-w-lg">
          <ProgressBar currentStep={step - 1} totalSteps={TOTAL_STEPS - 1} />
        </div>
      )}

      {/* Step 1: Welcome */}
      {step === 1 && (
        <>
          <OnboardingCard
            headline="Welcome to Wheelhouse"
            subtext="Let's build your strategy in under a minute. Just a few questions about how you think about risk, capital, and focus."
            onNext={next}
            nextLabel="Let's go"
            showBack={false}
          >
            <p className="text-center text-sm text-wh-text-muted">
              Everything can be changed later. Nothing is permanent.
            </p>
          </OnboardingCard>
          <button
            type="button"
            onClick={() => setSyncDialogOpen(true)}
            className="mt-4 text-sm text-wh-text-muted hover:text-wh-accent"
          >
            Already using Wheelhouse on another device? Restore your data →
          </button>
        </>
      )}

      {/* Step 2: Basics */}
      {step === 2 && (
        <OnboardingCard
          headline="The basics"
          onNext={next}
          onBack={back}
          nextDisabled={!state.name || !state.experienceLevel}
        >
          <div className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-sm text-wh-text-muted">
                What should we call you?
              </label>
              <input
                type="text"
                value={state.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-4 py-2.5 text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-wh-text-muted">
                How much wheel experience do you have?
              </label>
              <OptionSelector
                options={[
                  { value: "beginner", label: "Just getting started", description: "I know the basics but haven't done many trades" },
                  { value: "intermediate", label: "Been at this a while", description: "I understand the mechanics and have some reps" },
                  { value: "advanced", label: "Veteran", description: "The wheel is second nature" },
                ]}
                selected={state.experienceLevel}
                onSelect={(v) => update("experienceLevel", v as ExperienceLevel)}
              />
            </div>
          </div>
        </OnboardingCard>
      )}

      {/* Step 3: Capital, Focus, and Risk */}
      {step === 3 && (
        <OnboardingCard
          headline="Capital, focus, and risk"
          onNext={next}
          onBack={back}
          nextDisabled={!state.totalCapital || !state.focus || !state.temperament}
        >
          <div className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-sm text-wh-text-muted">
                How much capital are you working with for wheeling?
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-wh-text-muted">$</span>
                <input
                  type="number"
                  value={state.totalCapital}
                  onChange={(e) => update("totalCapital", e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full rounded-lg border border-wh-border bg-wh-surface-raised py-2.5 pl-8 pr-4 text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-wh-text-muted">
                What matters more to you right now?
              </label>
              <OptionSelector
                options={[
                  { value: "premium-income", label: "Generating income", description: "I want consistent premium coming in" },
                  { value: "accumulation", label: "Building positions", description: "I want to accumulate shares in companies I believe in" },
                  { value: "balanced", label: "A mix of both", description: "Income is nice, but I also want to own good stocks" },
                ]}
                selected={state.focus}
                onSelect={(v) => update("focus", v as Focus)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-wh-text-muted">
                When a position goes against you, what's your instinct?
              </label>
              <OptionSelector
                options={[
                  { value: "conservative", label: "Protect first", description: "I'd rather miss upside than take a big hit" },
                  { value: "moderate", label: "Stay the course", description: "Drawdowns happen — I can ride most of them out" },
                  { value: "aggressive", label: "Lean in", description: "Dips are opportunities if the thesis is intact" },
                ]}
                selected={state.temperament}
                onSelect={(v) => update("temperament", v as DrawdownTemperament)}
              />
            </div>
          </div>
        </OnboardingCard>
      )}

      {/* Step 4: Reveal (editable) + Name + Launch */}
      {step === 4 && editableStrategy && (
        <RevealStep
          strategy={editableStrategy}
          name={state.name}
          strategyName={state.strategyName}
          onUpdateStrategy={setEditableStrategy}
          onUpdateName={(v) => update("strategyName", v)}
          onSave={saveAndLaunch}
          onBack={back}
        />
      )}

      <SyncDialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
      />
    </div>
  );
}

// ─── Reveal Step ───────────────────────────────────────────────────

function RevealStep({
  strategy,
  name,
  strategyName,
  onUpdateStrategy,
  onUpdateName,
  onSave,
  onBack,
}: {
  strategy: DerivedStrategy;
  name: string;
  strategyName: string;
  onUpdateStrategy: (s: DerivedStrategy) => void;
  onUpdateName: (v: string) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [expandedTip, setExpandedTip] = useState<string | null>(null);
  const revealParams = generateRevealParams(strategy);

  const handleSave = (param: RevealParam, newValue: number | { min: number; max: number }) => {
    const updated = { ...strategy };
    switch (param.key) {
      case "totalCapital":
        updated.positionSizing = { totalCapital: newValue as number };
        break;
      case "maxPositionPercent":
        updated.riskProfile = { ...updated.riskProfile, maxPositionPercent: newValue as number };
        break;
      case "dteRange":
        updated.timePreferences = { dteRange: newValue as { min: number; max: number } };
        break;
      case "deltaRange":
        updated.deltaRange = newValue as { min: number; max: number };
        break;
    }
    onUpdateStrategy(updated);
    setEditingKey(null);
  };

  return (
    <OnboardingCard
      headline="Here's your strategy"
      subtext={`Based on our conversation, ${name}. Tap any parameter to adjust it.`}
      onNext={onSave}
      onBack={onBack}
      nextLabel="Launch Wheelhouse"
    >
      <div className="flex flex-col gap-3">
        {revealParams.map((param) => (
          <div key={param.key}>
            {editingKey === param.key ? (
              <EditableParam
                param={param}
                onSave={(val) => handleSave(param, val)}
                onCancel={() => setEditingKey(null)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingKey(param.key)}
                className="w-full rounded-xl border border-wh-border bg-wh-surface-raised p-4 text-left transition-all hover:border-wh-accent/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-wh-text-muted">{param.label}</div>
                    <div className="mt-0.5 text-lg font-semibold text-wh-accent">
                      {param.displayValue}
                    </div>
                  </div>
                  <div className="ml-2 flex gap-1.5">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedTip(expandedTip === param.key ? null : param.key);
                      }}
                      className="cursor-pointer rounded-full border border-wh-border px-2 py-0.5 text-xs text-wh-text-muted transition-colors hover:border-wh-accent hover:text-wh-accent"
                    >
                      ?
                    </span>
                    <span className="rounded-full border border-wh-border px-2 py-0.5 text-xs text-wh-text-muted">
                      edit
                    </span>
                  </div>
                </div>
                <p className="mt-1.5 text-sm text-wh-text-muted">{param.explanation}</p>
                {expandedTip === param.key && (
                  <p className="mt-2 rounded-lg bg-wh-bg/50 p-3 text-xs text-wh-text-muted">
                    {param.tooltip}
                  </p>
                )}
              </button>
            )}
          </div>
        ))}

        <div className="mt-2 rounded-xl border border-wh-border bg-wh-surface-raised p-4">
          <label className="mb-1.5 block text-sm text-wh-text-muted">
            Name your strategy
          </label>
          <input
            type="text"
            value={strategyName}
            onChange={(e) => onUpdateName(e.target.value)}
            placeholder="e.g. Steady Income, The Patient Wheeler"
            className="w-full rounded-lg border border-wh-border bg-wh-bg px-4 py-2.5 text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
          />
          <p className="mt-1 text-xs text-wh-text-muted">
            Optional — defaults to "My Strategy"
          </p>
        </div>
      </div>
    </OnboardingCard>
  );
}

// ─── Inline Editor ─────────────────────────────────────────────────

function EditableParam({
  param,
  onSave,
  onCancel,
}: {
  param: RevealParam;
  onSave: (value: number | { min: number; max: number }) => void;
  onCancel: () => void;
}) {
  const [localValue, setLocalValue] = useState(param.value);
  const isRange = param.editType === "range";
  const rangeVal = localValue as { min: number; max: number };
  const numVal = localValue as number;

  return (
    <div className="rounded-xl border-2 border-wh-accent bg-wh-surface-raised p-4">
      <div className="mb-3 text-sm font-medium text-wh-accent">{param.label}</div>

      {isRange ? (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-wh-text-muted">Min</label>
            <input
              type="number"
              step={param.key === "deltaRange" ? 0.01 : 1}
              value={rangeVal.min}
              onChange={(e) => setLocalValue({ ...rangeVal, min: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-wh-border bg-wh-bg px-3 py-2 text-wh-text outline-none focus:border-wh-accent"
            />
          </div>
          <span className="mt-5 text-wh-text-muted">–</span>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-wh-text-muted">Max</label>
            <input
              type="number"
              step={param.key === "deltaRange" ? 0.01 : 1}
              value={rangeVal.max}
              onChange={(e) => setLocalValue({ ...rangeVal, max: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-wh-border bg-wh-bg px-3 py-2 text-wh-text outline-none focus:border-wh-accent"
            />
          </div>
        </div>
      ) : (
        <div className="relative">
          {param.editType === "currency" && (
            <span className="absolute left-3 top-2 text-wh-text-muted">$</span>
          )}
          <input
            type="number"
            value={numVal}
            onChange={(e) => setLocalValue(parseFloat(e.target.value) || 0)}
            className={`w-full rounded-lg border border-wh-border bg-wh-bg py-2 pr-3 text-wh-text outline-none focus:border-wh-accent ${
              param.editType === "currency" ? "pl-8" : "pl-3"
            }`}
          />
          {param.editType === "percent" && (
            <span className="absolute right-3 top-2 text-wh-text-muted">%</span>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm text-wh-text-muted hover:text-wh-text">
          Cancel
        </button>
        <button type="button" onClick={() => onSave(localValue)} className="rounded-lg bg-wh-accent px-4 py-1.5 text-sm font-medium text-wh-bg hover:bg-wh-accent-hover">
          Save
        </button>
      </div>
    </div>
  );
}
