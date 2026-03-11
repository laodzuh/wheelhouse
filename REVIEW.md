# Wheelhouse MVP — Code Review & Production Readiness Assessment

**Reviewer:** Claude
**Date:** March 9, 2026
**Last Updated:** March 10, 2026
**Scope:** Full codebase review (~2,900 LOC across 40 source files)

---

## Executive Summary

Wheelhouse is a client-side options trading journal built with React 19, TypeScript, Vite 7, Tailwind CSS 4, Dexie (IndexedDB), and Recharts. For a day-one MVP, the architecture is clean and the code is well-structured. The core business logic (P&L calculations, Fidelity CSV import, trade grouping) is solid and separated from the UI. That said, there are meaningful gaps across data modeling, type safety, security, testability, and production deployment that need addressing before real users depend on this with their financial data.

Below I've organized findings into five areas — each with a severity indicator (Critical, High, Medium, Low) and concrete recommendations.

> **Progress Update (March 10, 2026):** 14 of 18 roadmap items have been completed across all three phases. See status markers on each item below.

---

## 1. Data Model & Database Layer

### 1.1 The `Trade` interface is doing too much (High)

The `Trade` type carries 25 fields including option data, assignment/shares data, group metadata, and audit timestamps all flattened into one interface. This creates several problems: nullable fields that only apply to certain statuses (e.g., `assignedShares` is only meaningful when `status === "Assigned"`), the `strategy` field is typed as `string` rather than the `Strategy` union, and there's no way to enforce invariants (like "if status is Closed, dateClosed must be set").

**Recommendation:** Introduce discriminated unions or at minimum use branded types. For example, separate `OptionLeg` data from `AssignmentDetails`, compose them in the `Trade` record, and use the `Strategy` type rather than plain `string`:

```ts
// Instead of: strategy: string
strategy: Strategy;

// Consider a discriminated shape:
type TradeDetails =
  | { status: "Open"; dateClosed: null; closePrice: null }
  | { status: "Closed (Win)" | "Closed (Loss)"; dateClosed: string; closePrice: number }
  | { status: "Assigned"; dateClosed: string; assignmentDetails: AssignmentDetails }
  // etc.
```

### ~~1.2 No data validation at the database boundary (Critical)~~ — RESOLVED

`importTrades()` in `export.ts` now validates all incoming JSON against a shared `TradeSchema` (Zod) via `safeParse()` before writing to IndexedDB. The Fidelity CSV parser (`fidelity.ts`) also validates every constructed trade through the same schema before returning. The schema is defined once in `src/db/schema.ts` and enforces type constraints, non-negative numbers, string length limits, and enum membership on all 25 fields.

### 1.3 No database migration strategy (Medium)

The Dexie versioning (v1 → v2) works for now, but there's no upgrade function — just index redefinitions. If you need to rename a field, split a table, or backfill data in production, you'll need actual migration logic. Dexie supports this via `.upgrade()` callbacks.

**Recommendation:** Add upgrade functions to version transitions and document the schema evolution. Consider a `migrations/` folder pattern for future changes.

### ~~1.4 Account deletion doesn't cascade (High)~~ — RESOLVED

`deleteAccount()` now uses a Dexie transaction to nullify `accountId` on all related trades before deleting the account record. Both operations are atomic — if either fails, the whole transaction rolls back.

### 1.5 `bulkPut` allows silent overwrites (Medium)

Both Fidelity import and JSON import use `bulkPut`, which will silently overwrite existing trades with the same ID. Re-importing a Fidelity CSV could clobber user edits (e.g., manually corrected premiums on partial imports).

**Recommendation:** Use `bulkAdd` (which throws on duplicates) and let the user choose how to handle conflicts, or implement merge logic that preserves user edits.

---

## 2. Product Architecture

### ~~2.1 No error boundaries (High)~~ — RESOLVED

An `ErrorBoundary` class component wraps the entire app in `main.tsx`. It catches render errors and displays a styled recovery UI with "Try Again" (resets error state) and "Reload Page" options, instead of crashing to a white screen.

### ~~2.2 No loading states (Medium)~~ — RESOLVED

`DashboardPage` and `TradesPage` now show animated skeleton loaders while `useLiveQuery` data loads, instead of returning `null`. `DashboardSkeleton` mimics the stat card grid and chart layout. `TradeTableSkeleton` mimics the trade table with placeholder rows. The page shell (sidebar, header) remains visible during loading.

### 2.3 No routing for individual trades (Low)

There's no `/trades/:id` route. Everything happens through modals. This means you can't deep-link to a specific trade, which will matter as the product grows (e.g., sharing a trade analysis, browser history).

**Recommendation:** Add a trade detail route, even if the current modal UX stays as the primary interaction.

### ~~2.4 Roll workflow uses `prompt()` (High)~~ — RESOLVED

### ~~2.5 `confirm()` for destructive actions (Medium)~~ — RESOLVED

Both `window.prompt()` and `window.confirm()` have been replaced with a custom `ConfirmDialog` component that supports both confirmation-only and input modes. It validates numeric input before allowing confirmation, has a `danger` variant for destructive actions, and uses the app's existing `Modal`, `Button`, and `Input` components for consistent styling. Zero native dialogs remain in the codebase.

### ~~2.6 Theme implementation is incomplete (Medium)~~ — RESOLVED

The non-functional light mode toggle has been removed from Settings. The app is locked to dark mode, which matches the hardcoded CSS. The `useTheme` hook is retained for future use when proper `dark:` variant support is implemented.

---

## 3. Code Quality & TypeScript Usage

### ~~3.1 No tests whatsoever (Critical)~~ — RESOLVED

Vitest is configured with 48 unit tests across two test files:
- `calculations.test.ts` (33 tests): covers `calculateOptionPnL`, `calculateTotalPnL`, `calculateROI`, `calculateAnnualizedROI`, `calculateBasis`, `groupTrades`, `calculateDashboardStats`, `calculateMonthlyPnL`, and `calculateCumulativePnL` — including edge cases for open trades, expired options, multiple contracts, and empty data.
- `fidelity.test.ts` (15 tests): covers complete trades, buy/sell-to-open/close, expirations, assignments (put and call), partial trades, skipped non-option actions, quoted CSV fields, strategy inference, sort order, and unique ID generation.

### ~~3.2 Floating-point arithmetic for money (High)~~ — RESOLVED

A `cents()` helper (`Math.round(value * 100) / 100`) is applied at every money computation point: P&L returns, basis calculations, cumulative sums, averages, and fee totals. This prevents floating-point drift from compounding across trade aggregations. All 48 existing tests continue to pass with the rounding applied.

### ~~3.3 Form state management is verbose (Medium)~~ — RESOLVED

`TradeForm` has been refactored from 22 individual `useState` calls to a single `useForm()` call using React Hook Form. Validation rules are declared inline with `register()`, errors are managed by the library, and `watch()` handles conditional rendering. Adding a new field now requires one `register()` call instead of changes in 4-5 places.

### 3.4 Calculations are recomputed on every render cycle (Medium)

`TradeRow` calls `calculateTotalPnL`, `calculateROI`, and `calculateAnnualizedROI` inline. For a table with hundreds of trades, this is doing redundant work on every re-render. `useMemo` is used higher up in `useTradeStats`, but the individual row-level calculations are not memoized.

**Recommendation:** Either memoize per-row calculations or pre-compute them when building the trade groups. A denormalization step during data fetch (add computed `pnl`, `roi`, `annualizedRoi` fields to each trade object) would be more efficient.

### 3.5 Duplicated calculation logic (Medium)

`calculateBasis()` duplicates the basis computation from `calculateROI()`. If the ROI formula changes, someone needs to remember to update both.

**Recommendation:** Have `calculateROI()` call `calculateBasis()` internally, eliminating the duplication.

### 3.6 Inconsistent `null` vs `0` defaults (Low)

Some numeric fields default to `null` when absent, others to `0` (e.g., `underlyingPriceAtEntry: 0` in Fidelity import, but `underlyingPriceAtExit: null` for the same trade). The calculation logic checks `== null` in some places and `> 0` in others. This inconsistency will eventually cause bugs.

**Recommendation:** Standardize: `null` means "not provided", `0` means "explicitly zero." Document and enforce this convention.

---

## 4. Security & Privacy

### 4.1 No input sanitization on the notes field (Medium)

The `notes` field accepts arbitrary text and renders it directly. While React's JSX escapes strings by default (so XSS via innerHTML isn't an issue), notes are also included in JSON exports. If the export is consumed by another tool that doesn't escape HTML, this becomes a vector.

**Recommendation:** Sanitize or length-limit the notes field. Validate on input, not just display.

> **Partial mitigation:** The Zod `TradeSchema` now enforces a 5,000-character max on `notes` for all import paths.

### ~~4.2 JSON import is a trust-the-client situation (High)~~ — RESOLVED

See 1.2. JSON import now validates every record through `TradeSchema.safeParse()` with clear error messages pointing to the exact field and index that failed validation.

### 4.3 All data lives in unencrypted IndexedDB (Medium)

Financial trading data — positions, P&L, account sizes — sits in plaintext IndexedDB accessible to any JavaScript running on the same origin. If the app is ever deployed to a shared domain, or if a browser extension is malicious, this data is exposed.

**Recommendation:** For production, consider:
- Deploying to a dedicated subdomain
- Adding optional encryption-at-rest for IndexedDB (libraries like `idb-keyval` with encryption wrappers exist)
- At minimum, warn users that data is stored locally and unencrypted

### ~~4.4 No Content Security Policy (Medium)~~ — RESOLVED

A strict CSP is set via `<meta>` tag in `index.html`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; worker-src 'self'`. This restricts scripts to the app's own origin, allows Tailwind's inline styles, and permits the service worker.

### ~~4.5 No rate limiting or size limits on imports (Low)~~ — RESOLVED

Both the Fidelity CSV and JSON import paths now check `file.size` against a 10 MB limit before reading the file into memory. Files over the limit display a clear error message without attempting to parse.

---

## 5. Production Deployment Concerns

### ~~5.1 BrowserRouter requires server-side configuration (High)~~ — RESOLVED

Switched from `BrowserRouter` to `HashRouter`. Routes use `/#/trades`, `/#/settings` format, which works on any static host without server-side redirect configuration.

### ~~5.2 No PWA or offline support (Medium)~~ — RESOLVED

`vite-plugin-pwa` is configured with `autoUpdate` registration, a web app manifest (name, icons, theme color), and Workbox service worker that precaches all app assets. The app can be installed as a PWA and works fully offline since all data is in IndexedDB. Custom SVG icons are provided at 192x192 and 512x512.

### ~~5.3 No environment configuration (Low)~~ — RESOLVED

Vite's env variable system is set up with `.env.development` and `.env.production` files. `VITE_APP_ENV` distinguishes between environments. `.env.production` has placeholder slots for `VITE_SENTRY_DSN` and `VITE_ANALYTICS_ID` ready for when those services are configured. `.env*.local` files are gitignored for secrets.

### 5.4 No analytics or error monitoring (Medium)

When something breaks in production, you won't know. No Sentry, no PostHog, no basic error reporting.

**Recommendation:** Add a lightweight error boundary that reports to Sentry (or similar). Add basic analytics to understand usage patterns. Environment config is now in place to support this — just uncomment and set the DSN/ID in `.env.production`.

### 5.5 No data backup/sync story (High)

All data lives in a single browser's IndexedDB. If a user clears browser data, switches browsers, or their device dies, everything is gone. The JSON export is manual and most users won't remember to do it.

**Recommendation:** This is probably the most important product-level concern. Options include:
- Automatic periodic JSON exports to Downloads
- Cloud sync via a backend (Supabase, Firebase, or your own API)
- Browser extension for cross-browser sync
- At minimum, prominent "last exported" timestamp and periodic reminders

---

## Priority Roadmap

**Phase 1 — Foundation:** ALL COMPLETE
1. ~~Add Vitest + unit tests for calculations and Fidelity parser~~ — 48 tests passing
2. ~~Add Zod validation for all data ingestion (import, CSV parse, form submit)~~ — shared TradeSchema in `db/schema.ts`
3. ~~Fix account deletion cascade~~ — transactional nullification
4. ~~Replace `prompt()`/`confirm()` with proper UI components~~ — ConfirmDialog component
5. ~~Add React error boundaries~~ — ErrorBoundary wrapping app
6. ~~Fix BrowserRouter deployment issue~~ — switched to HashRouter

**Phase 2 — Trust & Polish:** ALL COMPLETE
7. ~~Address floating-point money math~~ — `cents()` rounding helper
8. ~~Add loading states and skeletons~~ — DashboardSkeleton, TradeTableSkeleton
9. ~~Implement proper light mode or remove the toggle~~ — toggle removed, dark mode locked
10. ~~Add CSP headers~~ — strict meta tag CSP
11. ~~Add file size limits on imports~~ — 10 MB cap on both paths
12. ~~Refactor `TradeForm` to use React Hook Form~~ — 22 useState → single useForm

**Phase 3 — Production Readiness:** 2 OF 6 COMPLETE
13. ~~Add PWA support~~ — vite-plugin-pwa with service worker + manifest
14. Add error monitoring (Sentry) — env config ready, needs service setup
15. Add basic analytics — env config ready, needs service setup
16. Implement data backup/sync strategy — product decision pending
17. ~~Add environment configuration~~ — `.env.development` / `.env.production`
18. Add trade detail routes — feature enhancement, low priority

---

## Remaining Open Items

| # | Item | Severity | Notes |
|---|---|---|---|
| 1.1 | Trade type discriminated unions | High | Refactor for type safety |
| 1.3 | Database migration strategy | Medium | Add `.upgrade()` callbacks |
| 1.5 | bulkPut silent overwrites | Medium | Add conflict resolution UX |
| 2.3 | Trade detail routes | Low | Deep-linkable `/trades/:id` |
| 3.4 | Row-level calculation memoization | Medium | Performance for large trade logs |
| 3.5 | Duplicated calculation logic | Medium | DRY up basis computation |
| 3.6 | Inconsistent null vs 0 defaults | Low | Standardize conventions |
| 4.1 | Notes field sanitization | Medium | Partially mitigated by Zod max length |
| 4.3 | Unencrypted IndexedDB | Medium | Consider encryption-at-rest |
| 5.4 | Error monitoring | Medium | Sentry — env slots ready |
| 5.5 | Data backup/sync | High | Biggest product-level gap |

---

## What's Already Good

- **Clean separation of concerns**: calculations, data access, components, and pages are well-organized
- **Smart use of Dexie's `useLiveQuery`**: reactive data without manual state management or cache invalidation
- **The Fidelity parser is thoughtful**: handling partial imports, assignment tracking, and symbol parsing is non-trivial and done well
- **TypeScript const assertions for enums**: the `as const` pattern for `STATUSES`, `STRATEGIES`, etc. is idiomatic and type-safe
- **Trade grouping/rolling is a differentiating feature**: most trade journals don't handle position rolls well
- **Tailwind custom theme**: clean color system, consistent visual language
- **The data model supports real options trading complexity**: assignments, cost basis tracking, shares P&L — this isn't a toy

You've built something with real product instincts. The above recommendations are about hardening it for the real world.
