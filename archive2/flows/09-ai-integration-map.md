# Wheelhouse AI Integration Map

A complete reference for where the Anthropic API plugs into Wheelhouse, what it needs at each touchpoint, and how the interaction is designed to deliver maximum value at minimal cost.

---

## Core Design Principle

**Most of the AI's value is delivered in single turns, not conversations.**

The AI shows up with a prepared insight, the user reads it and acts. No back-and-forth required. This keeps costs low, keeps the UX fast, and avoids the awkward feeling of a chat that's artificially cut off.

The only true conversational AI interaction is the quarterly retro chat — and that happens four times a year.

---

## Interaction Tiers

Every AI touchpoint in Wheelhouse falls into one of three tiers, each with a different cost and complexity profile.

### Tier 1: Rule-Based (No API Call)
Simple comparisons that don't need language understanding. Pure code logic.

**Cost:** $0.00
**Response time:** Instant

These look and feel like smart nudges but are powered by if/then logic, not the API. Examples:
- Delta out of strategy range → flag it
- Strike above CSP ceiling or below CC floor → flag it
- DTE outside preference range → flag it
- Capital utilization below threshold → nudge
- Cash idle for X days → nudge
- Contract nearing expiry → alert

**Rule of thumb:** If the check can be expressed as "is value X within range Y," it's Tier 1. No API needed.

### Tier 2: Single-Turn AI (One API Call)
The AI receives context, produces a structured response, done. The user interacts with the output (acknowledge, adjust, dismiss) but doesn't reply to the AI in conversation.

**Cost:** ~$0.01-0.10 per interaction
**Response time:** 1-3 seconds

**Model recommendation:** Claude Haiku for simple nudges with prose context. Claude Sonnet for thesis reviews and strategy analysis.

### Tier 3: Conversational AI (Multi-Turn Chat)
A real back-and-forth conversation. Only used in the quarterly retrospective.

**Cost:** ~$0.50-2.00 per session (with $3.00 token budget cap)
**Response time:** 1-3 seconds per turn

**Model recommendation:** Claude Sonnet for depth and nuance.

---

## Touchpoints by Flow

### 1. Onboarding

| Touchpoint | Tier | What It Does | Context Sent to AI |
|------------|------|-------------|-------------------|
| Strategy scaffolding | Tier 2 | Translates conversational answers into strategy parameters | All onboarding answers (experience level, risk temperament, patience style, stock picking criteria) |

**How it works:** After the user completes the onboarding questions, one API call translates their plain-language answers into structured strategy parameters (delta range, DTE preference, etc.). The output is the Strategy Reveal screen. One call, one structured response.

**What the AI returns:** A JSON-structured strategy draft with values for each parameter, plus a brief plain-language summary the user sees on the reveal screen.

---

### 2. Ticker Thesis Creation

| Touchpoint | Tier | What It Does | Context Sent to AI |
|------------|------|-------------|-------------------|
| Strategy alignment check | Tier 1 | Compares ticker characteristics against strategy parameters | None (rule-based) |
| Ticker search alignment cues | Tier 1 | Green/orange indicators on search results | None (rule-based) |
| AI thesis review | Tier 2 | Reviews complete thesis for contradictions, gaps, and tensions | Full thesis (prose + data fields + risk answers), strategy parameters, any misalignment context |

**How the thesis review works:** After the user fills in conviction prose, risk answers, and data fields — but before saving — one API call sends the complete thesis to Claude. The response comes back as structured cards:
- Flags (contradictions or tensions found)
- Questions (gaps the user hasn't addressed)
- Observations (notable aspects of the thesis)

The user interacts with these cards (adjust, acknowledge, dismiss) without typing back to the AI. One call, structured output, no conversation.

**What the AI returns:** A JSON array of `{ type: 'flag' | 'question' | 'observation', message: string, relatedField: string | null }` rendered as cards in the UI.

---

### 3. Trade Entry

| Touchpoint | Tier | What It Does | Context Sent to AI |
|------------|------|-------------|-------------------|
| Strike vs target entry/exit | Tier 1 | Compares strike against thesis targets | None (rule-based) |
| Delta vs strategy/thesis range | Tier 1 | Compares delta against allowed range | None (rule-based) |
| DTE vs preference | Tier 1 | Compares DTE against strategy/thesis | None (rule-based) |
| Premium impact preview | Tier 1 | Calculates impact on effective cost basis | None (rule-based) |
| Prose-aware nudge | Tier 2 | Contextual nudge that references the user's conviction narrative or invalidation signals | Trade details being entered, thesis prose, thesis data fields |

**How prose-aware nudges work:** Most trade entry nudges are Tier 1 — simple range checks. But occasionally a nudge needs to reference the user's prose. For example: "Your thesis says you'd reconsider if the stock drops below $150. It's currently at $152 and you're selling a $145 put." This requires the AI to read the prose and connect it to the trade being entered.

These are triggered only when specific conditions are met (e.g., stock price near thesis invalidation levels, or significant deviation from thesis parameters). Not on every keystroke.

**What the AI returns:** A single nudge string displayed inline near the relevant field.

---

### 4. Evaluation — Weekly Review

| Touchpoint | Tier | What It Does | Context Sent to AI |
|------------|------|-------------|-------------------|
| Strategy adherence summary | Tier 1 | Counts trades within/outside strategy parameters | None (rule-based) |
| Thesis health indicators | Tier 1 | Per-ticker compliance flags | None (rule-based) |
| Weekly AI insight | Tier 2 | Narrative summary of the week's trading | This week's trade events, deviations with reasons, strategy parameters, active thesis summaries |

**How the weekly insight works:** One API call when the user opens the evaluation screen (or when the weekly view loads). Claude receives the week's data and returns a brief narrative summary — 2-4 paragraphs covering what went well, what drifted, and what deserves attention.

**What the AI returns:** A markdown-formatted narrative summary, plus optionally a `{ attentionItems: [{ ticker: string, reason: string }] }` array for actionable follow-ups.

---

### 5. Evaluation — Quarterly Retrospective

| Touchpoint | Tier | What It Does | Context Sent to AI |
|------------|------|-------------|-------------------|
| Quarterly analysis | Tier 2 | Deep pre-generated analysis of the quarter | 3 months of trade events, all deviations with reasons, all active theses, strategy version history, income goal progress |
| Retro chat | Tier 3 | Open-ended conversation about patterns, growth, strategy evolution | Same as above, plus the pre-generated analysis, plus ongoing conversation context |

**How the quarterly retro works in two phases:**

**Phase 1 (pre-generated, Tier 2):** Before the user even opens the retro, one large API call generates the quarterly analysis. This is the AI's "prepared remarks" — a deep narrative covering trends, deviation patterns, thesis performance, strategy adherence, income goal pace, and growth observations. This loads when the user opens the retro view.

**Phase 2 (conversational, Tier 3):** Below the pre-generated analysis, there's a chat interface. The user can ask questions, dig deeper, challenge the analysis, or discuss strategy changes. This is the only place in the entire app with a true back-and-forth chat.

**Token budget:** $3.00 per quarterly retro session. At Sonnet pricing this allows roughly 200,000+ output tokens — far more than any realistic conversation. The cap exists for operational safety, not to limit the user. If somehow reached, the message is friendly: "You've had a really deep session — we've hit the conversation limit for this retro. Your insights so far have been saved."

**What the AI returns:**
- Phase 1: A structured report with sections (performance summary, deviation analysis, thesis health, strategy alignment, growth observations, recommendations for review)
- Phase 2: Conversational responses in the chat

---

### 6. Strategy Editing

| Touchpoint | Tier | What It Does | Context Sent to AI |
|------------|------|-------------|-------------------|
| Impact preview | Tier 1 | Shows how many trades/deviations are affected by a change | None (rule-based) |
| Strategy review | Tier 2 | AI provides observations when user requests AI review from strategy editor | Current strategy, proposed changes, trade history summary, deviation patterns |

**How strategy review works:** The user taps the AI review icon from the strategy editor. One API call sends the current strategy context and returns observations — "Based on your last quarter, your most profitable trades were in the 0.20-0.30 delta range, even though your strategy says 0.15-0.25." The user reads, reflects, and adjusts. Not a conversation — a single informed perspective.

---

### 7. Thesis Check-Ins (Periodic)

| Touchpoint | Tier | What It Does | Context Sent to AI |
|------------|------|-------------|-------------------|
| Periodic thesis review prompt | Tier 2 | AI reviews whether a thesis still holds based on recent trading data | Thesis prose + data fields, recent trade events for this ticker, deviation history, time since thesis was written |

**How it works:** Triggered by time (thesis hasn't been reviewed in X weeks) or by data (basis erosion has stalled, deviation pattern on this ticker, etc.). One API call reviews the thesis against recent reality and generates a prompt: "You wrote your AAPL thesis 4 months ago. Your basis has stalled for 6 weeks. Your thesis said you'd reconsider if that happened. Time to revisit?"

Surfaced as a smart nudge on the dashboard or the Ticker Thesis View. Not a conversation — a single prompt the user can act on or dismiss.

---

## Cost Summary

### Per-User Monthly Estimate (Typical Active User)

| Category | Frequency | Tier | Est. Cost |
|----------|-----------|------|-----------|
| Onboarding | Once (amortized) | Tier 2 | ~$0.01 |
| Thesis creation/review | 1-2 per month | Tier 2 | ~$0.05-0.10 |
| Prose-aware trade nudges | 2-5 per month | Tier 2 | ~$0.02-0.05 |
| Weekly insights | 4 per month | Tier 2 | ~$0.10-0.20 |
| Quarterly retro (amortized) | 0.33 per month | Tier 2+3 | ~$0.15-0.50 |
| Strategy review | 0-1 per month | Tier 2 | ~$0.00-0.05 |
| Thesis check-in prompts | 1-3 per month | Tier 2 | ~$0.02-0.05 |
| **Total estimated** | | | **~$0.35-0.95/month** |

Rule-based (Tier 1) interactions are not listed because they cost $0.

### Cost Optimization Strategies

1. **Rule-based first, AI second.** Every nudge should be evaluated: can this be a simple comparison? If yes, no API call needed.
2. **Right model for the job.** Use Haiku for simple prose-aware nudges. Use Sonnet for thesis reviews, weekly insights, and quarterly retros.
3. **Cache strategy context.** Don't re-send the full strategy with every API call. Send it once per session and reference it.
4. **Batch where possible.** The weekly insight is one call that covers the whole week, not separate calls per trade.
5. **Trigger-based, not polling.** Thesis check-ins fire when conditions are met, not on a timer.

---

## What the AI Never Does

Across all touchpoints, regardless of tier:

- **Never recommends specific trades, stocks, or strategies.** It reflects, questions, and surfaces — it doesn't direct.
- **Never grades or scores the user.** It shows patterns and gaps — the user decides what they mean.
- **Never uses language like "you should" or "I recommend."** Always "your strategy says," "your thesis says," "your data shows."
- **Never provides financial advice.** Wheelhouse is an organizational and educational tool. Full liability audit pending before production (see IDEAS-AND-NOTES.md).

---

## Technical Implementation Notes

1. **API key management:** The Anthropic API key should be managed server-side, not embedded in the client. Even for local-first architecture, API calls should route through a thin backend or serverless function.

2. **Structured output format:** Use Claude's structured output capabilities (JSON mode or tool use) for Tier 2 interactions to ensure responses parse cleanly into UI components.

3. **Context window management:** The quarterly retro is the most context-heavy call. 3 months of trades + all theses + strategy history could approach 50,000+ tokens of input. Consider summarizing older trade events rather than sending raw data.

4. **Token budget enforcement:** Track token usage per session for the quarterly retro chat. Surface remaining budget gracefully in the UI if the user approaches the cap.

5. **Error handling:** If an API call fails, the app should degrade gracefully. Tier 1 nudges still work (no API needed). Tier 2 insights show a "couldn't generate insight right now" placeholder. The quarterly retro chat shows a retry option.

6. **Latency:** Tier 2 calls should feel fast (1-3 seconds). Pre-generate the quarterly analysis in the background so it's ready when the user opens the retro view.
