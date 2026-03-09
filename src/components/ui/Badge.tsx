import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const colorMap = {
  green: "bg-green-500/20 text-green-400",
  red: "bg-red-500/20 text-red-400",
  blue: "bg-blue-500/20 text-blue-400",
  yellow: "bg-yellow-500/20 text-yellow-400",
  purple: "bg-purple-500/20 text-purple-400",
  gray: "bg-gray-600/30 text-gray-400",
  orange: "bg-orange-500/20 text-orange-500",
} as const;

interface BadgeProps {
  color: keyof typeof colorMap;
  children: ReactNode;
  className?: string;
}

export function Badge({ color, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colorMap[color],
        className
      )}
    >
      {children}
    </span>
  );
}
