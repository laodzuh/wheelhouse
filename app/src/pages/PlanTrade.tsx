import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useThesis, useActiveStrategy } from "@/db";
import { useStockQuote, useOptionsChain } from "@/lib/useMarketData";
import { filterContracts, type OptionContract } from "@/lib/market-data";

/**
 * Plan a Trade — pre-trade decision support.
 *
 * Route: /thesis/:tickerId/plan?type=csp or ?type=cc
 *
 * Fetches the live options chain, filters it through the user's
 * strategy/thesis parameters, and presents a shortlist of contracts
 * with return projections. The user picks one, and we pass it through
 * to the trade entry form with fields pre-populated.
 */

export function PlanTrade() {
  const { tickerId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const thesis = useThesis(Number(tickerId));
  const strategy = useActiveStrategy();
  const tradeType = (searchParams.get("type") || "csp") as "csp" | "cc";

  const { quote } = useStockQuote(thesis?.ticker ?? null);

  // Date picker for expiration
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const { chain, loading: chainLoading, error: chainError } = useOptionsChain(
    thesis?.ticker ?? null,
    selectedExpiry || undefined
  );

  if (thesis === undefined || strategy === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-wh-text-muted">Loading...</div>
      </div>
    );
  }

  if (!thesis || !strategy) {
    navigate("/");
    return null;
  }

  // Filter params from thesis + strategy
  const deltaRange = thesis.dataFields.deltaRange || strategy.deltaRange;
  const contracts = chain
    ? filterContracts(
        tradeType === "csp" ? chain.puts : chain.calls,
        {
          deltaMin: deltaRange.min,
          deltaMax: deltaRange.max,
          strikeMax: tradeType === "csp" ? thesis.dataFields.targetEntryPrice : null,
          strikeMin: tradeType === "cc" ? thesis.dataFields.targetExitPrice : null,
        }
      )
    : [];

  const handleSelectContract = (contract: OptionContract) => {
    // Navigate to trade entry with pre-populated fields
    const params = new URLSearchParams({
      action: tradeType === "csp" ? "sell-csp" : "sell-cc",
      plannedStrike: contract.strike.toString(),
      plannedPremium: contract.mid.toFixed(2),
      plannedExpiry: selectedExpiry,
      plannedDelta: contract.delta !== null ? Math.abs(contract.delta).toFixed(2) : "",
    });

    navigate(`/thesis/${tickerId}/trade/start?${params.toString()}`);
  };

  const isCsp = tradeType === "csp";
  const capitalAtRisk = (strike: number) => strike * 100;
  const annualGoal = strategy.incomeGoal?.annual ?? null;

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/thesis/${tickerId}`)}
          className="mb-2 text-sm text-wh-text-muted hover:text-wh-text"
        >
          ← {thesis.ticker}
        </button>
        <h1 className="text-2xl font-bold text-wh-text">
          Plan a {isCsp ? "CSP" : "CC"} — {thesis.ticker}
        </h1>
        <p className="mt-1 text-sm text-wh-text-muted">
          {isCsp
            ? "Find a cash-secured put that fits your thesis"
            : "Find a covered call that fits your thesis"}
        </p>
      </div>

      {/* Live price */}
      {quote && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-wh-text-muted">Current price:</span>
          <span className="font-semibold text-wh-text">${quote.price.toFixed(2)}</span>
          <span
            className={`text-xs ${
              quote.change >= 0 ? "text-wh-success" : "text-wh-danger"
            }`}
          >
            {quote.change >= 0 ? "+" : ""}
            {quote.changePercent.toFixed(1)}%
          </span>
        </div>
      )}

      {/* Strategy context */}
      <div className="mb-6 rounded-xl border border-wh-border bg-wh-surface p-3">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-wh-text-muted">
          Your guardrails
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="text-wh-text-muted">
            Delta: <span className="text-wh-text">{deltaRange.min}–{deltaRange.max}</span>
          </span>
          <span className="text-wh-text-muted">
            DTE: <span className="text-wh-text">{thesis.dataFields.dtePreference.min}–{thesis.dataFields.dtePreference.max}d</span>
          </span>
          {isCsp && thesis.dataFields.targetEntryPrice && (
            <span className="text-wh-text-muted">
              Max strike: <span className="text-wh-text">${thesis.dataFields.targetEntryPrice}</span>
            </span>
          )}
          {!isCsp && thesis.dataFields.targetExitPrice && (
            <span className="text-wh-text-muted">
              Min strike: <span className="text-wh-text">${thesis.dataFields.targetExitPrice}</span>
            </span>
          )}
        </div>
      </div>

      {/* Expiration picker */}
      <div className="mb-6">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-wh-text-muted">
          Expiration date
        </label>
        <input
          type="date"
          value={selectedExpiry}
          onChange={(e) => setSelectedExpiry(e.target.value)}
          className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-4 py-2.5 text-wh-text outline-none focus:border-wh-accent"
        />
        {selectedExpiry && (
          <span className="mt-1 block text-xs text-wh-accent">
            {Math.ceil((new Date(selectedExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} DTE
          </span>
        )}
      </div>

      {/* Results */}
      {chainLoading && (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-wh-text-muted">Loading options chain...</span>
        </div>
      )}

      {chainError && !chainLoading && (
        <div className="rounded-xl border border-wh-warning/30 bg-wh-warning/5 p-4 text-sm text-wh-warning">
          {chainError}. You can still enter a trade manually.
          <button
            onClick={() => navigate(`/thesis/${tickerId}/trade/start`)}
            className="mt-2 block text-xs underline"
          >
            Enter trade manually →
          </button>
        </div>
      )}

      {chain && !chainLoading && contracts.length === 0 && (
        <div className="rounded-xl border border-dashed border-wh-border p-6 text-center text-sm text-wh-text-muted">
          No contracts match your guardrails for this expiration.
          Try a different date, or{" "}
          <button
            onClick={() => navigate(`/thesis/${tickerId}/trade/start`)}
            className="text-wh-accent underline"
          >
            enter a trade manually
          </button>
          .
        </div>
      )}

      {contracts.length > 0 && (
        <div>
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-wh-text-muted">
            {contracts.length} contract{contracts.length !== 1 ? "s" : ""} match your strategy
          </div>
          <div className="flex flex-col gap-2">
            {contracts.slice(0, 10).map((contract) => {
              const premiumPerContract = contract.mid * 100;
              const capital = capitalAtRisk(contract.strike);
              const rawReturn = capital > 0 ? (premiumPerContract / capital) * 100 : 0;
              const dte = selectedExpiry
                ? Math.max(1, Math.ceil((new Date(selectedExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : null;
              const annReturn = dte ? rawReturn * (365 / dte) : null;
              const goalPct = annualGoal && annualGoal > 0
                ? (premiumPerContract / annualGoal) * 100
                : null;
              const annColor = annReturn !== null
                ? annReturn >= 20 ? "text-wh-success" : annReturn >= 10 ? "text-wh-accent" : "text-wh-warning"
                : "text-wh-text-muted";

              return (
                <button
                  key={contract.strike}
                  onClick={() => handleSelectContract(contract)}
                  className="rounded-xl border border-wh-border bg-wh-surface p-4 text-left transition-all hover:border-wh-accent/50 active:bg-wh-surface-raised"
                >
                  {/* Row 1: Strike + Premium */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-semibold text-wh-text">
                        ${contract.strike}
                      </span>
                      {contract.delta !== null && (
                        <span className="ml-2 text-xs text-wh-text-muted">
                          Δ {Math.abs(contract.delta).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-wh-accent">
                        ${contract.mid.toFixed(2)}
                      </span>
                      <span className="ml-1 text-xs text-wh-text-muted">mid</span>
                    </div>
                  </div>

                  {/* Row 2: Bid/Ask spread */}
                  <div className="mt-1 flex items-center gap-3 text-xs text-wh-text-muted">
                    <span>${contract.bid.toFixed(2)} bid / ${contract.ask.toFixed(2)} ask</span>
                    {contract.iv !== null && (
                      <span>IV {(contract.iv * 100).toFixed(0)}%</span>
                    )}
                    {contract.openInterest !== null && (
                      <span>OI {contract.openInterest.toLocaleString()}</span>
                    )}
                  </div>

                  {/* Row 3: Return projection */}
                  <div className="mt-2 flex items-center justify-between border-t border-wh-border/50 pt-2">
                    <span className="text-xs text-wh-text-muted">
                      ${premiumPerContract.toFixed(0)} on ${capital.toLocaleString()}
                      {rawReturn > 0 && ` = ${rawReturn.toFixed(2)}%`}
                    </span>
                    <div className="flex items-center gap-2">
                      {annReturn !== null && (
                        <span className={`text-xs font-semibold ${annColor}`}>
                          {annReturn.toFixed(1)}% ann.
                        </span>
                      )}
                      {goalPct !== null && (
                        <span className="text-xs text-wh-accent">
                          {goalPct.toFixed(1)}% of goal
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Manual entry fallback */}
          <button
            onClick={() => navigate(`/thesis/${tickerId}/trade/start`)}
            className="mt-4 block w-full text-center text-xs text-wh-text-muted hover:text-wh-text"
          >
            Don't see what you want? Enter trade manually →
          </button>
        </div>
      )}

      {/* Show manual entry if no expiry selected yet */}
      {!selectedExpiry && !chainLoading && (
        <div className="rounded-xl border border-dashed border-wh-border p-6 text-center">
          <p className="text-sm text-wh-text-muted">
            Pick an expiration date to see contracts that fit your strategy.
          </p>
          <button
            onClick={() => navigate(`/thesis/${tickerId}/trade/start`)}
            className="mt-3 text-xs text-wh-accent hover:underline"
          >
            Or enter a trade manually →
          </button>
        </div>
      )}
    </div>
  );
}
