import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useThesis, useWheel, useActiveDots, useTradeEventsForThesis, useActiveStrategy } from "@/db";
import { db } from "@/db";
import { HeroMetric } from "@/components/HeroMetric";
import { WheelVisualization } from "@/components/WheelVisualization";
import { useStockQuote } from "@/lib/useMarketData";
import type { Dot, TickerThesis, TradeEvent, Strategy } from "@/lib/types";

export function ThesisView() {
  const { tickerId } = useParams();
  const navigate = useNavigate();
  const thesis = useThesis(Number(tickerId));
  const wheel = useWheel(Number(tickerId));
  const dots = useActiveDots(wheel?.id ?? null);
  const trades = useTradeEventsForThesis(Number(tickerId));
  const strategy = useActiveStrategy();
  const { quote, loading: quoteLoading } = useStockQuote(thesis?.ticker ?? null);

  if (thesis === undefined || wheel === undefined || dots === undefined || trades === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-wh-text-muted">Loading...</div>
      </div>
    );
  }

  if (!thesis) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-wh-text-muted">Thesis not found.</p>
          <button onClick={() => navigate("/")} className="mt-4 text-sm text-wh-accent">
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  // Compute hero metrics from trade data
  const totalPremium = dots.reduce((sum, d) => sum + d.premiumCollected, 0);
  const capitalReserved = thesis.dataFields.capitalReserved;

  // Raw return = premium / capital
  const rawReturn = capitalReserved > 0 ? (totalPremium / capitalReserved) * 100 : 0;

  // Annualized return — scales the raw return to a yearly rate
  // Uses days since thesis creation as the time window
  const daysSinceCreation = Math.max(
    1,
    Math.round(
      (Date.now() - new Date(thesis.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
  );
  const annualizedReturn = capitalReserved > 0
    ? (totalPremium / capitalReserved) * (365 / daysSinceCreation) * 100
    : 0;

  // Effective cost basis — average across dots that hold or have held shares
  const dotsWithBasis = dots.filter((d) => d.effectiveCostBasis !== null);
  const avgCostBasis =
    dotsWithBasis.length > 0
      ? dotsWithBasis.reduce((sum, d) => sum + d.effectiveCostBasis!, 0) / dotsWithBasis.length
      : null;

  const handleDotClick = (dot: Dot) => {
    navigate(`/thesis/${tickerId}/trade?dotId=${dot.id}`);
  };

  const handleStartWheeling = () => {
    navigate(`/thesis/${tickerId}/trade/start`);
  };

  const handleAddContract = () => {
    navigate(`/thesis/${tickerId}/trade/start`);
  };

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/")}
          className="mb-2 text-sm text-wh-text-muted hover:text-wh-text"
        >
          ← Dashboard
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-wh-text">{thesis.ticker}</h1>
            <p className="mt-1 text-sm text-wh-text-muted">{thesis.name}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-wh-accent">
              ${capitalReserved.toLocaleString()}
            </div>
            <div className="text-xs text-wh-text-muted">reserved</div>
          </div>
        </div>

        {/* Live Price Bar */}
        {quote && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-wh-border bg-wh-surface px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-wh-text">
                ${quote.price.toFixed(2)}
              </span>
              <span
                className={`text-sm font-medium ${
                  quote.change >= 0 ? "text-wh-success" : "text-wh-danger"
                }`}
              >
                {quote.change >= 0 ? "+" : ""}
                {quote.change.toFixed(2)} ({quote.changePercent >= 0 ? "+" : ""}
                {quote.changePercent.toFixed(1)}%)
              </span>
            </div>
            {/* Contextual hint vs thesis targets */}
            <PriceContext
              price={quote.price}
              targetEntry={thesis.dataFields.targetEntryPrice}
              targetExit={thesis.dataFields.targetExitPrice}
            />
          </div>
        )}
        {quoteLoading && (
          <div className="mt-3 flex h-10 items-center justify-center rounded-lg border border-wh-border bg-wh-surface">
            <span className="text-xs text-wh-text-muted">Loading price...</span>
          </div>
        )}
      </div>

      {/* Wheel Visualization */}
      <div className="mb-4 flex justify-center rounded-2xl border border-wh-border bg-wh-surface p-6">
        <WheelVisualization
          dots={dots}
          onDotClick={handleDotClick}
          onStartWheeling={handleStartWheeling}
          onAddContract={handleAddContract}
        />
      </div>

      {/* Plan a Trade buttons */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => navigate(`/thesis/${tickerId}/plan?type=csp`)}
          className="flex-1 rounded-lg border border-wh-accent/30 bg-wh-accent/5 py-2.5 text-center text-sm font-medium text-wh-accent transition-colors hover:bg-wh-accent/10"
        >
          Plan a CSP
        </button>
        <button
          onClick={() => navigate(`/thesis/${tickerId}/plan?type=cc`)}
          className="flex-1 rounded-lg border border-wh-border bg-wh-surface py-2.5 text-center text-sm font-medium text-wh-text-muted transition-colors hover:text-wh-text"
        >
          Plan a CC
        </button>
      </div>

      {/* Hero Metrics — scoped to this ticker */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <HeroMetric
          label="Premium"
          value={totalPremium > 0 ? `$${totalPremium.toLocaleString()}` : "—"}
          subtext="Collected"
        />
        <HeroMetric
          label="Cost Basis"
          value={avgCostBasis !== null ? `$${avgCostBasis.toFixed(2)}` : "—"}
          subtext="Effective"
        />
        <HeroMetric
          label="Return"
          value={annualizedReturn > 0 ? `${annualizedReturn.toFixed(1)}%` : "—"}
          subtext={rawReturn > 0 ? `${rawReturn.toFixed(1)}% raw · ann.` : `On $${capitalReserved.toLocaleString()}`}
        />
      </div>

      {/* Return context — income contribution from this ticker */}
      {totalPremium > 0 && strategy?.incomeGoal?.annual && strategy.incomeGoal.annual > 0 && (
        <div className="mb-6 rounded-xl border border-wh-border bg-wh-surface p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-wh-text-muted">
              {thesis.ticker} contributes
            </span>
            <span className="font-medium text-wh-accent">
              {((totalPremium / strategy.incomeGoal.annual) * 100).toFixed(1)}%
            </span>
          </div>
          <p className="mt-1 text-xs text-wh-text-muted">
            ${totalPremium.toLocaleString()} of your ${strategy.incomeGoal.annual.toLocaleString()} annual goal
            {daysSinceCreation > 1 && (
              <> · ${(totalPremium / daysSinceCreation * 30).toFixed(0)}/mo pace from this ticker</>
            )}
          </p>
        </div>
      )}

      {/* Inline Evaluation — per-ticker adherence */}
      {trades.length > 0 && strategy && (
        <TickerAdherence thesis={thesis} trades={trades} strategy={strategy} />
      )}

      {/* Trade History */}
      {trades.length > 0 && (
        <TradeHistory trades={trades} />
      )}

      {/* Thesis Details */}
      <ThesisDetails thesis={thesis} />
    </div>
  );
}

// ─── Price Context ────────────────────────────────────────────────

function PriceContext({
  price,
  targetEntry,
  targetExit,
}: {
  price: number;
  targetEntry: number | null;
  targetExit: number | null;
}) {
  // Show how current price relates to thesis targets
  if (targetEntry !== null && price <= targetEntry) {
    return (
      <span className="text-xs text-wh-success">
        At/below CSP target
      </span>
    );
  }
  if (targetEntry !== null && price > targetEntry) {
    const above = ((price - targetEntry) / targetEntry * 100).toFixed(1);
    return (
      <span className="text-xs text-wh-text-muted">
        {above}% above entry
      </span>
    );
  }
  if (targetExit !== null && price >= targetExit) {
    return (
      <span className="text-xs text-wh-accent">
        At/above CC target
      </span>
    );
  }
  return null;
}

// ─── Inline Evaluation ────────────────────────────────────────────

function TickerAdherence({
  thesis,
  trades,
  strategy,
}: {
  thesis: TickerThesis;
  trades: TradeEvent[];
  strategy: Strategy;
}) {
  // Only evaluate sell-csp and sell-cc events (where user chose parameters)
  const sellTrades = trades.filter(
    (t) => t.eventType === "sell-csp" || t.eventType === "sell-cc"
  );

  if (sellTrades.length === 0) return null;

  let deltaInRange = 0, deltaTotal = 0;
  let dteInRange = 0, dteTotal = 0;
  let strikeInRange = 0, strikeTotal = 0;

  const deltaRange = thesis.dataFields.deltaRange || strategy.deltaRange;
  const dteRange = thesis.dataFields.dtePreference || strategy.timePreferences.dteRange;

  for (const trade of sellTrades) {
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

  const rows = [
    { label: "Delta in range", inRange: deltaInRange, total: deltaTotal },
    { label: "DTE in range", inRange: dteInRange, total: dteTotal },
    { label: "Strike on thesis", inRange: strikeInRange, total: strikeTotal },
  ];

  return (
    <div className="mb-6 rounded-2xl border border-wh-border bg-wh-surface p-4">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-wh-text-muted">
        Adherence — {sellTrades.length} trade{sellTrades.length !== 1 ? "s" : ""}
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          if (row.total === 0) {
            return (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-wh-text-muted">{row.label}</span>
                <span className="text-wh-text-muted">No data</span>
              </div>
            );
          }
          const pct = Math.round((row.inRange / row.total) * 100);
          const color = pct >= 80 ? "text-wh-success" : pct >= 50 ? "text-wh-warning" : "text-wh-danger";
          const barColor = pct >= 80 ? "bg-wh-success" : pct >= 50 ? "bg-wh-warning" : "bg-wh-danger";
          return (
            <div key={row.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-wh-text-muted">{row.label}</span>
                <span className={color}>{row.inRange}/{row.total} ({pct}%)</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-wh-surface-raised">
                <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Trade History ────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  "sell-csp": "Sold CSP",
  "sell-cc": "Sold CC",
  "assigned": "Assigned",
  "called-away": "Called away",
  "csp-expired": "CSP expired",
  "csp-closed": "CSP closed",
  "csp-rolled": "CSP rolled",
  "cc-expired": "CC expired",
  "cc-closed": "CC closed",
  "cc-rolled": "CC rolled",
};

function TradeHistory({ trades }: { trades: TradeEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...trades].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const shown = expanded ? sorted : sorted.slice(0, 3);

  return (
    <div className="mb-6 rounded-2xl border border-wh-border bg-wh-surface">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-medium text-wh-text-muted">
          Trade History ({trades.length})
        </span>
        <span className="text-wh-text-muted">{expanded ? "▲" : "▼"}</span>
      </button>
      <div className="border-t border-wh-border px-4 pb-4">
        <div className="flex flex-col gap-2 pt-3">
          {shown.map((trade, i) => {
            const date = new Date(trade.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            const label = EVENT_LABELS[trade.eventType] || trade.eventType;
            const detail = trade.strike
              ? `$${trade.strike}${trade.expirationDate ? ` · ${trade.expirationDate}` : ""}`
              : trade.assignmentPrice
                ? `@ $${trade.assignmentPrice}`
                : trade.callAwayPrice
                  ? `@ $${trade.callAwayPrice}`
                  : "";
            const premiumStr =
              trade.premium !== null && trade.premium > 0
                ? `+$${trade.premium.toLocaleString()}`
                : trade.closePrice !== null && trade.closePrice > 0
                  ? `-$${trade.closePrice.toLocaleString()}`
                  : null;

            return (
              <div
                key={trade.id ?? i}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-12 text-xs text-wh-text-muted">{date}</span>
                  <div>
                    <span className="text-wh-text">{label}</span>
                    {detail && (
                      <span className="ml-1.5 text-wh-text-muted">{detail}</span>
                    )}
                  </div>
                </div>
                {premiumStr && (
                  <span
                    className={`text-xs font-medium ${
                      premiumStr.startsWith("+")
                        ? "text-wh-success"
                        : "text-wh-danger"
                    }`}
                  >
                    {premiumStr}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {sorted.length > 3 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-3 text-xs text-wh-accent"
          >
            Show all {sorted.length} trades
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Thesis Details (view + edit) ──────────────────────────────────

function ThesisDetails({ thesis }: { thesis: TickerThesis }) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (editing) {
    return <ThesisEditor thesis={thesis} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="rounded-2xl border border-wh-border bg-wh-surface">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-medium text-wh-text-muted">
          Thesis Details
        </span>
        <div className="flex items-center gap-2">
          {expanded && (
            <span
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="rounded-lg bg-wh-accent/10 px-2.5 py-1 text-xs font-medium text-wh-accent hover:bg-wh-accent/20"
            >
              Edit
            </span>
          )}
          <span className="text-wh-text-muted">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-wh-border p-4">
          <div className="flex flex-col gap-4">
            {thesis.prose.conviction && (
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-wh-text-muted">Conviction</div>
                <p className="text-sm text-wh-text">{thesis.prose.conviction}</p>
              </div>
            )}
            {thesis.prose.invalidation && (
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-wh-text-muted">What would change your mind</div>
                <p className="text-sm text-wh-text">{thesis.prose.invalidation}</p>
              </div>
            )}
            {thesis.prose.timeHorizon && (
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-wh-text-muted">Time Horizon</div>
                <p className="text-sm text-wh-text">{thesis.prose.timeHorizon}</p>
              </div>
            )}
            {thesis.prose.catalysts && (
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-wh-text-muted">Catalysts</div>
                <p className="text-sm text-wh-text">{thesis.prose.catalysts}</p>
              </div>
            )}

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-wh-text-muted">Guardrails</div>
              <div className="flex flex-col gap-1.5 text-sm">
                {thesis.dataFields.targetEntryPrice !== null && (
                  <div className="flex justify-between">
                    <span className="text-wh-text-muted">Entry target (CSP ceiling)</span>
                    <span className="text-wh-text">${thesis.dataFields.targetEntryPrice}</span>
                  </div>
                )}
                {thesis.dataFields.targetExitPrice !== null && (
                  <div className="flex justify-between">
                    <span className="text-wh-text-muted">Exit target (CC floor)</span>
                    <span className="text-wh-text">${thesis.dataFields.targetExitPrice}</span>
                  </div>
                )}
                {thesis.dataFields.maxAcceptableLoss !== null && (
                  <div className="flex justify-between">
                    <span className="text-wh-text-muted">Max acceptable loss</span>
                    <span className="text-wh-text">${thesis.dataFields.maxAcceptableLoss}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-wh-text-muted">Capital reserved</span>
                  <span className="text-wh-text">${thesis.dataFields.capitalReserved.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-wh-text-muted">Delta range</span>
                  <span className="text-wh-text">{thesis.dataFields.deltaRange.min} – {thesis.dataFields.deltaRange.max}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-wh-text-muted">DTE preference</span>
                  <span className="text-wh-text">{thesis.dataFields.dtePreference.min}–{thesis.dataFields.dtePreference.max} days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Thesis Editor ─────────────────────────────────────────────────

function ThesisEditor({ thesis, onDone }: { thesis: TickerThesis; onDone: () => void }) {
  const [conviction, setConviction] = useState(thesis.prose.conviction);
  const [invalidation, setInvalidation] = useState(thesis.prose.invalidation);
  const [timeHorizon, setTimeHorizon] = useState(thesis.prose.timeHorizon);
  const [catalysts, setCatalysts] = useState(thesis.prose.catalysts);
  const [targetEntry, setTargetEntry] = useState(thesis.dataFields.targetEntryPrice?.toString() ?? "");
  const [targetExit, setTargetExit] = useState(thesis.dataFields.targetExitPrice?.toString() ?? "");
  const [maxLoss, setMaxLoss] = useState(thesis.dataFields.maxAcceptableLoss?.toString() ?? "");
  const [capitalReserved, setCapitalReserved] = useState(thesis.dataFields.capitalReserved.toString());
  const [deltaMin, setDeltaMin] = useState(thesis.dataFields.deltaRange.min.toString());
  const [deltaMax, setDeltaMax] = useState(thesis.dataFields.deltaRange.max.toString());
  const [dteMin, setDteMin] = useState(thesis.dataFields.dtePreference.min.toString());
  const [dteMax, setDteMax] = useState(thesis.dataFields.dtePreference.max.toString());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await db.tickerTheses.update(thesis.id!, {
      prose: {
        conviction,
        invalidation,
        timeHorizon,
        catalysts,
      },
      dataFields: {
        ...thesis.dataFields,
        targetEntryPrice: targetEntry ? parseFloat(targetEntry) : null,
        targetExitPrice: targetExit ? parseFloat(targetExit) : null,
        maxAcceptableLoss: maxLoss ? parseFloat(maxLoss) : null,
        capitalReserved: parseFloat(capitalReserved) || thesis.dataFields.capitalReserved,
        deltaRange: {
          min: parseFloat(deltaMin) || thesis.dataFields.deltaRange.min,
          max: parseFloat(deltaMax) || thesis.dataFields.deltaRange.max,
        },
        dtePreference: {
          min: parseInt(dteMin) || thesis.dataFields.dtePreference.min,
          max: parseInt(dteMax) || thesis.dataFields.dtePreference.max,
        },
      },
      updatedAt: new Date().toISOString(),
    });
    setSaving(false);
    onDone();
  };

  const inputClass = "w-full rounded-lg border border-wh-border bg-wh-bg px-3 py-2 text-sm text-wh-text outline-none focus:border-wh-accent";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-wh-text-muted";

  return (
    <div className="rounded-2xl border-2 border-wh-accent bg-wh-surface p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-wh-accent">Edit Thesis</span>
        <div className="flex gap-2">
          <button onClick={onDone} className="rounded-lg px-3 py-1.5 text-xs text-wh-text-muted hover:text-wh-text">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-wh-accent px-4 py-1.5 text-xs font-medium text-wh-bg hover:bg-wh-accent-hover disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Prose */}
        <div>
          <label className={labelClass}>Conviction</label>
          <textarea value={conviction} onChange={(e) => setConviction(e.target.value)} rows={3} className={inputClass} placeholder="Why do you believe in this stock?" />
        </div>
        <div>
          <label className={labelClass}>What would change your mind</label>
          <textarea value={invalidation} onChange={(e) => setInvalidation(e.target.value)} rows={2} className={inputClass} placeholder="What would make you stop wheeling this?" />
        </div>
        <div>
          <label className={labelClass}>Time Horizon</label>
          <input value={timeHorizon} onChange={(e) => setTimeHorizon(e.target.value)} className={inputClass} placeholder="e.g. 6 months, indefinitely" />
        </div>
        <div>
          <label className={labelClass}>Catalysts</label>
          <input value={catalysts} onChange={(e) => setCatalysts(e.target.value)} className={inputClass} placeholder="Upcoming events" />
        </div>

        {/* Guardrails */}
        <div className="border-t border-wh-border pt-4">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-wh-accent">Guardrails</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Entry target (CSP ceiling)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-wh-text-muted">$</span>
              <input type="number" value={targetEntry} onChange={(e) => setTargetEntry(e.target.value)} className={`${inputClass} pl-7`} placeholder="—" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Exit target (CC floor)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-wh-text-muted">$</span>
              <input type="number" value={targetExit} onChange={(e) => setTargetExit(e.target.value)} className={`${inputClass} pl-7`} placeholder="—" />
            </div>
          </div>
        </div>
        <div>
          <label className={labelClass}>Max acceptable loss</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-wh-text-muted">$</span>
            <input type="number" value={maxLoss} onChange={(e) => setMaxLoss(e.target.value)} className={`${inputClass} pl-7`} placeholder="—" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Capital reserved</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-wh-text-muted">$</span>
            <input type="number" value={capitalReserved} onChange={(e) => setCapitalReserved(e.target.value)} className={`${inputClass} pl-7`} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Delta range</label>
          <div className="flex items-center gap-2">
            <input type="number" step="0.01" value={deltaMin} onChange={(e) => setDeltaMin(e.target.value)} className={inputClass} />
            <span className="text-wh-text-muted">–</span>
            <input type="number" step="0.01" value={deltaMax} onChange={(e) => setDeltaMax(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>DTE preference</label>
          <div className="flex items-center gap-2">
            <input type="number" value={dteMin} onChange={(e) => setDteMin(e.target.value)} className={inputClass} />
            <span className="text-wh-text-muted">–</span>
            <input type="number" value={dteMax} onChange={(e) => setDteMax(e.target.value)} className={inputClass} />
            <span className="text-sm text-wh-text-muted">days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
