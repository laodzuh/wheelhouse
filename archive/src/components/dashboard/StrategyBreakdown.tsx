import { Card } from "@/components/ui/Card";
import { formatCurrency, cn } from "@/lib/utils";
import type { StrategyStats } from "@/lib/calculations";

interface StrategyBreakdownProps {
  data: StrategyStats[];
}

export function StrategyBreakdown({ data }: StrategyBreakdownProps) {
  if (data.length === 0) return null;

  return (
    <Card>
      <h3 className="mb-4 text-sm font-medium text-gray-400">
        Performance by Strategy
      </h3>
      <div className="space-y-3">
        {data.map((s) => (
          <div key={s.strategy} className="flex items-center gap-3">
            <div className="min-w-[140px]">
              <p className="text-sm font-medium text-gray-200">{s.strategy}</p>
              <p className="text-xs text-gray-500">{s.trades} trades</p>
            </div>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500/70"
                  style={{ width: `${Math.min(s.winRate, 100)}%` }}
                />
              </div>
            </div>
            <div className="text-right min-w-[60px]">
              <p className="text-xs text-gray-400">{s.winRate.toFixed(0)}%</p>
            </div>
            <div className="text-right min-w-[90px]">
              <p
                className={cn(
                  "text-sm font-medium",
                  s.totalPnL >= 0 ? "text-green-400" : "text-red-400"
                )}
              >
                {formatCurrency(s.totalPnL)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
