import { Card } from "@/components/ui/Card";
import { cn, formatCurrency } from "@/lib/utils";

export interface StrategySummary {
  name: string;
  totalPnL: number;
  optionPnL: number;
  sharesPnL: number;
  positions: number;
  openPositions: number;
  winRate: number;
}

interface StrategyOverviewProps {
  strategies: StrategySummary[];
}

export function StrategyOverview({ strategies }: StrategyOverviewProps) {
  if (strategies.length === 0) return null;

  return (
    <Card>
      <h3 className="mb-4 text-sm font-medium text-gray-400">Strategy Overview</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        {strategies.map((s) => (
          <div
            key={s.name}
            className="rounded-lg bg-gray-800/50 px-4 py-3"
          >
            <p className="text-sm font-medium text-gray-300 mb-2">{s.name}</p>
            <p
              className={cn(
                "text-xl font-bold mb-1",
                s.totalPnL >= 0 ? "text-green-400" : "text-red-400"
              )}
            >
              {formatCurrency(s.totalPnL)}
            </p>
            <div className="space-y-0.5 text-xs text-gray-500">
              {s.sharesPnL !== 0 && (
                <p>
                  Options: {formatCurrency(s.optionPnL)} / Shares: {formatCurrency(s.sharesPnL)}
                </p>
              )}
              <p>
                {s.positions} position{s.positions !== 1 ? "s" : ""}
                {s.openPositions > 0 && ` (${s.openPositions} active)`}
              </p>
              {s.winRate > 0 && <p>Win rate: {s.winRate.toFixed(0)}%</p>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
