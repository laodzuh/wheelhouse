import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DATA_DIR = process.env.DATA_DIR ?? "./data";
const DATA_PATH = join(DATA_DIR, "sync.json");
const TMP_PATH = join(DATA_DIR, "sync.json.tmp");

export interface StoredData {
  version: number;
  updatedAt: string;
  body: unknown;
}

export async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function read(): Promise<StoredData | null> {
  try {
    const text = await readFile(DATA_PATH, "utf8");
    return JSON.parse(text) as StoredData;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

// Serialize writes so two concurrent PUTs can't interleave read-then-write and
// both succeed against the same expectedVersion.
let writeQueue: Promise<unknown> = Promise.resolve();

export function write(
  body: unknown,
  expectedVersion: number,
): Promise<
  { ok: true; data: StoredData } | { ok: false; currentVersion: number }
> {
  const next = writeQueue.then(() => doWrite(body, expectedVersion));
  writeQueue = next.catch(() => undefined);
  return next;
}

async function doWrite(
  body: unknown,
  expectedVersion: number,
): Promise<
  { ok: true; data: StoredData } | { ok: false; currentVersion: number }
> {
  const current = await read();
  const currentVersion = current?.version ?? 0;
  if (currentVersion !== expectedVersion) {
    return { ok: false, currentVersion };
  }

  const data: StoredData = {
    version: currentVersion + 1,
    updatedAt: new Date().toISOString(),
    body,
  };

  // Atomic replace: write temp file, then rename. rename(2) on the same
  // filesystem is atomic on Linux, so readers either see the old file or the
  // new one — never a half-written state.
  await writeFile(TMP_PATH, JSON.stringify(data));
  await rename(TMP_PATH, DATA_PATH);

  return { ok: true, data };
}

function isNotFound(err: unknown): boolean {
  return (
    err instanceof Error &&
    "code" in err &&
    (err as NodeJS.ErrnoException).code === "ENOENT"
  );
}
