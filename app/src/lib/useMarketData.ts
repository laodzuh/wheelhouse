/**
 * React hooks for market data.
 * Fetches on mount, caches via the market-data service layer.
 */

import { useState, useEffect } from "react";
import { getStockQuote, getOptionsChain, type StockQuote, type OptionsChain } from "./market-data";

/**
 * Fetch a live stock quote for a ticker.
 * Returns { quote, loading, error }.
 */
export function useStockQuote(ticker: string | null) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getStockQuote(ticker).then((result) => {
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
  }, [ticker]);

  return { quote, loading, error };
}

/**
 * Fetch an options chain for a ticker + expiration.
 * Returns { chain, loading, error }.
 */
export function useOptionsChain(ticker: string | null, expiration?: string) {
  const [chain, setChain] = useState<OptionsChain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getOptionsChain(ticker, expiration).then((result) => {
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
  }, [ticker, expiration]);

  return { chain, loading, error };
}
