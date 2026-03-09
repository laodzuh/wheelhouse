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
import type { MonthlyPnL } from "@/lib/calculations";
import { formatCurrency } from "@/lib/utils";

interface MonthlyPnLChartProps {
  data: MonthlyPnL[];
}

export function MonthlyPnLChart({ data }: MonthlyPnLChartProps) {
  if (data.length === 0) return null;

  return (
    <Card>
      <h3 className="mb-4 text-sm font-medium text-gray-400">Monthly P&L</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#6b6b80" }}
            tickFormatter={(v) => v.slice(2)} // "25-01"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b6b80" }}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            cursor={false}
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
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.pnl >= 0 ? "#4ade80" : "#f87171"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
