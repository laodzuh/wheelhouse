import { cn } from "@/lib/utils";
import type { PositionPhase } from "@/db/types";

interface PhaseIndicatorProps {
  phase: PositionPhase;
}

const phases: { key: PositionPhase; label: string }[] = [
  { key: "selling_puts", label: "Selling Puts" },
  { key: "holding_shares", label: "Holding Shares" },
  { key: "completed", label: "Completed" },
];

export function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  const currentIdx = phases.findIndex((p) => p.key === phase);

  return (
    <div className="flex items-center gap-1.5">
      {phases.map((p, i) => {
        const isActive = i === currentIdx;
        const isPast = i < currentIdx;

        return (
          <div key={p.key} className="flex items-center gap-1.5">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-4",
                  isPast || isActive ? "bg-blue-500" : "bg-gray-700"
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full border-2",
                  isActive && "border-blue-500 bg-blue-500",
                  isPast && "border-blue-500 bg-blue-500/40",
                  !isActive && !isPast && "border-gray-600 bg-transparent"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive && "text-blue-400",
                  isPast && "text-gray-500",
                  !isActive && !isPast && "text-gray-600"
                )}
              >
                {p.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
