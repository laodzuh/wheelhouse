# Wheelhouse Data Model

The data model defines the core entities, their fields, and how they relate to each other. Every entity here maps directly to something defined in the product spec and flow documents. This is the blueprint a developer uses to build the database schema and TypeScript types.

---

## Entity Relationship Overview

```
User
 ├── has one active Strategy (with version history)
 ├── has many Ticker Theses
 │    ├── has one Wheel (the ring)
 │    │    └── has many Dots (contracts)
 │    │         └── has many Trade Events
 │    └── has Thesis Data Fields + Prose
 └── has a Profile (onboarding data)
```

---

## Entities

### User Profile

Collected during onboarding. Powers progressive education level, smart nudge tone, and income goal tracking.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| name | string | What should we call you? |
| experienceLevel | enum | `beginner` · `intermediate` · `experienced` |
| motivations | string[] | Why they're here: income, education, discipline, tracking, conviction, accumulation |
| incomeGoal | object | `{ amount: number, period: 'monthly' \| 'annual' \| 'none', priority: 'income' \| 'growth' \| 'balanced' }` |
| brokerage | string | Where they trade (Fidelity, Schwab, etc.) |
| capitalRange | enum | `under_10k` · `10k_50k` · `50k_100k` · `over_100k` |
| createdAt | datetime | Account creation |

---

### Strategy

The user's constitution. One active strategy at a time (v1), with version history for every edit. Architecture supports multiple named strategies for future versions.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| userId | string | Owner |
| name | string | User-chosen name (e.g., "The Slow Grind") |
| version | number | Auto-incrementing version number |
| isActive | boolean | Is this the current active strategy? (v1: always one) |
| riskProfile | object | See Risk Profile below |
| timePreferences | object | See Time Preferences below |
| positionSizing | object | See Position Sizing below |
| stockSelectionCriteria | string | Prose — what draws the user to a stock |
| incomeGoal | object | Reference to or copy of the user's income goal |
| createdAt | datetime | When this version was created |
| previousVersionId | string \| null | Link to the version this was edited from |

#### Risk Profile (embedded object)
| Field | Type | Description |
|-------|------|-------------|
| drawdownTemperament | enum | `patient` · `thesis_driven` · `cut_losses` |
| focus | enum | `income` · `accumulation` · `balanced` |
| maxPositionPercent | number | Max % of capital in a single position |

#### Time Preferences (embedded object)
| Field | Type | Description |
|-------|------|-------------|
| activityLevel | enum | `weekly` · `biweekly` · `monthly` |
| patienceStyle | enum | `frequent_small_wins` · `patient_bigger_payoffs` · `flexible` |
| dteRange | object | `{ min: number, max: number }` — derived from the above two |

#### Position Sizing (embedded object)
| Field | Type | Description |
|-------|------|-------------|
| maxActiveWheels | number \| null | Max tickers to wheel at once (null = no limit) |
| maxContractsPerTicker | number \| null | Max dots per wheel (null = no limit) |

---

### Ticker Thesis

One per ticker being wheeled. Contains the three-layer thesis (data fields, prose, AI feedback) and owns the wheel and its dots.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| userId | string | Owner |
| strategyId | string | Which strategy this thesis was created under |
| ticker | string | Stock symbol (e.g., "AAPL") |
| name | string | User-chosen name, defaults to "[Ticker] Wheel" |
| status | enum | `active` · `archived` |
| createdAt | datetime | When the thesis was first created |
| updatedAt | datetime | Last edit |

#### Thesis Data Fields (embedded object)
| Field | Type | Description |
|-------|------|-------------|
| targetExitPrice | number | CC strike floor — the lowest you'd sell at ("sell high") |
| targetEntryPrice | number | CSP strike ceiling — the highest you'd buy at ("buy low") |
| maxAcceptableLoss | number | Dollar amount or percentage before walking away |
| deltaRange | object | `{ min: number, max: number }` — per-ticker override of strategy default |
| dtePreference | object | `{ min: number, max: number }` — per-ticker override of strategy default |
| assignmentComfort | enum | `high` · `moderate` · `low` |
| plannedContracts | number | How many contracts (dots) to allocate |

#### Thesis Prose (embedded object)
| Field | Type | Description |
|-------|------|-------------|
| conviction | string | Why do you believe in this stock? |
| invalidation | string | What would change your mind? |
| timeHorizon | string | How long are you willing to wheel this? |
| catalysts | string | Anything happening soon that could impact the stock? |

#### Strategy Alignment (embedded object)
Captured during thesis creation if misalignments were flagged.

| Field | Type | Description |
|-------|------|-------------|
| misalignments | object[] | `{ type: string, detail: string, userReason: string }` — what was flagged and why the user proceeded anyway |
| checkedAt | datetime | When the alignment check was performed |

---

### Wheel

One per ticker thesis. The visual ring. Owns its dots.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| thesisId | string | Which thesis this wheel belongs to |
| ticker | string | Stock symbol (denormalized for convenience) |

---

### Dot (Contract)

A single contract slot on a wheel. Always in exactly one of four states. This is the core of the state machine.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| wheelId | string | Which wheel this dot belongs to |
| state | enum | `idle_cash` · `idle_shares` · `csp_active` · `cc_active` · `removed` |
| isActive | boolean | True if the dot is part of the active wheel. False if removed. Removed dots are kept for historical record but hidden from the UI. |
| label | string | Auto-generated: strike + expiry (e.g., "AAPL $180 3/28"). Null when idle. |
| sharePurchasePrice | number \| null | Set when entering the wheel from CC side, or upon assignment. Used as starting cost basis. |
| currentStrike | number \| null | Active contract strike price. Null when idle. |
| currentExpiry | datetime \| null | Active contract expiration. Null when idle. |
| currentDelta | number \| null | Delta at time of current contract entry. Null when idle. |
| premiumCollected | number | Running total of all premium collected by this dot across its lifecycle |
| effectiveCostBasis | number \| null | Current effective cost basis for this contract's position. Null if never held shares. |
| createdAt | datetime | When the dot was created (thesis setup) |

---

### Trade Event

A single action taken on a dot. This is the evidence the evaluation engine uses. Trade events are editable if the user made an error.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| dotId | string | Which dot this event belongs to |
| wheelId | string | Which wheel (denormalized) |
| thesisId | string | Which thesis (denormalized) |
| eventType | enum | `new_csp` · `new_cc` · `assigned` · `called_away` · `expired` · `closed` · `rolled` |
| strike | number | Strike price of the trade |
| premium | number | Premium collected (positive) or paid (negative for closes/rolls) |
| expirationDate | datetime | Contract expiration date |
| dte | number | Days to expiration (auto-calculated from expirationDate) |
| deltaAtEntry | number | Delta at time the trade was placed |
| assignmentPrice | number \| null | For `assigned` events — price assigned at |
| callAwayPrice | number \| null | For `called_away` events — price called away at |
| closePrice | number \| null | For `closed` events — price paid to close |
| rollDetails | object \| null | For `rolled` events: `{ previousStrike: number, previousExpiry: datetime, previousPremium: number, netCreditDebit: number }` |
| previousState | enum | Dot state before this event |
| newState | enum | Dot state after this event |
| deviations | object[] | `{ field: string, strategyValue: string, thesisValue: string, actualValue: string, reason: string }` — any deviations logged with this trade |
| createdAt | datetime | When this trade was logged |

---

### AI Interaction

Captures AI feedback and conversations for context and retrospection. These aren't just logs — they're part of the product experience that can be referenced later.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| userId | string | Owner |
| context | enum | `thesis_review` · `trade_nudge` · `strategy_discussion` · `evaluation_insight` · `onboarding` |
| relatedEntityId | string \| null | ID of the strategy, thesis, or trade event this relates to |
| relatedEntityType | enum \| null | `strategy` · `thesis` · `trade_event` |
| prompt | string | What triggered the AI interaction (user question or system prompt) |
| response | string | What Claude said |
| createdAt | datetime | When this interaction occurred |

---

## Key Relationships

```
User (1) ──── (many) Strategy versions
User (1) ──── (many) Ticker Theses
Strategy (1) ──── (many) Ticker Theses (thesis created under a strategy)
Ticker Thesis (1) ──── (1) Wheel
Wheel (1) ──── (many) Dots
Dot (1) ──── (many) Trade Events
Trade Event (0..many) ──── (0..many) Deviations (embedded)
AI Interaction (many) ──── (0..1) Related Entity
```

---

## Computed Values (Not Stored, Derived on Read)

These are calculated from the raw data, not stored separately. They power the hero metrics and evaluation layer.

| Metric | Derivation |
|--------|-----------|
| **Premium collected (portfolio)** | Sum of all trade event premiums across all dots across all wheels |
| **Premium collected (per ticker)** | Sum of all trade event premiums across all dots on one wheel |
| **Premium collected (per dot)** | Sum of all trade event premiums for one dot (also stored on dot for quick access) |
| **Effective cost basis (per dot)** | Share purchase price (or assignment price) minus cumulative premium collected by that dot |
| **Effective cost basis (per ticker)** | Average effective cost basis across all dots on one wheel that have held shares |
| **Average basis reduction % (portfolio)** | Average of (original basis - current basis) / original basis across all positions |
| **Capital deployed (per dot)** | Peak capital committed by this dot. For CSP phases: strike × 100. For CC phases: effective cost basis × 100. If the dot has been through both phases, use the higher value. |
| **Annualized return on capital (per dot)** | (Premium collected / capital deployed) × (365 / days active) |
| **Annualized return on capital (portfolio)** | Weighted average across all active dots by capital deployed |
| **Strategy adherence** | Compare trade event fields (delta, DTE, strike) against strategy parameters. Count within-range vs. out-of-range. |
| **Thesis adherence (per ticker)** | Compare trade event fields against thesis data fields. Same as above but scoped to one ticker. |
| **Deviation frequency** | Count of trade events with non-empty deviations array, grouped by deviation field |
| **Capital utilization** | (Capital deployed in active dots / total stated capital) — shows how much cash is working |
| **Income goal pace** | (Premium collected in current period / income goal for period) — are you on track? |

---

## State Transitions (Reference)

Maps directly to the state machine diagram. Included here so the data model and state machine are in one place.

| Current State | Event | New State |
|---------------|-------|-----------|
| *(none)* | dot_created_cash | idle_cash |
| *(none)* | dot_created_shares | idle_shares |
| idle_cash | removed | removed |
| idle_shares | removed | removed |
| idle_cash | new_csp | csp_active |
| idle_shares | new_cc | cc_active |
| csp_active | assigned | idle_shares |
| csp_active | expired | idle_cash |
| csp_active | closed | idle_cash |
| csp_active | rolled | csp_active (updated) |
| cc_active | called_away | idle_cash |
| cc_active | expired | idle_shares |
| cc_active | closed | idle_shares |
| cc_active | rolled | cc_active (updated) |

---

## Design Notes

1. **Trade events are editable.** If you entered something wrong, just fix it. No correction events, no audit trails, no unnecessary complexity. The user is the only one looking at this data — ease of use wins over data purity.

2. **Dots carry running totals.** `premiumCollected` and `effectiveCostBasis` on the dot are denormalized for quick dashboard rendering. They can always be recalculated from trade events.

3. **Strategy versioning uses a linked list.** Each strategy version points to its predecessor via `previousVersionId`. This makes version history traversal simple and supports future side-by-side comparison.

4. **Thesis stores strategy alignment context.** The misalignments and user reasons captured during thesis creation are stored on the thesis, not as separate records. They're part of the thesis story.

5. **Deviations are embedded in trade events.** Each deviation logged during trade entry is stored directly on the trade event. This makes it easy to query "show me all trades with deviations" and "what were the reasons."

6. **AI interactions are first-class entities.** They're not just logs — they're retrievable context that the AI can reference in future conversations. "Last time we discussed your AAPL thesis, you said..."

7. **The Wheel entity is thin.** It's essentially a grouping container for dots under a thesis. Most of the interesting data lives on the dots and trade events. The wheel exists primarily to provide a clear 1:1 relationship between a thesis and its visual ring.

8. **Dots can be added and removed after thesis creation.** The initial `plannedContracts` count from thesis setup is a starting point, not a commitment. Users can add new idle dots (scaling up) or remove idle dots (scaling down) anytime from the Ticker Thesis View. Only idle dots can be removed — active dots must complete their current contract first. Removed dots are soft-deleted (`state: removed`, `isActive: false`) rather than hard-deleted, preserving their trade history for retrospection and metrics.
