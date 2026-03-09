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
  Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { MonthlyPnL } from "@/lib/calculations";

interface MonthlyROIChartProps {
  data: MonthlyPnL[];
}

export function MonthlyROIChart({ data }: MonthlyROIChartProps) {
  if (data.length === 0) return null;

  return (
    <Card>
      <h3 className="mb-4 text-sm font-medium text-gray-400">Monthly ROI</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#6b6b80" }}
            tickFormatter={(v) => v.slice(2)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b6b80" }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={false}
            contentStyle={{
              backgroundColor: "#1e1e2a",
              border: "1px solid #2d2d3d",
              borderRadius: "8px",
              color: "#ebebf0",
            }}
            formatter={(value, name) => {
              const num = Number(value);
              const color = num >= 0 ? "#4ade80" : "#f87171";
              const label = name === "annualizedRoi" ? "Ann. ROI" : "ROI";
              return [<span style={{ color }}>{label} : {num.toFixed(2)}%</span>, null];
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#6b6b80" }}
            formatter={(value) => (value === "annualizedRoi" ? "Annualized" : "ROI")}
          />
          <ReferenceLine y={0} stroke="#4a4a5e" strokeDasharray="3 3" />
          <Bar dataKey="roi" name="roi" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.roi >= 0 ? "#60a5fa" : "#f87171"}
              />
            ))}
          </Bar>
          <Bar dataKey="annualizedRoi" name="annualizedRoi" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.annualizedRoi >= 0 ? "#c084fc" : "#f87171"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
