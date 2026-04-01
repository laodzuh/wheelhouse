/**
 * Client-side market data service.
 *
 * Calls our Netlify serverless proxy (which holds the API key)
 * and returns typed data for stock quotes and options chains.
 *
 * Eulerpool uses ISINs as identifiers (e.g. US9311421039 for WMT).
 * The `searchTicker` function resolves a ticker to its ISIN.
 *
 * Includes an in-memory cache so navigating between pages doesn't
 * re-fetch the same data within the cache window.
 */

// ─── Types ────────────────────────────────────────────────────────

export interface StockQuote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  high: number | null;
  low: number | null;
  volume: number | null;
  timestamp: string;
}

export interface OptionContract {
  strike: number;
  bid: number;
  ask: number;
  mid: number;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  volume: number | null;
  openInterest: number | null;
}

export interface OptionsChain {
  ticker: string;
  expiration: string;
  calls: OptionContract[];
  puts: OptionContract[];
}

export interface SearchResult {
  identifier: string; // ISIN
  ticker: string;
  name: string;
  exchange?: string;
}

// ─── Cache ────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, maxAgeMs: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > maxAgeMs) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, fetchedAt: Date.now() });
}

// ─── API Base ─────────────────────────────────────────────────────

const PROXY_BASE = "/api/market-data";

// ─── Ticker → ISIN Search ────────────────────────────────────────

const SEARCH_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Search Eulerpool for a ticker symbol and return matches with ISINs.
 */
export async function searchTicker(query: string): Promise<SearchResult[]> {
  const cacheKey = `search:${query.toUpperCase()}`;
  const cached = getCached<SearchResult[]>(cacheKey, SEARCH_CACHE_MS);
  if (cached) return cached;

  try {
    const res = await fetch(`${PROXY_BASE}?action=search&query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];

    const raw = await res.json();

    // Normalize search results — shape may vary
    const results = normalizeSearchResults(raw);
    setCache(cacheKey, results);
    return results;
  } catch (err) {
    console.warn(`Search failed for "${query}":`, err);
    return [];
  }
}

/**
 * Convenience: resolve a ticker symbol to its ISIN.
 * Returns the best match or null.
 */
export async function resolveTickerToISIN(ticker: string): Promise<string | null> {
  const results = await searchTicker(ticker);
  if (results.length === 0) return null;

  // Prefer exact ticker match
  const exact = results.find((r) => r.ticker.toUpperCase() === ticker.toUpperCase());
  return exact?.identifier ?? results[0]?.identifier ?? null;
}

function normalizeSearchResults(raw: Record<string, unknown>): SearchResult[] {
  // The response might be an array directly or nested under a key
  const items = Array.isArray(raw) ? raw :
    Array.isArray(raw.results) ? raw.results :
    Array.isArray(raw.data) ? raw.data : [];

  return items
    .map((item: Record<string, unknown>) => {
      const identifier = (item.isin ?? item.identifier ?? item.id ?? "") as string;
      const ticker = (item.ticker ?? item.symbol ?? "") as string;
      const name = (item.name ?? item.companyName ?? item.shortName ?? "") as string;
      const exchange = (item.exchange ?? item.mic ?? "") as string;

      if (!identifier && !ticker) return null;

      return { identifier, ticker, name, exchange } as SearchResult;
    })
    .filter(Boolean) as SearchResult[];
}

// ─── Stock Quote ──────────────────────────────────────────────────

const QUOTE_CACHE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch a stock quote by ISIN identifier.
 * If `identifier` looks like a ticker (no digits), we auto-resolve it.
 */
export async function getStockQuote(
  identifier: string,
  ticker?: string
): Promise<StockQuote | null> {
  // If it looks like a ticker (no digits), try resolving to ISIN first
  let isin = identifier;
  const displayTicker = ticker ?? identifier;

  if (!/\d/.test(identifier)) {
    const resolved = await resolveTickerToISIN(identifier);
    if (!resolved) return null;
    isin = resolved;
  }

  const cacheKey = `quote:${isin}`;
  const cached = getCached<StockQuote>(cacheKey, QUOTE_CACHE_MS);
  if (cached) return cached;

  try {
    const res = await fetch(`${PROXY_BASE}?action=quote&identifier=${encodeURIComponent(isin)}`);
    if (!res.ok) return null;

    const raw = await res.json();
    const quote = normalizeQuote(displayTicker, raw);
    if (quote) setCache(cacheKey, quote);
    return quote;
  } catch (err) {
    console.warn(`Failed to fetch quote for ${isin}:`, err);
    return null;
  }
}

function normalizeQuote(ticker: string, raw: Record<string, unknown>): StockQuote | null {
  const price = extractNumber(raw, ["price", "last", "lastPrice", "close", "c"]);
  if (price === null) return null;

  const prevClose = extractNumber(raw, ["previousClose", "prevClose", "pc"]);
  const change = extractNumber(raw, ["change", "d"]) ?? (prevClose !== null ? price - prevClose : 0);
  const changePercent = extractNumber(raw, ["changePercent", "dp", "changePct"]) ??
    (prevClose && prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0);

  return {
    ticker: ticker.toUpperCase(),
    price,
    change,
    changePercent,
    high: extractNumber(raw, ["high", "h", "dayHigh"]),
    low: extractNumber(raw, ["low", "l", "dayLow"]),
    volume: extractNumber(raw, ["volume", "v"]),
    timestamp: new Date().toISOString(),
  };
}

// ─── Options Chain ────────────────────────────────────────────────

const OPTIONS_CACHE_MS = 15 * 60 * 1000; // 15 minutes

export async function getOptionsChain(
  identifier: string,
  expiration?: string,
  ticker?: string
): Promise<OptionsChain | null> {
  let isin = identifier;
  const displayTicker = ticker ?? identifier;

  if (!/\d/.test(identifier)) {
    const resolved = await resolveTickerToISIN(identifier);
    if (!resolved) return null;
    isin = resolved;
  }

  const cacheKey = `options:${isin}:${expiration || "all"}`;
  const cached = getCached<OptionsChain>(cacheKey, OPTIONS_CACHE_MS);
  if (cached) return cached;

  try {
    let url = `${PROXY_BASE}?action=options&identifier=${encodeURIComponent(isin)}`;
    if (expiration) url += `&expiration=${encodeURIComponent(expiration)}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const raw = await res.json();
    const chain = normalizeChain(displayTicker, expiration || "", raw);
    if (chain) setCache(cacheKey, chain);
    return chain;
  } catch (err) {
    console.warn(`Failed to fetch options for ${isin}:`, err);
    return null;
  }
}

function normalizeChain(
  ticker: string,
  expiration: string,
  raw: Record<string, unknown>
): OptionsChain | null {
  const rawCalls = (raw.calls ?? raw.call ?? []) as Record<string, unknown>[];
  const rawPuts = (raw.puts ?? raw.put ?? []) as Record<string, unknown>[];

  if (!Array.isArray(rawCalls) && !Array.isArray(rawPuts)) return null;

  const calls = (Array.isArray(rawCalls) ? rawCalls : []).map(normalizeContract).filter(Boolean) as OptionContract[];
  const puts = (Array.isArray(rawPuts) ? rawPuts : []).map(normalizeContract).filter(Boolean) as OptionContract[];

  return {
    ticker: ticker.toUpperCase(),
    expiration: (raw.expiration as string) || expiration,
    calls,
    puts,
  };
}

function normalizeContract(raw: Record<string, unknown>): OptionContract | null {
  const strike = extractNumber(raw, ["strike", "strikePrice"]);
  if (strike === null) return null;

  const bid = extractNumber(raw, ["bid"]) ?? 0;
  const ask = extractNumber(raw, ["ask"]) ?? 0;

  return {
    strike,
    bid,
    ask,
    mid: bid && ask ? (bid + ask) / 2 : bid || ask,
    iv: extractNumber(raw, ["iv", "impliedVolatility"]),
    delta: extractNumber(raw, ["delta"]),
    gamma: extractNumber(raw, ["gamma"]),
    theta: extractNumber(raw, ["theta"]),
    vega: extractNumber(raw, ["vega"]),
    volume: extractNumber(raw, ["volume"]),
    openInterest: extractNumber(raw, ["openInterest", "oi"]),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

function extractNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "number" && !isNaN(val)) return val;
    if (typeof val === "string") {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return null;
}

// ─── Filter helpers for Plan a Trade ──────────────────────────────

/**
 * Filter an options chain down to contracts that match the user's
 * strategy parameters. Returns contracts sorted by best fit.
 */
export function filterContracts(
  contracts: OptionContract[],
  params: {
    deltaMin: number;
    deltaMax: number;
    strikeMax?: number | null;
    strikeMin?: number | null;
  }
): OptionContract[] {
  return contracts
    .filter((c) => {
      const absDelta = c.delta !== null ? Math.abs(c.delta) : null;
      if (absDelta !== null) {
        if (absDelta < params.deltaMin || absDelta > params.deltaMax) return false;
      }
      if (params.strikeMax !== null && params.strikeMax !== undefined && c.strike > params.strikeMax) return false;
      if (params.strikeMin !== null && params.strikeMin !== undefined && c.strike < params.strikeMin) return false;
      if (c.bid <= 0 && c.ask <= 0) return false;
      return true;
    })
    .sort((a, b) => {
      const targetDelta = (params.deltaMin + params.deltaMax) / 2;
      const aDist = a.delta !== null ? Math.abs(Math.abs(a.delta) - targetDelta) : 999;
      const bDist = b.delta !== null ? Math.abs(Math.abs(b.delta) - targetDelta) : 999;
      return aDist - bDist;
    });
}
