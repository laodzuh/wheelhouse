/**
 * Simple step progress bar for multi-step flows.
 * Shows which step you're on and lets you see how far you've come.
 */
interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const percent = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="w-full">
      <div className="mb-2 flex justify-between text-sm text-wh-text-muted">
        <span>
          Step {currentStep} of {totalSteps}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-wh-surface">
        <div
          className="h-1.5 rounded-full bg-wh-accent transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
