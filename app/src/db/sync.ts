import type { SyncState } from "@/lib/types";
import { applyBackup, serializeBackup, type BackupData } from "./backup";
import { SYNC_DATA_TABLE_NAMES, db } from "./database";

const AUTO_PUSH_DEBOUNCE_MS = 3000;

// ─── State helpers ─────────────────────────────────────────────────

const DEFAULT_STATE: SyncState = {
  id: 1,
  serverUrl: null,
  secret: null,
  lastServerVersion: 0,
  hasUnpushedChanges: false,
  lastPulledAt: null,
  lastPushedAt: null,
  status: "unconfigured",
  lastError: null,
};

export async function ensureSyncState(): Promise<SyncState> {
  const existing = await db.syncState.get(1);
  if (existing) return existing;
  await db.syncState.put(DEFAULT_STATE);
  return DEFAULT_STATE;
}

async function patch(changes: Partial<SyncState>): Promise<void> {
  await db.syncState.update(1, changes);
}

async function getState(): Promise<SyncState> {
  const state = await db.syncState.get(1);
  if (!state) throw new Error("syncState row missing — call ensureSyncState first");
  return state;
}

// ─── Auto-push scheduling ──────────────────────────────────────────

let suppressChangeTracking = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let hooksInstalled = false;

function installWriteHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  for (const name of SYNC_DATA_TABLE_NAMES) {
    const table = db.table(name);
    table.hook("creating", (_pk, _obj, _trans) => {
      onLocalWrite(name, "creating");
    });
    table.hook("updating", (_mods, _pk, _obj, _trans) => {
      onLocalWrite(name, "updating");
    });
    table.hook("deleting", (_pk, _obj, _trans) => {
      onLocalWrite(name, "deleting");
    });
  }
  console.info("[sync] write hooks installed on", SYNC_DATA_TABLE_NAMES.join(", "));
}

function onLocalWrite(tableName: string, op: string): void {
  if (suppressChangeTracking) return;
  console.info(`[sync] ${op} on ${tableName} → marking dirty, scheduling push`);
  void markDirtyAndSchedule();
}

async function markDirtyAndSchedule(): Promise<void> {
  await patch({ hasUnpushedChanges: true });
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void autoPush();
  }, AUTO_PUSH_DEBOUNCE_MS);
}

async function autoPush(): Promise<void> {
  const state = await getState();
  if (state.status === "unconfigured" || !state.serverUrl || !state.secret) return;
  await push();
}

// ─── HTTP ──────────────────────────────────────────────────────────

interface ServerEnvelope {
  version: number;
  updatedAt: string | null;
  body: BackupData | null;
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const state = await getState();
  if (!state.serverUrl || !state.secret) {
    throw new Error("sync_not_configured");
  }
  const url = new URL(path, state.serverUrl).toString();
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${state.secret}`);
  return fetch(url, { ...init, headers });
}

// ─── Public operations ─────────────────────────────────────────────

export interface TestConnectionResult {
  ok: boolean;
  version?: number;
  error?: string;
}

export async function testConnection(
  serverUrl: string,
  secret: string,
): Promise<TestConnectionResult> {
  try {
    const url = new URL("/sync/version", serverUrl).toString();
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (res.status === 401) return { ok: false, error: "Invalid sync secret" };
    if (!res.ok) return { ok: false, error: `Server responded ${res.status}` };
    const body = (await res.json()) as { version: number };
    return { ok: true, version: body.version };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export async function saveConfig(
  serverUrl: string,
  secret: string,
): Promise<void> {
  await patch({
    serverUrl,
    secret,
    status: "idle",
    lastError: null,
  });
}

export async function clearConfig(): Promise<void> {
  await db.syncState.put({ ...DEFAULT_STATE });
}

export interface PullResult {
  ok: boolean;
  serverVersion: number;
  replaced: boolean;
  error?: string;
}

export async function pull(): Promise<PullResult> {
  await patch({ status: "syncing", lastError: null });
  try {
    const res = await request("/sync");
    if (res.status === 401) {
      await patch({ status: "error", lastError: "Invalid sync secret" });
      return { ok: false, serverVersion: 0, replaced: false, error: "auth" };
    }
    if (!res.ok) {
      await patch({ status: "error", lastError: `Server responded ${res.status}` });
      return { ok: false, serverVersion: 0, replaced: false, error: `http_${res.status}` };
    }
    const envelope = (await res.json()) as ServerEnvelope;

    if (envelope.version === 0 || !envelope.body) {
      await patch({
        lastServerVersion: 0,
        lastPulledAt: new Date().toISOString(),
        status: "idle",
      });
      return { ok: true, serverVersion: 0, replaced: false };
    }

    suppressChangeTracking = true;
    try {
      await applyBackup(envelope.body);
    } finally {
      suppressChangeTracking = false;
    }

    await patch({
      lastServerVersion: envelope.version,
      lastPulledAt: new Date().toISOString(),
      hasUnpushedChanges: false,
      status: "idle",
    });
    return { ok: true, serverVersion: envelope.version, replaced: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    await patch({ status: "offline", lastError: msg });
    return { ok: false, serverVersion: 0, replaced: false, error: msg };
  }
}

export interface PushResult {
  ok: boolean;
  serverVersion?: number;
  conflict?: boolean;
  error?: string;
}

export async function push(): Promise<PushResult> {
  const state = await getState();
  if (!state.serverUrl || !state.secret) {
    return { ok: false, error: "not_configured" };
  }
  await patch({ status: "syncing", lastError: null });
  try {
    const snapshot = await serializeBackup();
    const res = await request("/sync", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Expected-Version": String(state.lastServerVersion),
      },
      body: JSON.stringify(snapshot),
    });

    if (res.status === 401) {
      await patch({ status: "error", lastError: "Invalid sync secret" });
      return { ok: false, error: "auth" };
    }
    if (res.status === 409) {
      const body = (await res.json()) as { currentVersion: number };
      await patch({
        status: "conflict",
        lastError: `Remote is at version ${body.currentVersion}; local was at ${state.lastServerVersion}.`,
      });
      return { ok: false, conflict: true };
    }
    if (!res.ok) {
      await patch({ status: "error", lastError: `Server responded ${res.status}` });
      return { ok: false, error: `http_${res.status}` };
    }

    const body = (await res.json()) as { version: number };
    await patch({
      lastServerVersion: body.version,
      lastPushedAt: new Date().toISOString(),
      hasUnpushedChanges: false,
      status: "idle",
    });
    return { ok: true, serverVersion: body.version };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    await patch({ status: "offline", lastError: msg });
    return { ok: false, error: msg };
  }
}

/**
 * Run on app start and on manual "Sync now". Pushes local-only changes
 * first (so they can't be clobbered by a pull), then pulls to catch up.
 */
export async function syncNow(): Promise<void> {
  const state = await getState();
  if (!state.serverUrl || !state.secret) return;

  if (state.hasUnpushedChanges) {
    const pushResult = await push();
    if (pushResult.conflict) return; // leave in conflict state; user resolves
    if (!pushResult.ok) return;
  }

  await pull();
}

/**
 * Conflict resolution: keep the local version, overwriting the server.
 * Fetches the server's current version number (without the body), then
 * re-pushes against that version. Succeeds even if the server moved ahead.
 */
export async function resolveConflictKeepLocal(): Promise<PushResult> {
  const res = await request("/sync/version");
  if (!res.ok) {
    await patch({ status: "error", lastError: `Server responded ${res.status}` });
    return { ok: false, error: `http_${res.status}` };
  }
  const { version } = (await res.json()) as { version: number };
  await patch({ lastServerVersion: version, status: "syncing", lastError: null });
  return push();
}

/**
 * Conflict resolution: discard local changes, take the server's version.
 */
export async function resolveConflictTakeRemote(): Promise<PullResult> {
  await patch({ hasUnpushedChanges: false });
  return pull();
}

// ─── Focus-triggered pull ──────────────────────────────────────────

let focusListenersInstalled = false;
let focusSyncTimer: ReturnType<typeof setTimeout> | null = null;
let focusSyncInFlight = false;

function installFocusListener(): void {
  if (focusListenersInstalled) return;
  if (typeof document === "undefined" || typeof window === "undefined") return;
  focusListenersInstalled = true;
  const schedule = () => {
    if (focusSyncTimer) return;
    focusSyncTimer = setTimeout(() => {
      focusSyncTimer = null;
      void syncOnFocus();
    }, 100);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedule();
  });
  window.addEventListener("focus", schedule);
}

async function syncOnFocus(): Promise<void> {
  if (focusSyncInFlight) return;
  const state = await db.syncState.get(1);
  if (!state?.serverUrl || !state.secret) return;
  if (state.status === "conflict" || state.status === "syncing") return;

  focusSyncInFlight = true;
  try {
    const res = await request("/sync/version");
    if (!res.ok) return;
    const { version } = (await res.json()) as { version: number };
    const remoteMoved = version > state.lastServerVersion;
    if (remoteMoved || state.hasUnpushedChanges) {
      await syncNow();
    }
  } catch {
    // Silent on focus path — avoid spamming error toasts when the tailnet
    // box happens to be asleep.
  } finally {
    focusSyncInFlight = false;
  }
}

// ─── Boot ──────────────────────────────────────────────────────────

let bootPromise: Promise<void> | null = null;

/**
 * Call once at app startup. Ensures the syncState row exists, installs
 * Dexie write hooks for auto-push + window-focus listener for auto-pull,
 * and kicks off a sync if configured.
 */
export function initSync(): Promise<void> {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    await ensureSyncState();
    installWriteHooks();
    installFocusListener();
    const state = await getState();
    if (state.serverUrl && state.secret) {
      await syncNow();
    }
  })();
  return bootPromise;
}
