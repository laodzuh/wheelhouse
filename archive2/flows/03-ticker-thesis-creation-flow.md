# Wheelhouse Ticker Thesis Creation Flow

The guided flow for adding a new ticker to wheel. This is the first thing a user does after onboarding, and it's repeated every time they decide to wheel a new stock. The flow builds the three-layer thesis (data fields, prose, AI feedback) while embedding the per-ticker risk and comfort questions that were intentionally left out of onboarding.

---

## Flow Steps

### 1. Enter Ticker Symbol
- User taps "Add New Ticker" from the dashboard or anywhere in the app.
- Simple input: type a ticker symbol.
- **Smart nudge opportunity:** As the user types, ticker search results can show subtle visual cues indicating strategy alignment. Tickers that fit the user's capital range, DTE preference, and liquidity needs get a green indicator. Tickers with potential misalignments get a subtle orange signal. This is not a recommendation — just a quiet heads-up before they even select. In v1 this is visual cues on search results; in v2 this becomes the foundation for strategy-aligned discovery.
- On selection, Wheelhouse fetches basic info about the stock (current price, option chain availability, expiration frequency) to power the next step.

### 2. Strategy Alignment Check
- Before the user writes a single word of thesis, Wheelhouse checks whether this ticker structurally fits their strategy.
- Checks might include:
  - **Expiration frequency:** Does this stock offer the expiry cadence that matches the user's DTE preference? ("Your strategy says you prefer weekly expirations — this stock only has monthlies.")
  - **Price vs capital:** Can the user realistically sell a CSP on this stock given their capital range? ("This stock is $480/share — a cash-secured put would tie up $48,000, which is most of your stated capital range.")
  - **Option liquidity:** Are the options liquid enough to trade efficiently?
- **If aligned:** Proceed to conviction. Maybe a small green confirmation: "This ticker fits your strategy profile."
- **If misaligned:** Surface the specific misalignment as a smart nudge. Not a blocker — the user can absolutely proceed — but they should know what they're getting into before investing time in a thesis.

### 3. Misalignment Acknowledgment (only if flagged)
- If misalignments were found, the user sees them clearly and makes a conscious choice:
  - **"Proceed anyway"** — The user enters a brief reason for the deviation. Why are they comfortable with this misalignment? This reason is stored on the thesis and becomes available for future retrospection — the evaluation layer and AI check-ins can reference it later. ("You chose AAPL despite monthly-only expirations because you said the premium was worth the longer cycle. Three months in — is that still true?") If the user can't articulate a reason, that's a signal in itself.
  - **"Pick a different ticker"** — Back to the dashboard. No friction, no judgment.
- This is the strategy-aligned flagging feature in action. It doesn't gatekeep — it informs. And when the user deviates, it captures the *why* so it can hold them accountable to their own reasoning over time.

### 4. Conviction (Prose Layer)
- The heart of the thesis. This is where the user writes (or answers prompts to generate) their conviction narrative.
- Guided by questions, not a blank text box. Progressive education users get more guidance; experienced users can write freely.
- Core questions:
  - **"Why do you believe in this stock?"** — The fundamental thesis. Industry understanding, growth potential, dividend yield, whatever drives their conviction.
  - **"What would change your mind?"** — The invalidation signal. This is critical because it pre-commits the user to a condition for exiting. Without this, it's easy to hold a losing position out of stubbornness rather than conviction.
  - **"How long are you willing to wheel this stock?"** — Time horizon. Are they thinking 3 months or 3 years? This shapes expectations and evaluation.
  - **"Is there anything happening soon that could impact this stock?"** — Earnings, FDA approvals, mergers, etc. Encourages awareness of catalysts and risks.
- The prose is saved as free-form text. It's the human judgment layer — the part that can't be reduced to a number. Wheelhouse will reference it later during AI-powered check-ins.

### 5. Per-Ticker Risk & Comfort
- This is where the per-ticker questions that were removed from onboarding live. Now they have context — the user is thinking about a specific stock, not risk in the abstract.
- Questions:
  - **"How would you feel about owning 100 shares of this stock at current prices?"**
    - "That's the goal — I want to own it" → High assignment comfort, can be more aggressive on delta for this ticker
    - "I'm okay with it but would prefer not to" → Moderate assignment comfort
    - "I'd rather collect premium without getting assigned" → Low assignment comfort, conservative delta for this ticker
  - **"What's the most you're willing to lose on this position before you'd walk away?"**
    - Dollar amount or percentage. Sets the max loss threshold for this specific ticker.
  - **"How much of your capital do you want to commit to this wheel?"**
    - Number of contracts (which maps to capital commitment). This is where the multi-dot system begins — if they say 3 contracts, the wheel will have 3 dots when they start trading.
- **Behind the scenes:** These answers set per-ticker overrides on top of the strategy-level defaults. The strategy says "generally target 0.20 delta" but this ticker might warrant 0.25 because the user has high assignment comfort here. These overrides are visible on the thesis and flagged if they deviate significantly from the strategy.

### 6. Data Fields (Guardrails)
- The strict, measurable rules. These are the parameters Wheelhouse evaluates against programmatically.
- Fields:
  - **Target exit price (CC strike floor)** — What price would you sell this stock at if called away? This becomes the CC strike floor reference.
  - **Target entry price (CSP strike ceiling)** — The highest price you'd be willing to buy at. Above this and you're not getting enough of a discount — you're not buying low enough. This enforces the "get paid to buy low" half of the wheel philosophy.
  - **Delta range** — Pre-populated from the strategy default, but adjustable per-ticker based on the risk/comfort answers above. Tooltips explain the scale and tradeoffs.
  - **DTE preference** — Pre-populated from strategy, adjustable here. If the alignment check flagged an expiry mismatch, this is where the user consciously adapts.
- Smart nudges are active on every field. Tooltips show the strategy default, the tradeoff implications, and any misalignment with what the user just said in the prose or risk sections.
- **Progressive education shines here.** A newer user sees tips "Delta measures the probability of assignment — 0.20 means roughly a 20% chance. Your strategy default is 0.20. Here's what happens if you go higher or lower..." An experienced user just sees the field and adjusts.

### 7. AI Review
- Before saving, Claude reviews the complete thesis — prose, risk answers, and data fields together.
- The AI might:
  - **Flag internal contradictions:** "You said you'd walk away at a 15% loss, but your strike floor is 25% below current price — those don't quite line up."
  - **Ask missing questions:** "You mentioned you believe in this stock long-term, but didn't mention what would change your mind. What would make you stop wheeling it?"
  - **Note strategy tensions:** "Your per-ticker delta range (0.30) is more aggressive than your strategy default (0.20). That's fine if intentional — just flagging it."
  - **Affirm good thinking:** "Strong thesis — clear conviction, defined invalidation signal, and realistic position sizing."
- This is NOT a gate. The user can acknowledge, adjust, or skip. Claude is an accountability partner, not a gatekeeper.
- The AI review is also the first moment the AI feedback loop has real content to work with. From this point forward, Wheelhouse can reference this thesis in smart nudges, trade entry check-ins, and periodic reviews.

### 8. Name & Save
- Name the thesis. Like the strategy, giving it a name makes it feel real. Could be as simple as "AAPL Income Wheel" or as personal as "The Apple Orchard." We will pre-populate a default name of [Ticker + "Wheel"].
- Save creates:
  - The thesis document (prose + data fields + risk parameters)
  - The wheel visualization for this ticker (ring appears on the dashboard)
  - The contract slots based on the number of contracts chosen in step 5 (dots won't appear until actual trades are entered). The dots can sit to the side of the circle until trades are entered.
- User lands on the Ticker Thesis View for this stock — their new wheel, empty but ready.
- **The contract count is not permanent.** The number of dots chosen here is a starting point. From the Ticker Thesis View, the user can add new dots or remove idle dots at any time as their conviction or capital allocation changes. Active dots (on the ring) must complete their current contract before they can be removed.

---

## Design Principles for This Flow

1. **Strategy alignment is a check, not a gate.** Wheelhouse informs, it doesn't block. The user always has the final say.

2. **Prose before data fields.** Conviction first, parameters second. The user should know WHY before they set the guardrails of HOW. This also means the data fields can be informed by what the user wrote — and the AI can flag if they don't match.

3. **Per-ticker overrides are explicit.** When a data field deviates from the strategy default, it's visible and flagged. Not as an error — as awareness. "Your strategy says X, this thesis says Y."

4. **The AI review is a conversation, not a score.** Claude doesn't grade the thesis. It asks questions, flags gaps, and affirms good thinking. The user should feel supported, not judged.

5. **Progressive education is woven in, not bolted on.** Every data field has a tooltip. Every question has context. Newer users learn by doing. Experienced users skip what they already know.

6. **This flow creates the foundation for everything that follows.** The thesis is referenced by trade entry (smart nudges), evaluation (thesis vs reality), and AI check-ins (periodic reviews). A strong thesis makes the whole app smarter.
