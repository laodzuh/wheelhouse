/**
 * React hooks for market data.
 * Fetches on mount, caches via the market-data service layer.
 *
 * Hooks accept either an ISIN (preferred) or a ticker symbol.
 * If only a ticker is provided, the service layer will auto-resolve
 * it to an ISIN via the Eulerpool search endpoint.
 */

import { useState, useEffect } from "react";
import { getStockQuote, getOptionsChain, type StockQuote, type OptionsChain } from "./market-data";

/**
 * Fetch a live stock quote.
 * Pass `isin` for fast direct lookup, or just `ticker` to auto-resolve.
 */
export function useStockQuote(ticker: string | null, isin?: string | null) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ISIN if available, fall back to ticker
  const identifier = isin || ticker;

  useEffect(() => {
    if (!identifier) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getStockQuote(identifier, ticker ?? undefined).then((result) => {
      if (cancelled) return;
      setQuote(result);
      setLoading(false);
      if (!result) setError("Could not load quote");
    }).catch(() => {
      if (!cancelled) {
        setError("Failed to fetch quote");
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [identifier, ticker]);

  return { quote, loading, error };
}

/**
 * Fetch an options chain.
 * Pass `isin` for fast direct lookup, or just `ticker` to auto-resolve.
 */
export function useOptionsChain(ticker: string | null, expiration?: string, isin?: string | null) {
  const [chain, setChain] = useState<OptionsChain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identifier = isin || ticker;

  useEffect(() => {
    if (!identifier) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getOptionsChain(identifier, expiration, ticker ?? undefined).then((result) => {
      if (cancelled) return;
      setChain(result);
      setLoading(false);
      if (!result) setError("Could not load options chain");
    }).catch(() => {
      if (!cancelled) {
        setError("Failed to fetch options");
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [identifier, ticker, expiration]);

  return { chain, loading, error };
}
