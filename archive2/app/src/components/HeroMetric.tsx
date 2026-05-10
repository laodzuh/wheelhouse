/**
 * Hero metric card — the "glance and know" numbers.
 * Inspired by Whoop: open the app, see three numbers, know how you're doing.
 */
interface HeroMetricProps {
  label: string;
  value: string;
  subtext?: string;
  trend?: "up" | "down" | "flat";
}

export function HeroMetric({ label, value, subtext, trend }: HeroMetricProps) {
  const trendColor =
    trend === "up"
      ? "text-wh-success"
      : trend === "down"
        ? "text-wh-danger"
        : "text-wh-text-muted";

  return (
    <div className="rounded-xl border border-wh-border bg-wh-surface p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-wh-text-muted">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${trendColor}`}>{value}</div>
      {subtext && (
        <div className="mt-0.5 text-xs text-wh-text-muted">{subtext}</div>
      )}
    </div>
  );
}
