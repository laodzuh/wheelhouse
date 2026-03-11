import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { exportTrades, getLastExportedAt } from "@/lib/export";

const BACKUP_WARN_DAYS = 7;

export function BackupBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [exporting, setExporting] = useState(false);

  const lastExport = getLastExportedAt();
  const daysSince = lastExport
    ? Math.floor((Date.now() - lastExport.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const shouldShow = !dismissed && (daysSince === null || daysSince >= BACKUP_WARN_DAYS);
  if (!shouldShow) return null;

  const message = daysSince === null
    ? "You haven't backed up your data yet. Your trades are stored locally in this browser only."
    : `You haven't backed up your data in ${daysSince} days. Export regularly to avoid losing your trades.`;

  async function handleExport() {
    setExporting(true);
    await exportTrades();
    setExporting(false);
    setDismissed(true);
  }

  return (
    <div className="mb-6 flex items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <div className="flex-1">
        <p className="text-sm text-amber-200">{message}</p>
      </div>
      <Button variant="secondary" onClick={handleExport} disabled={exporting}>
        {exporting ? "Exporting..." : "Export Now"}
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="rounded p-1 text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
