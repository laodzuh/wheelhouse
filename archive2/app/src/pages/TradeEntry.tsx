import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { OnboardingCard } from "@/components/OnboardingCard";
import { OptionSelector } from "@/components/OptionSelector";
import { NudgeList } from "@/components/NudgeBanner";
import { useThesis, useWheel, useActiveStrategy } from "@/db";
import { db } from "@/db";
import { getValidActions, calculateDTE, type Action } from "@/lib/state-machine";
import { getTradeNudges } from "@/lib/nudges";
import type { DotState, TradeEventType, RollDetails } from "@/lib/types";

/**
 * Trade entry handles two flows:
 *
 * 1. "Start Wheeling" — first trade on a thesis.
 *    Route: /thesis/:tickerId/trade/start
 *    Walkthrough: cash or shares? → creates dot → enters first trade
 *
 * 2. Dot action — subsequent trades on an existing dot.
 *    Route: /thesis/:tickerId/trade?dotId=X&action=sell-csp
 */

export function TradeEntry() {
  const { tickerId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const thesis = useThesis(Number(tickerId));
  const wheel = useWheel(Number(tickerId));

  const dotId = searchParams.get("dotId");
  const actionType = searchParams.get("action") as TradeEventType | null;
  const isStartFlow = !dotId;

  if (thesis === undefined || wheel === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-wh-text-muted">Loading...</div>
      </div>
    );
  }

  if (!thesis || !wheel) {
    navigate("/");
    return null;
  }

  if (isStartFlow) {
    return (
      <StartWheelingFlow
        ticker={thesis.ticker}
        thesisId={thesis.id!}
        wheelId={wheel.id!}
        onComplete={() => navigate(`/thesis/${tickerId}`)}
        onBack={() => navigate(`/thesis/${tickerId}`)}
      />
    );
  }

  return (
    <DotTradeFlow
      ticker={thesis.ticker}
      thesisId={thesis.id!}
      wheelId={wheel.id!}
      dotId={Number(dotId)}
      actionType={actionType}
      onComplete={() => navigate(`/thesis/${tickerId}`)}
      onBack={() => navigate(`/thesis/${tickerId}`)}
    />
  );
}

// ─── Start Wheeling Flow ───────────────────────────────────────────

function StartWheelingFlow({
  ticker,
  thesisId,
  wheelId,
  onComplete,
  onBack,
}: {
  ticker: string;
  thesisId: number;
  wheelId: number;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<"choose" | "shares-price" | "trade">("choose");
  const [startWith, setStartWith] = useState<"cash" | "shares" | "">("");
  const [sharePurchasePrice, setSharePurchasePrice] = useState("");
  const [createdDotId, setCreatedDotId] = useState<number | null>(null);
  const [createdDotState, setCreatedDotState] = useState<DotState | null>(null);

  const handleChoose = () => {
    if (startWith === "cash") {
      createCashDot();
    } else {
      setStep("shares-price");
    }
  };

  const createCashDot = async () => {
    const dotId = await db.dots.add({
      wheelId,
      state: "idle-cash",
      isActive: true,
      label: `${ticker} – Cash`,
      sharePurchasePrice: null,
      currentStrike: null,
      currentExpiry: null,
      currentDelta: null,
      premiumCollected: 0,
      effectiveCostBasis: null,
      createdAt: new Date().toISOString(),
    });
    setCreatedDotId(dotId);
    setCreatedDotState("idle-cash");
    setStep("trade");
  };

  const handleSharesSave = async () => {
    const price = parseFloat(sharePurchasePrice) || 0;
    const dotId = await db.dots.add({
      wheelId,
      state: "idle-shares",
      isActive: true,
      label: `${ticker} – Shares @ $${price}`,
      sharePurchasePrice: price,
      currentStrike: null,
      currentExpiry: null,
      currentDelta: null,
      premiumCollected: 0,
      effectiveCostBasis: price,
      createdAt: new Date().toISOString(),
    });
    setCreatedDotId(dotId);
    setCreatedDotState("idle-shares");
    setStep("trade");
  };

  if (step === "choose") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <OnboardingCard
          headline={`Start wheeling ${ticker}`}
          subtext="Are you starting with cash to sell puts, or do you already own shares?"
          onNext={handleChoose}
          onBack={onBack}
          nextDisabled={!startWith}
          nextLabel="Continue"
        >
          <OptionSelector
            options={[
              {
                value: "cash",
                label: "Starting with cash",
                description: "I want to sell a cash-secured put to open",
              },
              {
                value: "shares",
                label: "I already own shares",
                description: "I have 100+ shares and want to start selling calls",
              },
            ]}
            selected={startWith}
            onSelect={(v) => setStartWith(v as "cash" | "shares")}
          />
        </OnboardingCard>
      </div>
    );
  }

  if (step === "shares-price") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <OnboardingCard
          headline="What did you pay per share?"
          subtext="This sets your starting cost basis for this position."
          onNext={handleSharesSave}
          onBack={() => setStep("choose")}
          nextDisabled={!sharePurchasePrice}
          nextLabel="Continue"
        >
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-wh-text-muted">$</span>
            <input
              type="number"
              step="0.01"
              value={sharePurchasePrice}
              onChange={(e) => setSharePurchasePrice(e.target.value)}
              placeholder="e.g. 175.50"
              className="w-full rounded-lg border border-wh-border bg-wh-surface-raised py-2.5 pl-8 pr-4 text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
            />
          </div>
        </OnboardingCard>
      </div>
    );
  }

  // step === "trade" — show the trade form for the newly created dot
  if (createdDotId && createdDotState) {
    const defaultAction = createdDotState === "idle-cash" ? "sell-csp" : "sell-cc";
    return (
      <TradeForm
        ticker={ticker}
        thesisId={thesisId}
        dotId={createdDotId}
        dotState={createdDotState}
        preselectedAction={defaultAction}
        onComplete={onComplete}
        onBack={onBack}
      />
    );
  }

  return null;
}

// ─── Dot Trade Flow (for existing dots) ────────────────────────────

function DotTradeFlow({
  ticker,
  thesisId,
  wheelId: _wheelId,
  dotId,
  actionType,
  onComplete,
  onBack,
}: {
  ticker: string;
  thesisId: number;
  wheelId: number;
  dotId: number;
  actionType: TradeEventType | null;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [dotState, setDotState] = useState<DotState | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load dot state
  if (!loaded) {
    db.dots.get(dotId).then((dot) => {
      if (dot) setDotState(dot.state);
      setLoaded(true);
    });
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-wh-text-muted">Loading...</div>
      </div>
    );
  }

  if (!dotState) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-wh-text-muted">Dot not found.</div>
      </div>
    );
  }

  return (
    <TradeForm
      ticker={ticker}
      thesisId={thesisId}
      dotId={dotId}
      dotState={dotState}
      preselectedAction={actionType}
      onComplete={onComplete}
      onBack={onBack}
    />
  );
}

// ─── Trade Form ────────────────────────────────────────────────────

function TradeForm({
  ticker,
  thesisId,
  dotId,
  dotState,
  preselectedAction,
  onComplete,
  onBack,
}: {
  ticker: string;
  thesisId: number;
  dotId: number;
  dotState: DotState;
  preselectedAction: TradeEventType | null;
  onComplete: () => void;
  onBack: () => void;
}) {
  const strategy = useActiveStrategy();
  const thesis = useThesis(thesisId);

  const validActions = getValidActions(dotState);
  const [selectedAction, setSelectedAction] = useState<Action | null>(
    preselectedAction
      ? validActions.find((a) => a.eventType === preselectedAction) ?? null
      : null
  );

  // Form fields
  const [strike, setStrike] = useState("");
  const [premium, setPremium] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [deltaAtEntry, setDeltaAtEntry] = useState("");
  const [assignmentPrice, setAssignmentPrice] = useState("");
  const [callAwayPrice, setCallAwayPrice] = useState("");
  const [closePrice, setClosePrice] = useState("");
  const [rollStrike, setRollStrike] = useState("");
  const [rollExpiration, setRollExpiration] = useState("");
  const [rollPremium, setRollPremium] = useState("");
  const [saving, setSaving] = useState(false);

  const dte = expirationDate ? calculateDTE(expirationDate) : null;

  // Live nudges — recompute as user types
  const nudges = (strategy && thesis && selectedAction)
    ? getTradeNudges({
        eventType: selectedAction.eventType,
        strike: parseFloat(strike) || null,
        delta: parseFloat(deltaAtEntry) || null,
        dte,
        strategy,
        thesis: thesis.dataFields,
      })
    : [];
  const rollDte = rollExpiration ? calculateDTE(rollExpiration) : null;

  const handleSave = async () => {
    if (!selectedAction) return;
    setSaving(true);

    const now = new Date().toISOString();
    // Convert per-share amounts to per-contract (× 100)
    const premiumTotal = (parseFloat(premium) || 0) * 100;
    const closePriceTotal = (parseFloat(closePrice) || 0) * 100;
    const rollPremiumTotal = (parseFloat(rollPremium) || 0) * 100;
    const isRoll = selectedAction.eventType === "csp-rolled" || selectedAction.eventType === "cc-rolled";

    // Build roll details if applicable
    let rollDetails: RollDetails | null = null;
    if (isRoll) {
      const dot = await db.dots.get(dotId);
      rollDetails = {
        previousStrike: dot?.currentStrike ?? 0,
        previousExpiry: dot?.currentExpiry ?? "",
        previousPremium: 0,
        netCredit: rollPremiumTotal - closePriceTotal,
      };
    }

    // Create the trade event
    await db.tradeEvents.add({
      dotId,
      wheelId: 0, // we can look this up from dot if needed
      thesisId,
      eventType: selectedAction.eventType,
      strike: parseFloat(strike) || null,
      premium: premiumTotal || null,
      expirationDate: expirationDate || null,
      dte: dte,
      deltaAtEntry: parseFloat(deltaAtEntry) || null,
      assignmentPrice: parseFloat(assignmentPrice) || null,
      callAwayPrice: parseFloat(callAwayPrice) || null,
      closePrice: closePriceTotal || null,
      rollDetails,
      previousState: dotState,
      newState: selectedAction.toState,
      deviations: [],
      createdAt: now,
    });

    // Update the dot
    const dotUpdate: Record<string, unknown> = {
      state: selectedAction.toState,
    };

    if (isRoll) {
      dotUpdate.currentStrike = parseFloat(rollStrike) || null;
      dotUpdate.currentExpiry = rollExpiration || null;
      dotUpdate.currentDelta = parseFloat(deltaAtEntry) || null;
      dotUpdate.premiumCollected = (await db.dots.get(dotId))!.premiumCollected + rollPremiumTotal - closePriceTotal;
      dotUpdate.label = `${ticker} $${rollStrike} ${rollExpiration}`;
    } else if (selectedAction.eventType === "sell-csp" || selectedAction.eventType === "sell-cc") {
      const currentDot = (await db.dots.get(dotId))!;
      const newPremium = currentDot.premiumCollected + premiumTotal;
      dotUpdate.currentStrike = parseFloat(strike) || null;
      dotUpdate.currentExpiry = expirationDate || null;
      dotUpdate.currentDelta = parseFloat(deltaAtEntry) || null;
      dotUpdate.premiumCollected = newPremium;
      dotUpdate.label = `${ticker} $${strike} ${expirationDate}`;
      // Update effective cost basis if this dot holds shares (selling CC reduces basis)
      if (currentDot.sharePurchasePrice !== null) {
        dotUpdate.effectiveCostBasis = currentDot.sharePurchasePrice - newPremium;
      }
    } else if (selectedAction.eventType === "assigned") {
      dotUpdate.currentStrike = null;
      dotUpdate.currentExpiry = null;
      dotUpdate.currentDelta = null;
      dotUpdate.sharePurchasePrice = parseFloat(assignmentPrice) || null;
      dotUpdate.effectiveCostBasis = (parseFloat(assignmentPrice) || 0) - (await db.dots.get(dotId))!.premiumCollected;
      dotUpdate.label = `${ticker} – Shares`;
    } else if (selectedAction.eventType === "called-away") {
      dotUpdate.currentStrike = null;
      dotUpdate.currentExpiry = null;
      dotUpdate.currentDelta = null;
      dotUpdate.sharePurchasePrice = null;
      dotUpdate.label = `${ticker} – Cash`;
    } else {
      // expired or closed — back to idle
      const currentDot = (await db.dots.get(dotId))!;
      dotUpdate.currentStrike = null;
      dotUpdate.currentExpiry = null;
      dotUpdate.currentDelta = null;
      dotUpdate.label = selectedAction.toState === "idle-cash" ? `${ticker} – Cash` : `${ticker} – Shares`;
      // If closing a CC (back to idle-shares), update cost basis to reflect all premium collected
      if (selectedAction.toState === "idle-shares" && currentDot.sharePurchasePrice !== null) {
        const updatedPremium = currentDot.premiumCollected - closePriceTotal;
        dotUpdate.premiumCollected = updatedPremium;
        dotUpdate.effectiveCostBasis = currentDot.sharePurchasePrice - updatedPremium;
      }
    }

    await db.dots.update(dotId, dotUpdate);

    // Auto-update capital reserved on the thesis.
    // CSP: strike × 100 (cash needed as collateral)
    // Shares (via assignment or starting with shares): purchase price × 100
    // Rolls: use new strike × 100
    let capitalForThisDot = 0;
    if (selectedAction.eventType === "sell-csp") {
      capitalForThisDot = (parseFloat(strike) || 0) * 100;
    } else if (selectedAction.eventType === "sell-cc") {
      // CC doesn't add new capital — shares are already committed
      // But if this is the first trade (starting with shares), the dot
      // already has sharePurchasePrice set from the walkthrough
      const dot = await db.dots.get(dotId);
      capitalForThisDot = (dot?.sharePurchasePrice || 0) * 100;
    } else if (selectedAction.eventType === "assigned") {
      capitalForThisDot = (parseFloat(assignmentPrice) || 0) * 100;
    } else if (isRoll) {
      capitalForThisDot = (parseFloat(rollStrike) || 0) * 100;
    }

    if (capitalForThisDot > 0) {
      // Recalculate total capital reserved from all active dots
      const thesis = await db.tickerTheses.get(thesisId);
      const allDots = await db.dots.where("wheelId").equals(
        (await db.wheels.where("thesisId").equals(thesisId).first())?.id ?? 0
      ).filter(d => d.isActive).toArray();

      let totalReserved = 0;
      for (const d of allDots) {
        if (d.state === "csp-active" && d.currentStrike) {
          totalReserved += d.currentStrike * 100;
        } else if (d.state === "cc-active" || d.state === "idle-shares") {
          totalReserved += (d.sharePurchasePrice || d.effectiveCostBasis || 0) * 100;
        } else if (d.state === "idle-cash") {
          // idle cash doesn't count — not deployed yet
        }
      }

      // Handle the dot we just updated (it may not reflect new state in allDots yet)
      if (selectedAction.eventType === "sell-csp") {
        // The dot just became csp-active with this strike
        const alreadyCounted = allDots.some(d => d.id === dotId && d.state === "csp-active");
        if (!alreadyCounted) {
          totalReserved += (parseFloat(strike) || 0) * 100;
        }
      }

      if (thesis) {
        await db.tickerTheses.update(thesisId, {
          "dataFields.capitalReserved": totalReserved || capitalForThisDot,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    setSaving(false);
    onComplete();
  };

  // Step 1: Choose action (if not preselected)
  if (!selectedAction) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <OnboardingCard
          headline={`${ticker} — What happened?`}
          subtext="Choose the action that matches what happened with this contract."
          onBack={onBack}
          showBack={true}
        >
          <div className="flex flex-col gap-2">
            {validActions.map((action) => (
              <button
                key={action.eventType}
                onClick={() => setSelectedAction(action)}
                className="rounded-xl border border-wh-border bg-wh-surface-raised p-4 text-left transition-all hover:border-wh-accent/50"
              >
                <div className="font-medium text-wh-text">{action.label}</div>
                <div className="mt-0.5 text-sm text-wh-text-muted">
                  {action.description}
                </div>
              </button>
            ))}
          </div>
        </OnboardingCard>
      </div>
    );
  }

  // Step 2: Enter trade details
  const fields = selectedAction.fields;
  const isRoll = selectedAction.eventType === "csp-rolled" || selectedAction.eventType === "cc-rolled";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <OnboardingCard
        headline={`${ticker} — ${selectedAction.label}`}
        subtext={selectedAction.description}
        onNext={handleSave}
        onBack={() => setSelectedAction(null)}
        nextLabel={saving ? "Saving..." : "Save Trade"}
        nextDisabled={saving}
      >
        <div className="flex flex-col gap-4">
          {/* Strike */}
          {fields.includes("strike") && (
            <Field label="Strike price">
              <DollarInput value={strike} onChange={setStrike} placeholder="e.g. 175" />
            </Field>
          )}

          {/* Premium */}
          {fields.includes("premium") && (
            <Field label="Premium collected (per share)">
              <DollarInput value={premium} onChange={setPremium} placeholder="e.g. 2.50" step="0.01" />
            </Field>
          )}

          {/* Expiration */}
          {fields.includes("expirationDate") && (
            <Field label="Expiration date" hint={dte !== null ? `${dte} DTE` : undefined}>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-4 py-2.5 text-wh-text outline-none focus:border-wh-accent"
              />
            </Field>
          )}

          {/* Delta */}
          {fields.includes("deltaAtEntry") && (
            <Field label="Delta at entry">
              <input
                type="number"
                step="0.01"
                value={deltaAtEntry}
                onChange={(e) => setDeltaAtEntry(e.target.value)}
                placeholder="e.g. 0.30"
                className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-4 py-2.5 text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
              />
            </Field>
          )}

          {/* Assignment price */}
          {fields.includes("assignmentPrice") && (
            <Field label="Assignment price (per share)">
              <DollarInput value={assignmentPrice} onChange={setAssignmentPrice} placeholder="e.g. 175" />
            </Field>
          )}

          {/* Call away price */}
          {fields.includes("callAwayPrice") && (
            <Field label="Called away price (per share)">
              <DollarInput value={callAwayPrice} onChange={setCallAwayPrice} placeholder="e.g. 185" />
            </Field>
          )}

          {/* Close price */}
          {fields.includes("closePrice") && (
            <Field label={isRoll ? "Cost to close (per share)" : "Close price (per share)"}>
              <DollarInput value={closePrice} onChange={setClosePrice} placeholder="e.g. 1.25" step="0.01" />
            </Field>
          )}

          {/* Roll fields */}
          {isRoll && (
            <>
              <div className="border-t border-wh-border pt-4">
                <div className="mb-3 text-xs font-medium uppercase tracking-wide text-wh-accent">
                  New contract
                </div>
              </div>
              {fields.includes("rollStrike") && (
                <Field label="New strike price">
                  <DollarInput value={rollStrike} onChange={setRollStrike} placeholder="e.g. 180" />
                </Field>
              )}
              {fields.includes("rollExpiration") && (
                <Field label="New expiration date" hint={rollDte !== null ? `${rollDte} DTE` : undefined}>
                  <input
                    type="date"
                    value={rollExpiration}
                    onChange={(e) => setRollExpiration(e.target.value)}
                    className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-4 py-2.5 text-wh-text outline-none focus:border-wh-accent"
                  />
                </Field>
              )}
              {fields.includes("rollPremium") && (
                <Field label="Premium on new contract (per share)">
                  <DollarInput value={rollPremium} onChange={setRollPremium} placeholder="e.g. 3.00" step="0.01" />
                </Field>
              )}
            </>
          )}

          {/* Return projection — live as user types */}
          {(selectedAction.eventType === "sell-csp" || selectedAction.eventType === "sell-cc") && (
            <TradeReturnProjection
              premium={parseFloat(premium) || 0}
              strike={parseFloat(strike) || 0}
              dte={dte}
              capitalReserved={thesis?.dataFields.capitalReserved ?? 0}
              incomeGoal={strategy?.incomeGoal ?? null}
            />
          )}

          {/* Live nudges */}
          {nudges.length > 0 && (
            <div className="mt-2 border-t border-wh-border pt-4">
              <NudgeList nudges={nudges} />
            </div>
          )}
        </div>
      </OnboardingCard>
    </div>
  );
}

// ─── Return Projection ────────────────────────────────────────────

/**
 * Live return-on-capital projection that updates as the user fills in
 * strike, premium, and expiration. Shows:
 * - Per-contract dollar return (premium × 100)
 * - Return on capital for this trade (premium × 100 / capital at risk)
 * - Annualized return (scaled by 365/DTE)
 * - Contribution toward income goal
 */
function TradeReturnProjection({
  premium,
  strike,
  dte,
  capitalReserved,
  incomeGoal,
}: {
  premium: number;
  strike: number;
  dte: number | null;
  capitalReserved: number;
  incomeGoal: { monthly: number | null; annual: number | null } | null;
}) {
  // Need at least premium to show anything useful
  if (!premium || premium <= 0) return null;

  const premiumPerContract = premium * 100;
  // Capital at risk for this contract: strike × 100 (CSP collateral) or use thesis capital
  const capitalAtRisk = strike > 0 ? strike * 100 : capitalReserved;
  const rawReturn = capitalAtRisk > 0 ? (premiumPerContract / capitalAtRisk) * 100 : 0;
  const annualizedReturn = dte && dte > 0 ? rawReturn * (365 / dte) : null;
  const annualGoal = incomeGoal?.annual ?? null;
  const goalContribution = annualGoal && annualGoal > 0
    ? (premiumPerContract / annualGoal) * 100
    : null;

  // Color the annualized return based on whether it meets a reasonable threshold
  const annColor = annualizedReturn !== null
    ? annualizedReturn >= 20 ? "text-wh-success" : annualizedReturn >= 10 ? "text-wh-accent" : "text-wh-warning"
    : "text-wh-text-muted";

  return (
    <div className="mt-2 rounded-xl border border-wh-accent/20 bg-wh-accent/5 p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-wh-accent">
        Return Projection
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        {/* Premium per contract */}
        <div className="flex items-center justify-between">
          <span className="text-wh-text-muted">Premium (per contract)</span>
          <span className="font-medium text-wh-text">${premiumPerContract.toLocaleString()}</span>
        </div>

        {/* Raw return on capital */}
        {capitalAtRisk > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-wh-text-muted">Return on ${capitalAtRisk.toLocaleString()}</span>
            <span className="font-medium text-wh-text">{rawReturn.toFixed(2)}%</span>
          </div>
        )}

        {/* Annualized */}
        {annualizedReturn !== null && (
          <div className="flex items-center justify-between">
            <span className="text-wh-text-muted">Annualized ({dte} days)</span>
            <span className={`font-semibold ${annColor}`}>{annualizedReturn.toFixed(1)}%</span>
          </div>
        )}

        {/* Goal contribution */}
        {goalContribution !== null && (
          <div className="mt-1 flex items-center justify-between border-t border-wh-accent/10 pt-1.5">
            <span className="text-wh-text-muted">Toward ${annualGoal!.toLocaleString()} goal</span>
            <span className="font-medium text-wh-accent">{goalContribution.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared field components ───────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs text-wh-text-muted">{label}</label>
        {hint && <span className="text-xs font-medium text-wh-accent">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function DollarInput({
  value,
  onChange,
  placeholder,
  step = "1",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  step?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-2.5 text-wh-text-muted">$</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-wh-border bg-wh-surface-raised py-2.5 pl-8 pr-4 text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
      />
    </div>
  );
}
