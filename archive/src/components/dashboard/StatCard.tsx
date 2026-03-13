import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  color?: "default" | "green" | "red";
}

export function StatCard({ label, value, subValue, color = "default" }: StatCardProps) {
  return (
    <Card>
      <p className="text-sm font-medium text-gray-400">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold",
          color === "green" && "text-green-400",
          color === "red" && "text-red-400",
          color === "default" && "text-gray-100"
        )}
      >
        {value}
      </p>
      {subValue && (
        <p className="mt-1 text-xs text-gray-500">{subValue}</p>
      )}
    </Card>
  );
}
