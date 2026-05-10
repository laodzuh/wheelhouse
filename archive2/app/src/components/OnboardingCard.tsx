import type { ReactNode } from "react";

/**
 * The centered card container used for each onboarding step.
 * Conversational headline at top, content below, nav buttons at bottom.
 */
interface OnboardingCardProps {
  headline: string;
  subtext?: string;
  children: ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
}

export function OnboardingCard({
  headline,
  subtext,
  children,
  onNext,
  onBack,
  nextLabel = "Continue",
  nextDisabled = false,
  showBack = true,
}: OnboardingCardProps) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-wh-border bg-wh-surface p-8 shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-wh-text">{headline}</h2>
        {subtext && (
          <p className="mt-2 text-wh-text-muted">{subtext}</p>
        )}
      </div>

      <div className="mb-8">{children}</div>

      <div className="flex items-center justify-between">
        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg px-4 py-2 text-sm text-wh-text-muted transition-colors hover:text-wh-text"
          >
            Back
          </button>
        ) : (
          <div />
        )}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="rounded-lg bg-wh-accent px-6 py-2.5 text-sm font-medium text-wh-bg transition-colors hover:bg-wh-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
