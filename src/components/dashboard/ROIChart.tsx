import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { CumulativePnLPoint } from "@/lib/calculations";

interface ROIChartProps {
  data: CumulativePnLPoint[];
}

export function ROIChart({ data }: ROIChartProps) {
  if (data.length === 0) return null;

  return (
    <Card>
      <h3 className="mb-4 text-sm font-medium text-gray-400">
        Cumulative ROI
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
            tickFormatter={(v) => `${v}%`}
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
              return [<span style={{ color }}>{num.toFixed(2)}%</span>, null];
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#6b6b80" }}
          />
          <ReferenceLine y={0} stroke="#4a4a5e" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="roi"
            name="ROI"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="annualizedRoi"
            name="Annualized"
            stroke="#c084fc"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
