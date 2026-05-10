import { useState } from "react";
import { useSyncState } from "@/db";
import { syncNow } from "@/db/sync";
import { SyncDialog, statusMeta } from "./SyncDialog";

/**
 * Compact sync status + a directly-actionable "Sync now" button.
 * Chip opens the dialog (details/config); button triggers an immediate
 * push+pull cycle.
 */
export function SyncChip() {
  const state = useSyncState();
  const [open, setOpen] = useState(false);
  const [pushing, setPushing] = useState(false);

  if (!state) return null;

  const meta = statusMeta(state.status);
  const configured =
    state.status !== "unconfigured" && Boolean(state.serverUrl);

  async function handleSyncNow() {
    setPushing(true);
    try {
      await syncNow();
    } finally {
      setPushing(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${meta.classes} hover:bg-wh-surface-raised`}
          aria-label={`Sync: ${meta.label}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          <span>{meta.label}</span>
          {state.hasUnpushedChanges && state.status === "idle" && (
            <span className="ml-0.5 h-1 w-1 rounded-full bg-wh-accent" />
          )}
        </button>
        {configured && (
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={pushing || state.status === "syncing"}
            className="rounded-full border border-wh-border px-2.5 py-1 text-xs text-wh-text-muted transition-colors hover:border-wh-accent/60 hover:text-wh-accent disabled:opacity-50"
            aria-label="Sync now"
          >
            {pushing || state.status === "syncing" ? "…" : "Sync"}
          </button>
        )}
      </div>
      <SyncDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
