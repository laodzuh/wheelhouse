import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUserProfile, useActiveStrategy, useStrategyHistory } from "@/db";
import { db } from "@/db";
import { exportDatabase, importDatabase } from "@/db/backup";
import type { Strategy as StrategyType } from "@/lib/types";
import { format } from "date-fns";

export function Strategy() {
  const profile = useUserProfile();
  const strategy = useActiveStrategy();
  const history = useStrategyHistory(profile?.id ?? 0);
  const navigate = useNavigate();
  const [mode, setMode] = useState<"view" | "edit" | "history">("view");

  if (profile === undefined || strategy === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-wh-text-muted">Loading...</div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="flex min-h-screen items-center justify-center pb-20">
        <div className="text-center">
          <p className="text-wh-text-muted">No strategy found.</p>
          <button
            onClick={() => navigate("/onboarding")}
            className="mt-4 rounded-lg bg-wh-accent px-4 py-2 text-sm text-wh-bg"
          >
            Set up your strategy
          </button>
        </div>
      </div>
    );
  }

  if (mode === "edit") {
    return (
      <EditMode
        strategy={strategy}
        onSave={() => setMode("view")}
        onCancel={() => setMode("view")}
      />
    );
  }

  if (mode === "history") {
    return (
      <HistoryMode
        history={history ?? []}
        currentId={strategy.id!}
        onBack={() => setMode("view")}
      />
    );
  }

  return <ViewMode strategy={strategy} onEdit={() => setMode("edit")} onHistory={() => setMode("history")} />;
}

// ─── View Mode ─────────────────────────────────────────────────────

function ViewMode({
  strategy,
  onEdit,
  onHistory,
}: {
  strategy: StrategyType;
  onEdit: () => void;
  onHistory: () => void;
}) {
  const params = strategyToParams(strategy);

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-wh-text">{strategy.name}</h1>
          <p className="mt-1 text-sm text-wh-text-muted">
            v{strategy.version} · Updated{" "}
            {format(new Date(strategy.createdAt), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onHistory}
            className="rounded-lg border border-wh-border px-3 py-1.5 text-xs text-wh-text-muted transition-colors hover:border-wh-accent hover:text-wh-accent"
          >
            History
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg bg-wh-accent px-3 py-1.5 text-xs font-medium text-wh-bg transition-colors hover:bg-wh-accent-hover"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {params.map((p) => (
          <ParamCard key={p.label} label={p.label} value={p.display} context={p.context} tooltip={p.tooltip} />
        ))}
      </div>

      {/* Data Backup */}
      <BackupSection />
    </div>
  );
}

// ─── Edit Mode ─────────────────────────────────────────────────────

function EditMode({
  strategy,
  onSave,
  onCancel,
}: {
  strategy: StrategyType;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(strategy.name);
  const [totalCapital, setTotalCapital] = useState(strategy.positionSizing.totalCapital);
  const [maxPositionPercent, setMaxPositionPercent] = useState(strategy.riskProfile.maxPositionPercent);
  const [dteMin, setDteMin] = useState(strategy.timePreferences.dteRange.min);
  const [dteMax, setDteMax] = useState(strategy.timePreferences.dteRange.max);
  const [deltaMin, setDeltaMin] = useState(strategy.deltaRange.min);
  const [deltaMax, setDeltaMax] = useState(strategy.deltaRange.max);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    // Deactivate current strategy
    await db.strategies.update(strategy.id!, { isActive: false });

    // Create new version
    await db.strategies.add({
      ...strategy,
      id: undefined,
      name,
      version: strategy.version + 1,
      isActive: true,
      positionSizing: { totalCapital },
      riskProfile: { ...strategy.riskProfile, maxPositionPercent },
      timePreferences: {
        ...strategy.timePreferences,
        dteRange: { min: dteMin, max: dteMax },
      },
      deltaRange: { min: deltaMin, max: deltaMax },
      previousVersionId: strategy.id!,
      createdAt: new Date().toISOString(),
    });

    setSaving(false);
    onSave();
  };

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-wh-text">Edit Strategy</h1>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-xs text-wh-text-muted hover:text-wh-text"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-wh-accent px-4 py-1.5 text-xs font-medium text-wh-bg hover:bg-wh-accent-hover disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save as v" + (strategy.version + 1)}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Strategy Name */}
        <EditField label="Strategy Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-wh-border bg-wh-bg px-4 py-2.5 text-wh-text outline-none focus:border-wh-accent"
          />
        </EditField>

        {/* Total Capital */}
        <EditField label="Total Capital" tooltip="Your capital available for wheeling.">
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-wh-text-muted">$</span>
            <input
              type="number"
              value={totalCapital}
              onChange={(e) => setTotalCapital(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-wh-border bg-wh-bg py-2.5 pl-8 pr-4 text-wh-text outline-none focus:border-wh-accent"
            />
          </div>
        </EditField>

        {/* Max Position % */}
        <EditField label="Max Position Size" tooltip="Max percentage of capital committed to one ticker.">
          <div className="relative">
            <input
              type="number"
              value={maxPositionPercent}
              onChange={(e) => setMaxPositionPercent(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-wh-border bg-wh-bg px-4 py-2.5 pr-8 text-wh-text outline-none focus:border-wh-accent"
            />
            <span className="absolute right-3 top-2.5 text-wh-text-muted">%</span>
          </div>
        </EditField>

        {/* DTE Range */}
        <EditField label="DTE Range" tooltip="Days to expiration — how long your contracts run.">
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={dteMin}
              onChange={(e) => setDteMin(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-wh-border bg-wh-bg px-4 py-2.5 text-wh-text outline-none focus:border-wh-accent"
            />
            <span className="text-wh-text-muted">–</span>
            <input
              type="number"
              value={dteMax}
              onChange={(e) => setDteMax(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-wh-border bg-wh-bg px-4 py-2.5 text-wh-text outline-none focus:border-wh-accent"
            />
            <span className="text-sm text-wh-text-muted">days</span>
          </div>
        </EditField>

        {/* Delta Range */}
        <EditField label="Delta Range" tooltip="Probability of assignment. Higher = more premium, more risk.">
          <div className="flex items-center gap-3">
            <input
              type="number"
              step={0.01}
              value={deltaMin}
              onChange={(e) => setDeltaMin(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-wh-border bg-wh-bg px-4 py-2.5 text-wh-text outline-none focus:border-wh-accent"
            />
            <span className="text-wh-text-muted">–</span>
            <input
              type="number"
              step={0.01}
              value={deltaMax}
              onChange={(e) => setDeltaMax(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-wh-border bg-wh-bg px-4 py-2.5 text-wh-text outline-none focus:border-wh-accent"
            />
          </div>
        </EditField>
      </div>
    </div>
  );
}

// ─── History Mode ──────────────────────────────────────────────────

function HistoryMode({
  history,
  currentId,
  onBack,
}: {
  history: StrategyType[];
  currentId: number;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedVersion = history.find((s) => s.id === selectedId);

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-wh-text">Version History</h1>
        <button
          onClick={onBack}
          className="rounded-lg px-3 py-1.5 text-xs text-wh-text-muted hover:text-wh-text"
        >
          Back
        </button>
      </div>

      {history.length === 0 ? (
        <p className="text-wh-text-muted">No history yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {history.map((version) => (
            <button
              key={version.id}
              onClick={() => setSelectedId(selectedId === version.id ? null : version.id!)}
              className={`rounded-xl border p-4 text-left transition-all ${
                version.id === currentId
                  ? "border-wh-accent bg-wh-accent/10"
                  : selectedId === version.id
                    ? "border-wh-border bg-wh-surface-raised"
                    : "border-wh-border bg-wh-surface hover:border-wh-accent/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-wh-text">
                    v{version.version}
                  </span>
                  {version.id === currentId && (
                    <span className="ml-2 text-xs text-wh-accent">current</span>
                  )}
                </div>
                <span className="text-xs text-wh-text-muted">
                  {format(new Date(version.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              <div className="mt-1 text-sm text-wh-text-muted">
                {version.name}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Expanded version details */}
      {selectedVersion && (
        <div className="mt-4 rounded-xl border border-wh-border bg-wh-surface p-4">
          <h3 className="mb-3 text-sm font-medium text-wh-text-muted">
            v{selectedVersion.version} Parameters
          </h3>
          <div className="flex flex-col gap-2">
            {strategyToParams(selectedVersion).map((p) => (
              <div key={p.label} className="flex justify-between text-sm">
                <span className="text-wh-text-muted">{p.label}</span>
                <span className="text-wh-text">{p.display}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared Components ─────────────────────────────────────────────

function ParamCard({
  label,
  value,
  context,
  tooltip,
}: {
  label: string;
  value: string;
  context?: string;
  tooltip?: string;
}) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="rounded-xl border border-wh-border bg-wh-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-wh-text-muted">
            {label}
          </div>
          <div className="mt-1 text-lg font-semibold text-wh-accent">{value}</div>
        </div>
        {tooltip && (
          <button
            onClick={() => setShowTip(!showTip)}
            className="rounded-full border border-wh-border px-2 py-0.5 text-xs text-wh-text-muted hover:border-wh-accent hover:text-wh-accent"
          >
            ?
          </button>
        )}
      </div>
      {context && (
        <p className="mt-2 text-sm text-wh-text-muted">{context}</p>
      )}
      {showTip && tooltip && (
        <p className="mt-2 rounded-lg bg-wh-bg/50 p-3 text-xs text-wh-text-muted">
          {tooltip}
        </p>
      )}
    </div>
  );
}

function EditField({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-wh-border bg-wh-surface p-4">
      <label className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-wh-text-muted">{label}</span>
        {tooltip && (
          <span className="text-xs text-wh-text-muted/60">{tooltip}</span>
        )}
      </label>
      {children}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────

function strategyToParams(strategy: StrategyType) {
  return [
    {
      label: "Total Capital",
      display: `$${strategy.positionSizing.totalCapital.toLocaleString()}`,
      context: "Informs how many wheels you can run and how much you can commit per ticker.",
      tooltip: "Your capital available for wheeling. Combined with max position size, this determines the scale of each position.",
    },
    {
      label: "Max Position Size",
      display: `${strategy.riskProfile.maxPositionPercent}%`,
      context: "Prevents overconcentration. Caps how much capital any single ticker can use.",
      tooltip: `At $${strategy.positionSizing.totalCapital.toLocaleString()} capital with ${strategy.riskProfile.maxPositionPercent}% max, that's up to $${Math.round(strategy.positionSizing.totalCapital * strategy.riskProfile.maxPositionPercent / 100).toLocaleString()} per ticker.`,
    },
    {
      label: "Risk Profile",
      display: `${strategy.riskProfile.drawdownTemperament} / ${strategy.riskProfile.focus.replace("-", " ")}`,
      context: "Shapes how aggressively you trade and whether you optimize for income or share accumulation.",
      tooltip: "Your drawdown temperament and focus together influence delta selection, position sizing, and how Wheelhouse evaluates your trades.",
    },
    {
      label: "DTE Range",
      display: `${strategy.timePreferences.dteRange.min}–${strategy.timePreferences.dteRange.max} days`,
      context: "Controls the pace of your wheel. Shorter = more turnover, longer = more theta but ties up capital.",
      tooltip: "Days to Expiration. Wheelhouse checks your trades against this range and flags when you drift outside it.",
    },
    {
      label: "Delta Range",
      display: `${strategy.deltaRange.min} – ${strategy.deltaRange.max}`,
      context: "Balances premium income against assignment probability. This is what you aim for when selling options.",
      tooltip: "Higher delta = more premium collected per contract but higher chance of being assigned. Lower delta = less premium but more likely to expire worthless.",
    },
  ];
}

// ─── Backup Section ────────────────────────────────────────────────

function BackupSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      await exportDatabase();
      setStatus("Backup downloaded.");
      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus("Export failed.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("This will replace all your current data. Are you sure?")) {
      e.target.value = "";
      return;
    }

    try {
      await importDatabase(file);
      setStatus("Backup restored. Refreshing...");
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      setStatus("Import failed — check that the file is a valid Wheelhouse backup.");
    }
    e.target.value = "";
  };

  return (
    <div className="mt-8 rounded-xl border border-wh-border bg-wh-surface p-4">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-wh-text-muted">
        Data Backup
      </div>
      <p className="mb-4 text-sm text-wh-text-muted">
        Your data lives in this browser. Export a backup to keep it safe.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="rounded-lg bg-wh-accent/10 px-4 py-2 text-sm font-medium text-wh-accent transition-colors hover:bg-wh-accent/20"
        >
          Download Backup
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-wh-border px-4 py-2 text-sm text-wh-text-muted transition-colors hover:border-wh-accent hover:text-wh-accent"
        >
          Restore from Backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>
      {status && (
        <p className="mt-2 text-xs text-wh-accent">{status}</p>
      )}
    </div>
  );
}
