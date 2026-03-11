import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import type { TickerStats } from "@/lib/calculations";

interface TickerBreakdownProps {
  data: TickerStats[];
}

export function TickerBreakdown({ data }: TickerBreakdownProps) {
  if (data.length === 0) return null;

  // Show top 10 by absolute P&L
  const top = [...data]
    .sort((a, b) => Math.abs(b.totalPnL) - Math.abs(a.totalPnL))
    .slice(0, 10);

  return (
    <Card>
      <h3 className="mb-4 text-sm font-medium text-gray-400">
        P&L by Ticker
      </h3>
      <ResponsiveContainer width="100%" height={top.length * 40 + 40}>
        <BarChart data={top} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#6b6b80" }}
            tickFormatter={(v) => `$${v}`}
          />
          <YAxis
            type="category"
            dataKey="ticker"
            tick={{ fontSize: 12, fill: "#d1d5db", fontWeight: 500 }}
            width={55}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            contentStyle={{
              backgroundColor: "#1e1e2a",
              border: "1px solid #2d2d3d",
              borderRadius: "8px",
              color: "#ebebf0",
            }}
            formatter={(value) => {
              const num = Number(value);
              const color = num >= 0 ? "#4ade80" : "#f87171";
              return [<span style={{ color }}>{formatCurrency(num)}</span>, "P&L"];
            }}
          />
          <ReferenceLine x={0} stroke="#4a4a5e" strokeDasharray="3 3" />
          <Bar dataKey="totalPnL" radius={[0, 4, 4, 0]} barSize={20}>
            {top.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.totalPnL >= 0 ? "#4ade80" : "#f87171"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
