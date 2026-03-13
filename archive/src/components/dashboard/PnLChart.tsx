import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { CumulativePnLPoint } from "@/lib/calculations";
import { formatCurrency } from "@/lib/utils";

interface PnLChartProps {
  data: CumulativePnLPoint[];
}

export function PnLChart({ data }: PnLChartProps) {
  if (data.length === 0) return null;

  const lastPnL = data[data.length - 1].pnl;
  const lineColor = lastPnL >= 0 ? "#4ade80" : "#f87171";

  return (
    <Card>
      <h3 className="mb-4 text-sm font-medium text-gray-400">
        Cumulative P&L
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6b6b80" }}
            tickFormatter={(v) => v.slice(5)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b6b80" }}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e1e2a",
              border: "1px solid #2d2d3d",
              borderRadius: "8px",
              color: "#ebebf0",
            }}
            formatter={(value) => {
              const num = Number(value);
              const color = num >= 0 ? "#4ade80" : "#f87171";
              return [<span style={{ color }}>P&L : {formatCurrency(num)}</span>, null];
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <ReferenceLine y={0} stroke="#4a4a5e" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="pnl"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
