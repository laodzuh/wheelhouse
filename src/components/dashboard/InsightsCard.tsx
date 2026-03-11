import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { TradeInsights } from "@/lib/calculations";

interface InsightsCardProps {
  insights: TradeInsights;
}

export function InsightsCard({ insights }: InsightsCardProps) {
  const {
    avgDaysInTrade,
    profitFactor,
    currentStreak,
    longestWinStreak,
    longestLossStreak,
  } = insights;

  const streakLabel =
    currentStreak.type === "none"
      ? "No trades yet"
      : `${currentStreak.count} ${currentStreak.type === "win" ? "wins" : "losses"}`;

  return (
    <Card>
      <h3 className="mb-4 text-sm font-medium text-gray-400">
        Trade Insights
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <Insight
          label="Avg Days in Trade"
          value={`${avgDaysInTrade}d`}
        />
        <Insight
          label="Profit Factor"
          value={profitFactor > 0 ? profitFactor.toFixed(2) : "—"}
          hint={
            profitFactor >= 2
              ? "Excellent"
              : profitFactor >= 1.5
                ? "Good"
                : profitFactor >= 1
                  ? "Breakeven+"
                  : profitFactor > 0
                    ? "Below 1"
                    : undefined
          }
          hintColor={
            profitFactor >= 1.5
              ? "green"
              : profitFactor >= 1
                ? "default"
                : "red"
          }
        />
        <Insight
          label="Current Streak"
          value={streakLabel}
          valueColor={
            currentStreak.type === "win"
              ? "green"
              : currentStreak.type === "loss"
                ? "red"
                : "default"
          }
        />
        <Insight
          label="Best Streaks"
          value={`${longestWinStreak}W / ${longestLossStreak}L`}
        />
      </div>
    </Card>
  );
}

function Insight({
  label,
  value,
  hint,
  valueColor = "default",
  hintColor = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  valueColor?: "default" | "green" | "red";
  hintColor?: "default" | "green" | "red";
}) {
  return (
    <div className="rounded-lg bg-gray-800/50 px-3 py-2.5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p
        className={cn(
          "text-lg font-bold",
          valueColor === "green" && "text-green-400",
          valueColor === "red" && "text-red-400",
          valueColor === "default" && "text-gray-100"
        )}
      >
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            "text-xs mt-0.5",
            hintColor === "green" && "text-green-400/70",
            hintColor === "red" && "text-red-400/70",
            hintColor === "default" && "text-gray-500"
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
