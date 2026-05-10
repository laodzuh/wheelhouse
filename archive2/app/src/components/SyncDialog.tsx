import { useEffect, useState } from "react";
import { useSyncState } from "@/db";
import { db } from "@/db/database";
import {
  clearConfig,
  pull,
  push,
  resolveConflictKeepLocal,
  resolveConflictTakeRemote,
  saveConfig,
  syncNow,
  testConnection,
} from "@/db/sync";
import type { SyncState } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SyncDialog({ open, onClose }: Props) {
  const state = useSyncState();
  const [editing, setEditing] = useState(false);

  if (!open || !state) return null;

  const showEditor = editing || state.status === "unconfigured";

  return (
    <DialogShell onClose={onClose}>
      {showEditor ? (
        <EditForm
          state={state}
          onCancel={() => {
            if (state.status === "unconfigured") onClose();
            else setEditing(false);
          }}
          onSaved={() => setEditing(false)}
        />
      ) : (
        <StatusView
          state={state}
          onEdit={() => setEditing(true)}
          onClose={onClose}
        />
      )}
    </DialogShell>
  );
}

// ─── Dialog shell ──────────────────────────────────────────────────

function DialogShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-wh-bg/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-wh-border bg-wh-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Status view ───────────────────────────────────────────────────

function StatusView({
  state,
  onEdit,
  onClose,
}: {
  state: SyncState;
  onEdit: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<
    "sync" | "resolve-local" | "resolve-remote" | null
  >(null);

  async function handleSyncNow() {
    setBusy("sync");
    await syncNow();
    setBusy(null);
  }

  async function handleKeepLocal() {
    setBusy("resolve-local");
    await resolveConflictKeepLocal();
    setBusy(null);
  }

  async function handleTakeRemote() {
    setBusy("resolve-remote");
    await resolveConflictTakeRemote();
    setBusy(null);
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-wh-text">Sync</h2>
        <StatusBadge status={state.status} />
      </div>

      <div className="mb-5 space-y-2 text-sm text-wh-text-muted">
        <Row label="Server" value={state.serverUrl ?? "—"} mono />
        <Row
          label="Last pulled"
          value={formatRelative(state.lastPulledAt)}
        />
        <Row
          label="Last pushed"
          value={formatRelative(state.lastPushedAt)}
        />
        <Row label="Server version" value={String(state.lastServerVersion)} />
        {state.hasUnpushedChanges && (
          <p className="text-wh-accent">Local has unpushed changes.</p>
        )}
        {state.lastError && (
          <p className="rounded-lg bg-wh-bg/50 p-3 text-wh-text">
            {state.lastError}
          </p>
        )}
      </div>

      {state.status === "conflict" ? (
        <div className="mb-5 space-y-3 rounded-xl border border-wh-accent/40 bg-wh-bg/40 p-4">
          <p className="text-sm text-wh-text">
            Remote moved under you. Pick a side — the other version will be
            overwritten.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleKeepLocal}
              disabled={busy !== null}
              className="flex-1 rounded-lg bg-wh-accent px-3 py-2 text-sm font-medium text-wh-bg hover:bg-wh-accent-hover disabled:opacity-50"
            >
              {busy === "resolve-local" ? "…" : "Keep local"}
            </button>
            <button
              onClick={handleTakeRemote}
              disabled={busy !== null}
              className="flex-1 rounded-lg border border-wh-border px-3 py-2 text-sm text-wh-text hover:border-wh-accent/60 disabled:opacity-50"
            >
              {busy === "resolve-remote" ? "…" : "Take remote"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleSyncNow}
          disabled={busy !== null}
          className="mb-3 w-full rounded-lg bg-wh-accent px-4 py-2.5 text-sm font-medium text-wh-bg hover:bg-wh-accent-hover disabled:opacity-50"
        >
          {busy === "sync" ? "Syncing…" : "Sync now"}
        </button>
      )}

      <div className="flex justify-between text-sm">
        <button
          onClick={onEdit}
          className="text-wh-text-muted hover:text-wh-text"
        >
          Edit server / secret
        </button>
        <button onClick={onClose} className="text-wh-text-muted hover:text-wh-text">
          Close
        </button>
      </div>
    </>
  );
}

// ─── Editor ────────────────────────────────────────────────────────

function EditForm({
  state,
  onCancel,
  onSaved,
}: {
  state: SyncState;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [url, setUrl] = useState(state.serverUrl ?? "");
  const [secret, setSecret] = useState(state.secret ?? "");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    error?: string;
    version?: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setTestResult(null);
  }, [url, secret]);

  const canSubmit = Boolean(url.trim()) && Boolean(secret.trim()) && !saving;

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(url.trim(), secret.trim());
    setTestResult(result);
    setTesting(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    const test = await testConnection(url.trim(), secret.trim());
    if (!test.ok) {
      setTestResult(test);
      setSaving(false);
      return;
    }

    const cleanUrl = url.trim().replace(/\/$/, "");
    await saveConfig(cleanUrl, secret.trim());

    // First-setup reconciliation
    const localHasData = (await db.userProfile.count()) > 0;
    const serverVersion = test.version ?? 0;

    try {
      if (serverVersion > 0 && localHasData) {
        // Both sides have data. Default to taking remote; user can
        // undo via the conflict controls if this wasn't what they wanted.
        await resolveConflictTakeRemote();
      } else if (serverVersion > 0) {
        await pull();
      } else if (localHasData) {
        await push();
      }
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    await clearConfig();
    onCancel();
  }

  return (
    <>
      <h2 className="mb-4 text-lg font-semibold text-wh-text">
        {state.status === "unconfigured" ? "Connect to sync server" : "Edit sync config"}
      </h2>

      <div className="mb-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm text-wh-text-muted">
            Server URL
          </span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://omarchy.tailnet.ts.net"
            className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-3 py-2 font-mono text-sm text-wh-text outline-none focus:border-wh-accent"
            autoComplete="url"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-wh-text-muted">
            Shared secret
          </span>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Paste your SYNC_SECRET"
            className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-3 py-2 font-mono text-sm text-wh-text outline-none focus:border-wh-accent"
            autoComplete="off"
          />
        </label>
      </div>

      {testResult && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm ${
            testResult.ok
              ? "bg-wh-bg/50 text-wh-text"
              : "bg-wh-bg/50 text-wh-text"
          }`}
        >
          {testResult.ok ? (
            <>
              <span className="text-wh-accent">✓ Connected.</span>{" "}
              Server is at version {testResult.version}.
            </>
          ) : (
            <>
              <span className="text-wh-accent">✗</span>{" "}
              {testResult.error ?? "Connection failed"}
            </>
          )}
        </div>
      )}

      {saveError && (
        <div className="mb-4 rounded-lg bg-wh-bg/50 p-3 text-sm text-wh-text">
          {saveError}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={!url.trim() || !secret.trim() || testing}
            className="rounded-lg border border-wh-border px-3 py-2 text-sm text-wh-text hover:border-wh-accent/60 disabled:opacity-50"
          >
            {testing ? "Testing…" : "Test connection"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSubmit}
            className="rounded-lg bg-wh-accent px-4 py-2 text-sm font-medium text-wh-bg hover:bg-wh-accent-hover disabled:opacity-50"
          >
            {saving ? "Connecting…" : "Save & connect"}
          </button>
        </div>
        <div className="flex gap-2">
          {state.status !== "unconfigured" && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="text-sm text-wh-text-muted hover:text-wh-text"
            >
              Disconnect
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-wh-text-muted hover:text-wh-text"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: SyncState["status"] }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${meta.classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span
        className={`truncate text-right text-wh-text ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export function statusMeta(status: SyncState["status"]): {
  label: string;
  dot: string;
  classes: string;
} {
  switch (status) {
    case "idle":
      return {
        label: "Synced",
        dot: "bg-wh-accent",
        classes: "border-wh-accent/40 text-wh-accent",
      };
    case "syncing":
      return {
        label: "Syncing",
        dot: "bg-wh-accent animate-pulse",
        classes: "border-wh-accent/40 text-wh-accent",
      };
    case "offline":
      return {
        label: "Offline",
        dot: "bg-wh-text-muted",
        classes: "border-wh-border text-wh-text-muted",
      };
    case "error":
      return {
        label: "Error",
        dot: "bg-red-500",
        classes: "border-red-500/40 text-red-500",
      };
    case "conflict":
      return {
        label: "Conflict",
        dot: "bg-yellow-500",
        classes: "border-yellow-500/40 text-yellow-500",
      };
    case "unconfigured":
    default:
      return {
        label: "Off",
        dot: "bg-wh-text-muted",
        classes: "border-wh-border text-wh-text-muted",
      };
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
