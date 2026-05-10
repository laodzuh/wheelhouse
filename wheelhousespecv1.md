# Wheelhouse v1 Spec

*The build-from document. Captures the final state of all five design passes.*

---

## Purpose

This is the single reference for building Wheelhouse v1. It's organized as five passes, mirroring how it was designed:

1. **Capability Surface** — what Wheelhouse does
2. **Repo Schema** — what user data looks like on disk
3. **Tool Surface** — what the LLM can call
4. **Runtime Architecture** — what runs where
5. **Build Sequence** — how to build it, in what order

Each pass is self-contained. Read top-to-bottom on first pass; reference individual sections during build.

The v1 goal: **Brent uses Wheelhouse, daily, for the RULE123 Fund, for at least one full month, and trusts it.** Not a product. A daily driver. Multi-user concerns are deferred.

---

## Pass 1 — Capability Surface

What Wheelhouse can do in v1, from the user's perspective.

### Mode A: User initiates (full v1 scope)

Send Wheelhouse a Signal message. It can:

- **Talk about a ticker.** Read your thesis, fetch live data if needed, have a real conversation about the position, propose updates with confirmation.
- **Talk about your portfolio.** Read `positions.md`, fetch live prices, answer state questions ("what's expiring this month?", "what's my sector exposure?").
- **Talk about strategy.** Read strategy files, surface your written rules, edit them with confirmation.
- **Evaluate a potential trade.** Fetch live chain data, validate against your written rules, propose a structure that fits.
- **Log a trade after fill.** Wait for actual fill confirmation, then write to `DECISIONS.md`, update `positions.md`, append to thesis activity log — all as one confirmed multi-file commit.
- **Log a non-fill or declined trade.** Same structured logging, with rationale preserved.
- **Manage the watchlist.** Add tickers with reasons and trigger conditions; remove tickers that graduate or are abandoned.
- **Recall history.** Walk the decision log to answer questions about past decisions, win rate, sector behavior.

### Mode B: Wheelhouse initiates — *deferred to v2*

Proactive briefings, setup alerts, and position-management nudges are out of scope for v1. v1 only speaks when spoken to. This eliminates the entire scheduler/cron/watchlist-monitor subsystem.

### Mode C: Background work (only what responds to messages)

- **Trade logging is automatic on confirmation.** When you confirm a fill, the bot writes the multi-file commit. No separate "log this" step.
- **Reconciliation runs when you upload a CSV.** Bot diffs the export against tracked positions and surfaces drift in `portfolio/reconciliation.log`.

Auto-regenerated `PERFORMANCE.md` and README snapshot sections are deferred.

### Confirmation flow

Trade-related flow specifically:

1. Discuss a setup with the bot, possibly multiple turns.
2. You say "I'm going to place this." Bot acknowledges, *does not log*.
3. You place the order in Fidelity.
4. **On fill:** "filled at 1.42" → bot logs the trade.
5. **On non-fill:** "didn't fill, cancelled" → bot logs decision-not-taken with the original thesis preserved.

### Screenshot ingestion

Day-one v1 is text-only. Screenshot ingestion is a planned fast-follower; the architecture should have a clean seam for adding it (a new tool that produces the same structured trade record as text logging).

### Explicit non-goals for v1

- No multi-user support
- No web dashboard (GitHub renders the markdown)
- No automated trade execution — ever
- No mobile app, browser extension, or CLI
- No support for non-wheel strategies (CSPs, CCs, rolls only)
- No social features
- No charts in Signal messages
- No voice messages or non-screenshot images

---

## Pass 2 — Repo Schema

The user's *data* repo. (The *software* repo schema lives in Pass 4.)

### Directory layout

```
wheelhouse-rule123/
├── README.md
├── DECISIONS.md
├── strategy/
│   ├── wheel-rules.md
│   ├── sector-allocation.md
│   └── earnings-policy.md
├── theses/
│   ├── WMT.md
│   ├── NKE.md
│   ├── WFC.md
│   ├── XOM.md
│   ├── NOK.md
│   └── _archive/
├── portfolio/
│   ├── positions.md
│   └── history/
│       └── 2026-05-07.csv
├── watchlist.md
└── .wheelhouse/
    └── config.yaml
```

### File-by-file specifications

#### `README.md`

**Purpose:** Landing page for repo. Human-shaped, prose, no machine-parsing required.

**Who writes:** User by hand initially. Bot can edit with confirmation.

**Sections:**
1. **Identity** — what this repo is (1–2 sentences).
2. **Philosophy** — why you trade this way (3–5 paragraphs).
3. **Current strategy summary** — bullet summary linking to `strategy/`.
4. **Goals** — time horizon, target return, what the money is *for*.

#### `DECISIONS.md`

**Purpose:** Append-only chronicle of every trade decision. Source of truth for behavior.

**Who writes:** Bot, on user confirmation. Reverse chronological (newest at top).

**Entry shape:**

```markdown
## 2026-05-07 — XOM CSP opened

**Action:** Sold-to-open
**Symbol:** XOM 2026-06-13 P $108
**Quantity:** 1
**Credit:** $1.85
**DTE at entry:** 37
**Delta at entry:** 0.24
**IV rank at entry:** 38
**Sector:** Energy
**Thesis ref:** [theses/XOM.md](theses/XOM.md)
**Rationale:** Post-earnings IV expansion. Energy diversifier (no prior energy
exposure). Strike below recent support around $109. Basis target $106.15.

---
```

**Required fields by entry type:**

- **Opened:** Action, Symbol, Quantity, Credit, DTE at entry, Delta at entry, IV rank at entry, Sector, Thesis ref, Rationale
- **Closed:** Action, Symbol, Quantity, Debit (or "expired worthless"), DTE at close, Profit %, Thesis ref, Rationale
- **Rolled:** Action, Original symbol, New symbol, Net credit/debit, DTE change, Delta change, Thesis ref, Rationale
- **Assigned:** Action, Symbol, Quantity, Strike, Resulting position, Thesis ref, Rationale
- **Declined:** Action ("Declined"), Considered symbol, Setup proposed, Reason for decline, Thesis ref (or "no thesis — declined before creation")

Convention: append-only. Corrections are new entries that reference the old one, not edits. Git allows rewriting; the *practice* doesn't.

#### `strategy/wheel-rules.md`

**Purpose:** Core wheel discipline. Most-read file by the bot.

**Shape:** Declarative, bulleted, machine-readable. Sections:

- Cash-secured puts (DTE band, delta band, strike selection, underlying quality, order type)
- Covered calls (DTE band, delta band, strike selection)
- Position management (profit close, time close, roll triggers)
- Sizing (max position size, max portfolio CSP exposure)
- Excluded names (categories, with rationale)
- Reference: link to earnings-policy.md

Keep under ~80 lines.

#### `strategy/sector-allocation.md`

**Purpose:** Diversification discipline. Target sectors, current targets, rebalancing rules.

#### `strategy/earnings-policy.md`

**Purpose:** Rules for trading around earnings. Buffer windows, exception handling.

#### `theses/{TICKER}.md`

**Purpose:** One file per ticker. The atomic narrative artifact.

**Schema:**

```markdown
# WMT — Walmart Inc.

**Sector:** Consumer Staples
**Status:** Active wheel position
**Cost basis:** $109.06 (assigned 2024-XX-XX from $109 CSP)
**Last updated:** 2026-05-07

## Thesis

[Prose: 2–5 paragraphs. Why you wheel this name. What conviction means here.
What would change your mind.]

## Quantitative parameters

- **Acceptable strike range for new CSPs:** $105–$110
- **Acceptable strike range for CCs above basis:** $112+
- **Minimum acceptable IV rank for new layers:** 25
- **Position sizing:** Max 2 contracts at any time
- **Notes:** [Ticker-specific — earnings rhythm, dividend dates, technical levels]

## Activity

- 2026-05-07: Opened $108 CSP, see [DECISIONS.md].
- 2026-04-15: Rolled $109 CC out one week, see [DECISIONS.md].
- [Reverse chronological back-references, bot-maintained]

## Watch conditions

- [Pre-committed exit criteria. "If WMT cuts dividend, exit." 
  "If P/E expands above 30x, reduce." ]
```

The structure is the bot's interview script: when creating a new thesis, the bot walks each section and asks the user to fill it in.

`_archive/` holds closed positions and declined-tickers (move-don't-delete).

#### `portfolio/positions.md`

**Purpose:** Current state of the book. Bot-maintained, CSV-reconciled.

**Shape:**

```markdown
# Current Positions

**Last updated:** 2026-05-07 14:23 CST
**Last reconciled with Fidelity export:** 2026-05-05

## Equity holdings

| Ticker | Shares | Cost basis | Notes               |
|--------|--------|------------|---------------------|
| WMT    | 100    | $109.06    | Assigned, wheeling  |
| FZROX  | 423    | (index)    | Core position       |

## Open options

| Symbol           | Type | Strike | Exp        | DTE | Qty | Credit | Status |
|------------------|------|--------|------------|-----|-----|--------|--------|
| WMT 2026-05-30 C | CC   | 112    | 2026-05-30 | 23  | 1   | $1.85  | Open   |
| NOK 2026-06-13 P | CSP  | 4.50   | 2026-06-13 | 37  | 2   | $0.18  | Open   |

## Cash

**Available cash:** [private]
**Cash secured for open CSPs:** [calculated]
```

#### `portfolio/history/`

Raw Fidelity CSV exports, dated `YYYY-MM-DD.csv`. Audit trail; recovery point if `positions.md` ever drifts.

A `reconciliation.log` file in `portfolio/` captures drift events surfaced during imports.

#### `watchlist.md`

**Purpose:** Tickers monitored but not held. Lightweight relative to theses.

**Per-ticker shape:**

```markdown
## MSFT
**Added:** 2026-04-22
**Reason:** Mega-cap tech without NVDA's multiple. Watching for IV expansion 
post-earnings (next: ~late July).
**Trigger conditions:** IV rank > 35 AND > 21 days from earnings.
**Acceptable strikes:** $400 and below.
```

When a watchlist entry graduates to a position, a thesis is created and the entry is removed (or moved to a "Graduated" section).

#### `.wheelhouse/config.yaml`

**Purpose:** System config (not trading rules — those live in `strategy/`).

**Shape:**

```yaml
user:
  name: Brent
  signal_number: "+1XXXXXXXXXX"

fund:
  name: "RULE123 Fund"
  broker: "Fidelity"

defaults:
  csp_dte_min: 30
  csp_dte_max: 45
  csp_delta_min: 0.20
  csp_delta_max: 0.30
  profit_close_pct: 0.50
  earnings_buffer_days: 14

ai:
  provider: "anthropic"
  model: "claude-sonnet-4-20250514"

market_data:
  provider: "eulerpool"

github:
  data_repo: "laodzuh/wheelhouse-rule123"
```

### Files explicitly *not* in v1

- `PERFORMANCE.md` — computed on demand from `DECISIONS.md`
- `reviews/` — quarterly retrospectives are v2
- `journal/` — defer until absence is felt
- `strategy/sizing.md` — folded into `wheel-rules.md`

### Mental model: three categories of files

- **Living documents** (README, theses, strategy/*, watchlist) — collaborative, either party can edit.
- **Append-only logs** (DECISIONS.md, history/*) — only grow.
- **Maintained state** (positions.md) — bot-kept, reconciled against ground truth.

The bot's job is to keep these consistent with each other and with reality.

---

## Pass 3 — Tool Surface

The verbs the LLM can call. Small, composable, structured.

### Principles

- Reads are free; writes require user confirmation.
- Tools fail loudly with informative messages.
- Tools return structured data; the LLM does the formatting.

### Repo reads

#### `read_strategy()`

```
Input:   none
Returns: {
  wheel_rules: <string, markdown>,
  sector_allocation: <string, markdown>,
  earnings_policy: <string, markdown>
}
```

Called near the start of any meaningful conversation.

#### `read_thesis(ticker)`

```
Input:   { ticker: string }
Returns: {
  exists: bool,
  is_archived: bool,
  in_watchlist: bool,
  content: string | null
}
```

#### `list_theses()`

```
Input:   none
Returns: {
  active: string[],   // tickers
  archived: string[]
}
```

#### `read_positions()`

```
Input:   none
Returns: {
  content: string,         // markdown
  last_updated: timestamp,
  last_reconciled: timestamp,
  staleness_warning: string | null
}
```

#### `read_watchlist()`

```
Input:   none
Returns: {
  content: string,
  last_updated: timestamp
}
```

#### `read_decisions(filters)`

```
Input: {
  ticker: string | null,
  date_from: date | null,
  date_to: date | null,
  type: "opened" | "closed" | "rolled" | "assigned" | "declined" | null,
  limit: int (default 50)
}
Returns: structured array of decision entries
```

Filter set will grow as conversations reveal needs.

#### `read_file(path)`

Generic escape hatch. Restricted to the data repo.

### Market data reads

#### `fetch_quote(ticker)`

```
Input:   { ticker: string }
Returns: {
  ticker: string,
  price: float,
  change: float,
  change_pct: float,
  volume: int,
  iv: float,
  iv_rank: float,
  earnings_date: date | null,
  timestamp: timestamp
}
```

5-minute cache.

#### `fetch_options_chain(ticker, expiration, type)`

```
Input: {
  ticker: string,
  expiration: date,
  type: "put" | "call" | "both"
}
Returns: array of { strike, bid, ask, mid, delta, iv, oi, volume }
```

No cache (chains move fast).

#### `fetch_expirations(ticker)`

```
Input:   { ticker: string }
Returns: array of { expiration: date, dte: int }
```

### Calculations

Domain-specific to avoid LLM arithmetic errors.

#### `calc_csp_return(strike, credit, dte)`

```
Returns: {
  capital_required: float,
  return_pct: float,
  annualized_return_pct: float,
  breakeven: float
}
```

#### `calc_position_summary(positions)`

```
Returns: {
  total_capital_at_risk: float,
  total_credit: float,
  weighted_avg_delta: float,
  sector_breakdown: { sector: pct },
  dte_distribution: { bucket: count }
}
```

#### `calc_roll_economics(current, proposed)`

```
Returns: {
  net_credit_or_debit: float,
  dte_extended: int,
  delta_change: float,
  new_breakeven: float,
  capital_change: float,
  warning: string | null   // e.g., "rolling for debit"
}
```

### Repo writes (require confirmation)

#### `propose_changes(changes, summary, commit_message)`

```
Input: {
  changes: [
    {
      path: string,
      operation: "create" | "prepend" | "append" | "replace" | "edit",
      content: string  // full content or diff depending on operation
    }
  ],
  summary: string,         // human-readable description for confirmation
  commit_message: string   // structured commit message
}

Behavior:
  1. Validate all changes apply cleanly
  2. Send confirmation prompt to Signal:
       Proposed changes:
         + path/to/file.md (operation)
         ~ path/to/other.md (operation)
       Summary: <summary>
       Confirm? [yes / no / show diff]
  3. Store pending write in SQLite with timeout
  4. On user "yes": apply, commit with structured message, push
  5. On user "no": discard
  6. On user "show diff": send actual diff text
  7. On free-form reply: route back to LLM as conversation turn
```

If diffs malform frequently in real use, fall back to per-file content replacement instead of unified diffs.

#### `propose_csv_import(csv_path)`

```
Input:   { csv_path: string }   // relative to portfolio/history/
Behavior:
  1. Parse Fidelity CSV
  2. Diff against current positions.md
  3. Send Signal message describing differences
  4. On confirmation: rewrite positions.md, append to reconciliation.log, commit
```

### Other

#### `web_search(query)`

```
Input:   { query: string }
Returns: array of { title, snippet, url }
```

Discretionary use per system prompt — purposeful, not routine.

### Discipline-enforcement convention

**Missing-thesis nudge.** When a trade is being logged for a ticker without an active thesis, the bot logs the trade *and* in the same exchange offers to walk through thesis creation or draft a stub. Never blocks; always surfaces.

**Missing rationale nudge.** Same pattern for declined trades, abandoned watchlist entries, etc.

### System prompt's role

Tools alone don't make a product. The system prompt establishes:

- Who the user is
- What Wheelhouse is (correspondent, not advisor)
- The interaction model (read strategy first, confirm before writing, Signal-appropriate length)
- The values (never recommend, only surface; never execute; preserve user agency)

System prompt lives in the *software* repo, not the data repo.

---

## Pass 4 — Runtime Architecture

What runs where, how the pieces talk.

### Topology

```
You (Signal on Pixel)
    │  E2E encrypted Signal protocol
    ▼
Mac mini (always on, on Tailscale)
  ├─ signal-cli daemon         (Signal protocol client, JSON-RPC)
  ├─ Orchestrator (Python)     (the brain)
  ├─ Local data repo (git)     (synced to GitHub)
  └─ SQLite                    (working memory, pending writes)
      │
      ├──► GitHub             (canonical record)
      ├──► Anthropic API      (Claude Sonnet)
      ├──► Eulerpool API      (market data)
      └──► Web search         (current info)
```

### Components

**Mac mini host.** Stable, always-on, on home network and Tailscale. Omarchy stays as the development environment; code is pushed via git, pulled on the Mac mini, services restarted. No staging, no CI, no infra-as-code.

**signal-cli.** The only Signal-protocol-aware component. Runs as `launchd` service, JSON-RPC mode over Unix socket. Session state on disk (encryption keys, sync state) — back up.

**Orchestrator (Python).** Long-running process. Per incoming message:

1. Receive from signal-cli.
2. Load conversation history from SQLite.
3. Construct LLM call: system prompt + history + tools.
4. Loop on tool calls: dispatch → result → back to LLM.
5. Handle `propose_changes` specially: pause conversation, send confirmation prompt, await reply.
6. Send final response via signal-cli.

Single-threaded, message-by-message. No concurrency; only one user.

**Tool runner.** Dispatches tool calls to Python functions. Most are trivial. The interesting ones:
- `propose_changes` writes to a "pending writes" table; doesn't apply until confirmation.
- `fetch_*` wraps Eulerpool with caching.
- CSV parsing for reconciliation lives inside `propose_csv_import`.

**Git operations.** Local clone is source of truth from the orchestrator's view. Writes:
1. Apply to working tree
2. `git add` + `git commit` with structured message
3. `git push`

Failed pushes go on a retry queue; data isn't lost.

Commit message format:

```
[wheelhouse] Open XOM CSP $108 6/13 fill

via signal at 2026-05-07 14:23 CST
files: DECISIONS.md, portfolio/positions.md, theses/XOM.md
```

### Memory model

Two layers, separate:

**Working memory** (session-scoped). Last 20–40 turns in SQLite, keyed by conversation thread. 12-hour idle timeout. Passed to the LLM as `history` on each turn.

**Long-term memory** (repo-scoped). Strategy, theses, decisions, positions. *Not in conversation history.* Accessed on demand via `read_*` tools. The repo is the source of truth for *who Brent is as a trader*; the session is just *what we're talking about now*.

A fresh Wheelhouse install with access to the same repo would behave identically. Continuity lives in the data, not the runtime.

### "Wheeling..." indicator

Sent after a 3-second threshold elapses without a final response (not preemptively). Fires on slow tool chains (chain fetches, web search, multi-step reasoning); skipped on fast turns (file reads).

### LLM choice

Claude Sonnet for daily driver. Cost/speed tradeoff favors Sonnet; Wheelhouse's reasoning loads aren't punishing enough to need Opus.

### Failure modes

- **Anthropic down:** orchestrator surfaces "API timing out, will retry" to Signal.
- **Eulerpool down:** specific tool failures surface as user-facing messages.
- **signal-cli connection lost:** logged, restarted by `launchd`.
- **Orchestrator restart:** in-flight conversations gone, but pending writes preserved in SQLite. Surface on next turn.
- **Network blip during push:** local commit succeeds; retry queue picks it up.

### Authentication

- **GitHub:** fine-grained PAT scoped to one repo, in `config.yaml` with restricted file perms.
- **Anthropic:** API key in config.
- **Eulerpool:** API key in config.

All three migrate to per-user OAuth in v2.

### Software repo schema (sketch)

```
wheelhouse/
├── README.md
├── orchestrator/
│   ├── main.py
│   ├── signal_client.py
│   ├── llm.py
│   └── memory.py
├── tools/
│   ├── repo_reads.py
│   ├── market.py
│   ├── calc.py
│   └── propose.py
├── prompts/
│   ├── system.md
│   └── thesis_creation.md
├── config.example.yaml
└── scripts/
    ├── setup-signal.sh
    └── status.sh
```

---

## Pass 5 — Build Sequence

Five milestones, each a demonstrable end-to-end slice.

### Pre-weekend prep (do these *before* sitting down to build)

- **Acquire bot phone number.** Prepaid SIM (Mint/US Mobile) is most reliable for Signal registration. Twilio and Google Voice are sometimes flagged.
- **Acquire API keys:** Anthropic, Eulerpool, GitHub PAT (fine-grained, repo-scoped).
- **Verify Eulerpool.** Confirm options chain endpoint returns deltas; confirm rate limits are workable. Tradier/Polygon are alternatives if Eulerpool falls short.
- **Initialize both repos on GitHub:** `wheelhouse` (software) and `wheelhouse-rule123` (data).
- **Pre-write strategy files.** `wheel-rules.md`, `sector-allocation.md`, `earnings-policy.md` — your discipline articulated. The bot has something to read on day one.
- **Pre-write theses for current positions.** WMT, NOK, anything else open. Real, not polished.
- **Pre-write `positions.md`.** Current state by hand.

### Milestone 1: Echo bot

Send a Signal message to the bot, get the same message back.

- Install `signal-cli` on Mac mini, register bot's number, verify by SMS
- Add bot's number to your Pixel as a contact, send a test
- Python script reads from signal-cli (JSON-RPC), echoes back
- `launchd` service for persistence

Proves: phone number works, signal-cli runs, message round-trip works.

### Milestone 2: Talking bot, no memory

Get a real LLM-generated reply.

- Add Anthropic SDK
- Orchestrator: receive → API call (system prompt + user message) → reply
- v0 system prompt (short, generic)
- "Wheeling..." indicator after 3-second threshold
- Basic logging

Proves: LLM integration works, latency tolerable.

### Milestone 3: Bot reads your repo

First *useful* Wheelhouse.

- Clone data repo to Mac mini
- Implement read tools: `read_strategy`, `read_thesis`, `read_positions`, `read_watchlist`, `read_decisions`, `list_theses`, `read_file`
- Add Anthropic tool use
- Working memory in SQLite (or just in-process for first cut)
- Update system prompt: Wheelhouse-specific identity, values, interaction model

Proves: tool use works, LLM grounds itself in your strategy correctly. Stoppable here — already useful.

### Milestone 4: Bot writes to your repo

The full reactive loop.

- Implement `propose_changes` end-to-end: validate → confirmation prompt → pending write → apply on yes
- Add missing-thesis nudge to system prompt
- Add `calc_*` tools

Proves: writes are safe, confirmation feels right, journal-of-record works.

### Milestone 5: Market data + reconciliation

Full v1.

- Eulerpool integration: `fetch_quote`, `fetch_options_chain`, `fetch_expirations` with caching
- `propose_csv_import` for reconciliation
- Web search tool

### Marathon-weekend version (compressed)

```
Saturday AM:    M1 + M2  (echo → LLM)
Saturday PM:    M3       (read tools + system prompt + memory)
Saturday eve:   Use M3 for an hour. Note what's broken.
Sunday AM:      M4       (write tools + propose_changes + calc)
Sunday PM:      M5       (Eulerpool + CSV import)
Sunday eve:     Polish, commit everything
```

### Acceptable v1-minus deferrals if time runs short

- CSV reconciliation → next weekend
- Calc tools → defer until first real arithmetic error
- Web search → defer
- `launchd` service → run manually for the first week
- Real logging → `print()` for first 48 hours

Reduces v1 to "v1 minus reconciliation, calc, web search," reachable in a weekend.

### Heuristic

If stuck on the same problem for 45 minutes, ask for help. A 5-minute conversation can redirect three hours of grinding.

---

## Open seams (intentionally left for v2+)

- **Proactive mode** — scheduler, briefings, alerts, watchlist monitoring
- **Screenshot ingestion** — vision parsing of Fidelity screenshots
- **Auto-generated performance** — `PERFORMANCE.md`, README snapshot blocks
- **Reviews** — quarterly retrospectives template + flow
- **Multi-user installation** — onboarding script, config templating, doc completeness
- **Hosted version** — for non-technical users
- **Voice input** — likely useful given mobile typing pain in trading conversations
- **Performance/observability** — beyond logs, when warranted

These are not roadmap commitments. They're seams that v1 doesn't close, in case future-you wants to extend in those directions.

---

*Brent (laodzuh) — Wheelhouse v1 spec, May 2026*
