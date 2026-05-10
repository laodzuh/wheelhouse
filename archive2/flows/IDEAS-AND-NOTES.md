# Wheelhouse — Ideas, Lightbulbs & Future Notes

A running capture of ideas that came up during planning sessions. Not committed scope — just good thinking to come back to.

---

## Onboarding Revisions (Batch Later)
- **Section 6 (Risk & Comfort):** Move the per-ticker assignment comfort question ("how do you feel about owning 100 shares?") out of onboarding and into the **ticker thesis creation flow**. Strategy-level risk questions should stay high-level (drawdown temperament, premium vs accumulation focus, position sizing comfort). The specific "would you own THIS stock" question belongs at the individual ticker level.

- **Section 9 (Existing Positions):** Remove entirely. Don't offer position import during onboarding. Better to land on a clean empty dashboard with an inviting empty state than populate partial/incomplete positions. Revisit later once we know exactly what data a position needs to power the wheel visualization and hero metrics. If it feels light enough at that point, consider adding it back.

- **Section 7 (Time Preferences):** The "sooner/smaller vs longer/bigger premiums" question feels flat and too mechanical. Reframe around patience as a personality trait: "What feels better — seeing frequent small wins come in regularly, or being patient for bigger payoffs less often?" Pair this with the activity level question for higher confidence in DTE translation. Two answers triangulating the same parameter = stronger signal.

- **Section 11 (Strategy Review):** Add the ability to NAME the strategy. Small v1 addition, but unlocks a powerful long-term evolution:
  - **v1:** Name your strategy. Makes it feel real and personal.
  - **v2:** Strategy library. Create new strategies over time as you learn. Old ones archived, not deleted — your growth as a trader is visible.
  - **v3:** Strategy comparison. Which strategy generated better returns, kept you more disciplined, had better thesis hit rates?
  - **v4:** Multi-strategy deployment. Different strategies for different accounts/funds (e.g., conservative in Roth IRA, aggressive in taxable). Same app, different playbooks.
  - Architecture should support this from the start even if v1 only exposes the name field.

---

## Feature Ideas

### Dot/Contract Naming Convention
- Each dot on a wheel ring represents one contract. Dots need enough context for the user to instantly know which contract they're acting on.
- Auto-label each dot with **strike + expiry** (e.g., "AAPL $180 3/28"). This mirrors what the user sees in their brokerage — zero mental translation needed.
- Edge case: if two contracts share the same strike AND expiry AND phase, append "(1 of 2)".
- In the trade entry flow, the user picks a dot visually (tap it on the ring) or from a list of these labels. No abstract IDs.
- The dots ARE the contract management — expressed visually, not as a database concept the user has to think about.

### Marketing / Copy Lines
- **"Auto-import gives you data. Manual entry gives you awareness."** — Use for marketing material. Captures the Wheelhouse philosophy on why manual trade entry is a feature, not a limitation.

### Liability & Legal Review
- **Exhaustive audit needed** of all AI-generated language throughout the product to ensure liability-safe framing. Core principle: Wheelhouse reflects the user's own words and rules back at them — it never advises, recommends, or endorses.
- Key areas to audit:
  - AI Review step in thesis creation (never "affirm" a financial decision — frame as completeness checks)
  - Smart nudges (always anchor to "your strategy says..." or "you said..." — never "you should...")
  - Evaluation insights (surface patterns, don't prescribe actions)
  - Progressive education (teach concepts, don't recommend strategies)
- Persistent disclaimer needed in product: Wheelhouse is an organizational and educational tool, not a financial advisor. All feedback is based solely on the user's own stated rules and inputs.
- Terms of service: standard "not financial advice" language, user is solely responsible for trading decisions.
- **Get a legal review completed before production.**

### Strategy-Aligned Ticker Flagging
- When a user adds a new ticker, Wheelhouse checks if the stock's option chain structurally aligns with their strategy (e.g., expiration frequency, liquidity, price range relative to capital).
- Flags misalignments immediately: "Heads up — this stock only has monthly expirations, but your strategy says you prefer weekly."
- Surfaces this BEFORE the user writes a thesis, so they can make an informed decision about whether to proceed.

### Strategy-Aligned Discovery (v2)
- Not a stock screener. Not "buy this."
- More like: "Based on your strategy preferences (weekly expiries, moderate IV, stocks under $50), here are tickers that structurally fit."
- Filters the universe down to things worth investigating. User still owns the thesis and conviction.
- Passes the decision filter: helps the user honor their strategy, not ledger creep.
- Natural v2 feature that grows directly from the strategy layer.
