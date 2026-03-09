import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/Card";

interface WinLossChartProps {
  wins: number;
  losses: number;
}

export function WinLossChart({ wins, losses }: WinLossChartProps) {
  if (wins === 0 && losses === 0) return null;

  const data = [
    { name: "Wins", value: wins },
    { name: "Losses", value: losses },
  ];
  const COLORS = ["#4ade80", "#f87171"];

  return (
    <Card>
      <h3 className="mb-4 text-sm font-medium text-gray-400">
        Win / Loss Distribution
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e1e2a",
              border: "1px solid #2d2d3d",
              borderRadius: "8px",
              color: "#ebebf0",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-400" />
          <span className="text-gray-300">Wins ({wins})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <span className="text-gray-300">Losses ({losses})</span>
        </div>
      </div>
    </Card>
  );
}
