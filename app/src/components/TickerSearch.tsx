import { useState, useRef, useEffect, useCallback } from "react";
import { searchTicker, type SearchResult } from "@/lib/market-data";

// ─── Props ───────────────────────────────────────────────────────

interface TickerSearchProps {
  /** Current value shown in the input */
  value: string;
  /** Called on every keystroke (raw uppercase text) */
  onChange: (value: string) => void;
  /** Called when user selects a result from the dropdown */
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
}

// ─── Component ───────────────────────────────────────────────────

export function TickerSearch({
  value,
  onChange,
  onSelect,
  placeholder = "Search by ticker or company name...",
}: TickerSearchProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // ── Debounced search ──────────────────────────────────────────

  const doSearch = useCallback(async (query: string) => {
    if (query.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const hits = await searchTicker(query);
      setResults(hits);
      setIsOpen(hits.length > 0);
      setHighlightIdx(-1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (raw: string) => {
    const upper = raw.toUpperCase();
    onChange(upper);

    // Clear any pending debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Debounce the search — 300ms feels snappy without hammering the API
    debounceRef.current = setTimeout(() => doSearch(upper), 300);
  };

  // ── Keyboard navigation ───────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      selectResult(results[highlightIdx]!);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const selectResult = (result: SearchResult) => {
    onChange(result.ticker || result.identifier);
    onSelect(result);
    setIsOpen(false);
    setResults([]);
  };

  // ── Click outside to close ────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-wh-border bg-wh-surface-raised px-4 py-3 text-2xl font-bold uppercase text-wh-text placeholder-wh-text-muted/50 outline-none focus:border-wh-accent"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-wh-accent border-t-transparent" />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-wh-border bg-wh-surface-raised shadow-lg">
          {results.map((result, idx) => (
            <li
              key={result.identifier || `${result.ticker}-${idx}`}
              onMouseDown={() => selectResult(result)}
              onMouseEnter={() => setHighlightIdx(idx)}
              className={`cursor-pointer px-4 py-3 transition-colors ${
                idx === highlightIdx
                  ? "bg-wh-accent/15 text-wh-text"
                  : "text-wh-text hover:bg-wh-accent/10"
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-base font-bold">
                  {result.ticker || "—"}
                </span>
                {result.exchange && (
                  <span className="text-xs text-wh-text-muted">
                    {result.exchange}
                  </span>
                )}
              </div>
              <div className="mt-0.5 truncate text-sm text-wh-text-muted">
                {result.name}
              </div>
              {result.identifier && (
                <div className="mt-0.5 text-xs text-wh-text-muted/60">
                  {result.identifier}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* No results message */}
      {isOpen && results.length === 0 && !isLoading && value.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-wh-border bg-wh-surface-raised px-4 py-3 text-sm text-wh-text-muted shadow-lg">
          No matches found for "{value}"
        </div>
      )}
    </div>
  );
}
