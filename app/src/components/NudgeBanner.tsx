import type { Nudge } from "@/lib/nudges";

/**
 * Inline nudge display — subtle, contextual, not a pop-up.
 * From flow 04: "Reference the user's own words. Never advise; always reflect."
 */

const STYLES = {
  info: "border-wh-accent/30 bg-wh-accent/5 text-wh-accent",
  warning: "border-wh-warning/30 bg-wh-warning/5 text-wh-warning",
  flag: "border-wh-danger/30 bg-wh-danger/5 text-wh-danger",
  action: "border-wh-accent/30 bg-wh-accent/5 text-wh-accent",
} as const;

export function NudgeBanner({ nudge }: { nudge: Nudge | { type: "action"; message: string } }) {
  const style = STYLES[nudge.type] || STYLES.info;

  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${style}`}>
      {nudge.message}
    </div>
  );
}

export function NudgeList({ nudges }: { nudges: Array<Nudge | { type: "action"; message: string }> }) {
  if (nudges.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {nudges.map((nudge, i) => (
        <NudgeBanner key={i} nudge={nudge} />
      ))}
    </div>
  );
}
