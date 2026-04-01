/**
 * Single-select or multi-select option cards.
 * Used throughout onboarding for personality-style questions.
 * Each option is a tappable card with label and optional description.
 */

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface OptionSelectorProps {
  options: Option[];
  selected: string | string[];
  onSelect: (value: string) => void;
  multi?: boolean;
}

export function OptionSelector({
  options,
  selected,
  onSelect,
  multi = false,
}: OptionSelectorProps) {
  const isSelected = (value: string) =>
    multi
      ? (selected as string[]).includes(value)
      : selected === value;

  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => {
        const active = isSelected(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`rounded-xl border px-4 py-3 text-left transition-all ${
              active
                ? "border-wh-accent bg-wh-accent/10 text-wh-text"
                : "border-wh-border bg-wh-surface-raised text-wh-text-muted hover:border-wh-accent/50 hover:text-wh-text"
            }`}
          >
            <div className="font-medium">{option.label}</div>
            {option.description && (
              <div className="mt-1 text-sm opacity-70">{option.description}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
