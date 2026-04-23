import { useState } from "react";
import { useSyncState } from "@/db";
import { SyncDialog, statusMeta } from "./SyncDialog";

/**
 * Compact sync status button. Renders nothing while Dexie is loading.
 * Shows a status dot + label; click opens the dialog.
 */
export function SyncChip() {
  const state = useSyncState();
  const [open, setOpen] = useState(false);

  if (!state) return null;

  const meta = statusMeta(state.status);
  const showDot =
    state.status === "syncing" ||
    state.status === "error" ||
    state.status === "conflict" ||
    state.hasUnpushedChanges;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${meta.classes} hover:bg-wh-surface-raised`}
        aria-label={`Sync: ${meta.label}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        <span>{meta.label}</span>
        {showDot && state.hasUnpushedChanges && state.status === "idle" && (
          <span className="h-1 w-1 rounded-full bg-wh-accent" />
        )}
      </button>
      <SyncDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
