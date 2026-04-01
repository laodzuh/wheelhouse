import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeroMetric } from "@/components/HeroMetric";
import { NudgeList } from "@/components/NudgeBanner";
import {
  useUserProfile,
  useActiveStrategy,
  useActiveTheses,
  seedDatabase,
} from "@/db";
import { db } from "@/db";
import { useLiveQuery } from "dexie-react-hooks";
import { getDashboardNudges } from "@/lib/nudges";
import type { TickerThesis, TradeEvent, Strategy } from "@/lib/types";

export function Dashboard() {
  const profile = useUserProfile();
  const strategy = useActiveStrategy();
  const theses = useActiveTheses(profile?.id ?? 0);
  const navigate = useNavigate();

  // Load all wheels, dots, and trade events across all theses
  // Also build a thesisId → wheelId lookup for per-ticker filtering
  const allWheels = useLiveQuery(async () => {
    if (!theses || theses.length === 0) return [];
    const thesisIds = theses.map((t) => t.id!);
    return db.wheels.filter((w) => thesisIds.includes(w.thesisId)).toArray();
  }, [theses]);

  const allDots = useLiveQuery(async () => {
    if (!allWheels || allWheels.length === 0) return [];
    const wheelIds = allWheels.map((w) => w.id!);
    return db.dots.filter((d) => wheelIds.includes(d.wheelId) && d.isActive).toArray();
  }, [allWheels]);

  const allTrades = useLiveQuery(async () => {
    if (!theses || theses.length === 0) return [];
    const thesisIds = theses.map((t) => t.id!);
    return db.tradeEvents
      .filter((te) => thesisIds.includes(te.thesisId))
      .toArray();
  }, [theses]);

  if (
    profile === undefined ||
    strategy === undefined ||
    theses === undefined ||
    allWheels === undefined ||
    allDots === undefined ||
    allTrades === undefined
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-wh-text-muted">Loading your dashboard...</div>
      </div>
    );
  }

  if (!strategy || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center pb-20">
        <div className="text-wh-text-muted">No strategy found.</div>
      </div>
    );
  }

  const hasTheses = theses.length > 0;
  const hasTrades = allTrades.length > 0;

  // ─── Portfolio Metrics ───────────────────────────────────────────
  const totalPremium = allDots.reduce((sum, d) => sum + d.premiumCollected, 0);
  const totalCapitalReserved = theses.reduce(
    (sum, t) => sum + t.dataFields.capitalReserved, 0
  );
  const totalCapital = strategy.positionSizing.totalCapital;

  // Avg change in cost basis
  const dotsWithBasis = allDots.filter(
    (d) => d.effectiveCostBasis !== null && d.sharePurchasePrice !== null
  );
  const avgBasisChange =
    dotsWithBasis.length > 0
      ? dotsWithBasis.reduce(
          (sum, d) => sum + (d.sharePurchasePrice! - d.effectiveCostBasis!), 0
        ) / dotsWithBasis.length
      : null;

  // Annualized return
  const oldestTrade = allTrades.length > 0
    ? allTrades.reduce((oldest, t) => (t.createdAt < oldest.createdAt ? t : oldest))
    : null;
  const daysActive = oldestTrade
    ? Math.max(1, Math.round((Date.now() - new Date(oldestTrade.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;
  const annualizedReturn =
    totalCapitalReserved > 0
      ? (totalPremium / totalCapitalReserved) * (365 / daysActive) * 100
      : 0;

  // Capital utilization
  const capitalUtilization =
    totalCapital > 0 ? (totalCapitalReserved / totalCapital) * 100 : 0;

  // Strategy adherence
  const adherence = hasTrades ? computeAdherence(strategy, theses, allTrades) : null;

  // Dashboard nudges — always show, even before trades (e.g. stale thesis, idle shares)
  const dashNudges = getDashboardNudges({
    dots: allDots,
    totalCapital,
    capitalDeployed: totalCapitalReserved,
    theses,
    maxPositionPercent: strategy.riskProfile.maxPositionPercent,
  });

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-wh-text">
          Hey, {profile.name}
        </h1>
        <p className="mt-1 text-sm text-wh-text-muted">
          Running{" "}
          <button
            onClick={() => navigate("/strategy")}
            className="text-wh-accent underline-offset-2 hover:underline"
          >
            {strategy.name}
          </button>
        </p>
      </div>

      {/* Hero Metrics */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <HeroMetric
          label="Premium"
          value={hasTrades ? `$${totalPremium.toLocaleString()}` : "—"}
          subtext="Total collected"
        />
        <HeroMetric
          label="Avg. Basis Δ"
          value={avgBasisChange !== null ? `$${avgBasisChange.toFixed(2)}` : "—"}
          subtext="Per position"
          trend={avgBasisChange !== null && avgBasisChange > 0 ? "up" : "flat"}
        />
        <HeroMetric
          label="Ann. Return"
          value={hasTrades ? `${annualizedReturn.toFixed(1)}%` : "—"}
          subtext={hasTrades ? `On $${totalCapitalReserved.toLocaleString()}` : "On capital"}
        />
      </div>

      {/* Smart Nudges */}
      {dashNudges.length > 0 && (
        <div className="mb-6">
          <NudgeList nudges={dashNudges} />
        </div>
      )}

      {/* Income Pace — how you're tracking toward your annual goal */}
      {hasTrades && strategy.incomeGoal.annual && strategy.incomeGoal.annual > 0 && (
        <IncomePace
          totalPremium={totalPremium}
          daysActive={daysActive}
          annualGoal={strategy.incomeGoal.annual}
        />
      )}

      {/* Capital Utilization (only show when there are trades) */}
      {hasTrades && (
        <div className="mb-6 rounded-xl border border-wh-border bg-wh-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-wh-text-muted">
              Capital Deployed
            </span>
            <span className="text-sm text-wh-text">
              ${totalCapitalReserved.toLocaleString()} of ${totalCapital.toLocaleString()}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-wh-surface-raised">
            <div
              className="h-2 rounded-full bg-wh-accent transition-all"
              style={{ width: `${Math.min(capitalUtilization, 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-wh-text-muted">
            {capitalUtilization.toFixed(0)}% of your capital is committed to active wheels.
          </p>
        </div>
      )}

      {/* Strategy Adherence (only show when there are trades) */}
      {adherence && (
        <div className="mb-6 rounded-xl border border-wh-border bg-wh-surface p-4">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-wh-text-muted">
            Strategy Adherence
          </div>
          <div className="flex flex-col gap-3">
            <AdherenceRow label="Delta in range" inRange={adherence.deltaInRange} total={adherence.deltaTotal} />
            <AdherenceRow label="DTE in range" inRange={adherence.dteInRange} total={adherence.dteTotal} />
            <AdherenceRow label="Strike respecting thesis" inRange={adherence.strikeInRange} total={adherence.strikeTotal} />
          </div>
        </div>
      )}

      {/* Active Wheels or Empty State */}
      {hasTheses ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-wh-text-muted">
              Active Wheels
            </h2>
            <button
              onClick={() => navigate("/thesis/new")}
              className="rounded-lg bg-wh-accent/10 px-3 py-1 text-xs font-medium text-wh-accent transition-colors hover:bg-wh-accent/20"
            >
              + Add Ticker
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {theses.map((thesis) => {
              const thesisTrades = allTrades.filter((t) => t.thesisId === thesis.id);
              const thesisWheel = allWheels.find((w) => w.thesisId === thesis.id);
              const thesisDots = thesisWheel
                ? allDots.filter((d) => d.wheelId === thesisWheel.id)
                : [];
              const thesisPremium = thesisDots.reduce((sum, d) => sum + d.premiumCollected, 0);
              const thesisReturn =
                thesis.dataFields.capitalReserved > 0
                  ? (thesisPremium / thesis.dataFields.capitalReserved) * 100
                  : 0;

              return (
                <button
                  key={thesis.id}
                  onClick={() => navigate(`/thesis/${thesis.id}`)}
                  className="flex items-center justify-between rounded-xl border border-wh-border bg-wh-surface p-4 text-left transition-all hover:border-wh-accent/50"
                >
                  <div>
                    <div className="font-semibold text-wh-text">{thesis.ticker}</div>
                    <div className="text-xs text-wh-text-muted">
                      {thesisTrades.length} trade{thesisTrades.length !== 1 ? "s" : ""} · ${thesis.dataFields.capitalReserved.toLocaleString()} reserved
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-wh-accent">
                      {thesisPremium > 0 ? `$${thesisPremium.toLocaleString()}` : "—"}
                    </div>
                    <div className="text-xs text-wh-text-muted">
                      {thesisReturn > 0 ? `${thesisReturn.toFixed(1)}% return` : "premium"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState onAddTicker={() => navigate("/thesis/new")} />
      )}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────

function EmptyState({ onAddTicker }: { onAddTicker: () => void }) {
  const [seeding, setSeeding] = useState(false);

  const handleLoadDemo = async () => {
    setSeeding(true);
    try {
      await seedDatabase();
      window.location.reload();
    } catch (e) {
      console.error("Seed failed:", e);
      setSeeding(false);
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-wh-border p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-wh-surface-raised text-3xl">
        ◎
      </div>
      <h2 className="text-lg font-semibold text-wh-text">Your strategy is set</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-wh-text-muted">
        Now pick a stock to wheel. This is where you'll build your first ticker
        thesis and start tracking.
      </p>
      <button
        onClick={onAddTicker}
        className="mt-6 rounded-lg bg-wh-accent px-6 py-2.5 text-sm font-medium text-wh-bg transition-colors hover:bg-wh-accent-hover"
      >
        Add your first ticker
      </button>
      <button
        onClick={handleLoadDemo}
        disabled={seeding}
        className="mt-3 block w-full rounded-lg px-6 py-2 text-xs text-wh-text-muted transition-colors hover:text-wh-text disabled:opacity-40"
      >
        {seeding ? "Loading demo data..." : "Or load demo data to explore"}
      </button>
    </div>
  );
}

// ─── Income Pace ──────────────────────────────────────────────────

function IncomePace({
  totalPremium,
  daysActive,
  annualGoal,
}: {
  totalPremium: number;
  daysActive: number;
  annualGoal: number;
}) {
  // Project annual premium at current pace
  const dailyRate = daysActive > 0 ? totalPremium / daysActive : 0;
  const projectedAnnual = dailyRate * 365;
  const pacePercent = annualGoal > 0 ? (projectedAnnual / annualGoal) * 100 : 0;
  const goalProgress = annualGoal > 0 ? (totalPremium / annualGoal) * 100 : 0;

  const isAhead = pacePercent >= 100;
  const isClose = pacePercent >= 75;
  const paceColor = isAhead ? "text-wh-success" : isClose ? "text-wh-accent" : "text-wh-warning";
  const paceLabel = isAhead ? "Ahead of pace" : isClose ? "Near pace" : "Behind pace";
  const barColor = isAhead ? "bg-wh-success" : isClose ? "bg-wh-accent" : "bg-wh-warning";

  return (
    <div className="mb-6 rounded-xl border border-wh-border bg-wh-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-wh-text-muted">
          Income Goal
        </span>
        <span className={`text-xs font-semibold ${paceColor}`}>{paceLabel}</span>
      </div>

      {/* Progress bar toward annual goal */}
      <div className="h-2 w-full rounded-full bg-wh-surface-raised">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(goalProgress, 100)}%` }}
        />
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-wh-text">
          ${totalPremium.toLocaleString()}{" "}
          <span className="text-wh-text-muted font-normal">
            of ${annualGoal.toLocaleString()}
          </span>
        </span>
        <span className="text-xs text-wh-text-muted">
          {goalProgress.toFixed(0)}%
        </span>
      </div>

      <p className="mt-1.5 text-xs text-wh-text-muted">
        At your current pace ({daysActive} days), you're on track for{" "}
        <span className={`font-medium ${paceColor}`}>
          ${Math.round(projectedAnnual).toLocaleString()}
        </span>{" "}
        this year — {pacePercent.toFixed(0)}% of your goal.
      </p>
    </div>
  );
}

// ─── Adherence ─────────────────────────────────────────────────────

interface AdherenceResult {
  deltaInRange: number;
  deltaTotal: number;
  dteInRange: number;
  dteTotal: number;
  strikeInRange: number;
  strikeTotal: number;
}

function computeAdherence(
  strategy: Strategy,
  theses: TickerThesis[],
  trades: TradeEvent[]
): AdherenceResult {
  let deltaInRange = 0, deltaTotal = 0;
  let dteInRange = 0, dteTotal = 0;
  let strikeInRange = 0, strikeTotal = 0;

  for (const trade of trades) {
    if (trade.eventType !== "sell-csp" && trade.eventType !== "sell-cc") continue;

    const thesis = theses.find((t) => t.id === trade.thesisId);
    if (!thesis) continue;

    const deltaRange = thesis.dataFields.deltaRange || strategy.deltaRange;
    const dteRange = thesis.dataFields.dtePreference || strategy.timePreferences.dteRange;

    if (trade.deltaAtEntry !== null) {
      deltaTotal++;
      if (trade.deltaAtEntry >= deltaRange.min && trade.deltaAtEntry <= deltaRange.max) deltaInRange++;
    }

    if (trade.dte !== null) {
      dteTotal++;
      if (trade.dte >= dteRange.min && trade.dte <= dteRange.max) dteInRange++;
    }

    if (trade.strike !== null) {
      if (trade.eventType === "sell-csp" && thesis.dataFields.targetEntryPrice !== null) {
        strikeTotal++;
        if (trade.strike <= thesis.dataFields.targetEntryPrice) strikeInRange++;
      } else if (trade.eventType === "sell-cc" && thesis.dataFields.targetExitPrice !== null) {
        strikeTotal++;
        if (trade.strike >= thesis.dataFields.targetExitPrice) strikeInRange++;
      }
    }
  }

  return { deltaInRange, deltaTotal, dteInRange, dteTotal, strikeInRange, strikeTotal };
}

// ─── Components ────────────────────────────────────────────────────

function AdherenceRow({ label, inRange, total }: { label: string; inRange: number; total: number }) {
  if (total === 0) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-wh-text-muted">{label}</span>
        <span className="text-wh-text-muted">No data yet</span>
      </div>
    );
  }

  const pct = Math.round((inRange / total) * 100);
  const color = pct >= 80 ? "text-wh-success" : pct >= 50 ? "text-wh-warning" : "text-wh-danger";
  const barColor = pct >= 80 ? "bg-wh-success" : pct >= 50 ? "bg-wh-warning" : "bg-wh-danger";

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-wh-text-muted">{label}</span>
        <span className={color}>{inRange}/{total} ({pct}%)</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-wh-surface-raised">
        <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
