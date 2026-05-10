# Wheelhouse Strategy Editing Flow

Your strategy is a living document. It was born during onboarding, but it should evolve as you grow as a trader. The strategy editing flow makes that evolution intentional, visible, and reversible.

---

## Entry Points

The strategy view can be reached from three places:

- **Dashboard** → "View Strategy"
- **Evaluation** → "Review Strategy" (often prompted by seeing drift or deviation patterns)
- **Ticker Thesis** → "Check Strategy Alignment" (comparing thesis choices against stated rules)

Each entry point carries different intent. From the dashboard it's a casual check-in. From evaluation it's usually prompted by data — something isn't lining up. From a thesis view it's a specific comparison. The strategy view serves all three.

---

## Strategy View (Read Mode)

The default state when you arrive. Your named strategy, displayed clearly with all its parameters.

- **What you see:**
  - Strategy name at the top
  - All parameters organized by category:
    - Risk profile (delta range, max loss thresholds, assignment comfort)
    - Time preferences (DTE range, trading frequency)
    - Position sizing (max capital per ticker, max number of active wheels)
    - Stock selection criteria (what draws you to a stock)
    - Income goals (monthly/annual targets)
  - Each parameter shows its current value with a tooltip explaining the scale and tradeoffs
  - A subtle indicator showing how long since the last edit — strategies that haven't been reviewed in a while might benefit from a fresh look
  - AI chat icon available for on-demand strategy discussion

- **What you can do:**
  - Edit → enters Edit Mode
  - View History → see past versions of your strategy
  - Chat with Claude → discuss your strategy, ask questions, get feedback
  - Back to wherever you came from

---

## Strategy Editor (Edit Mode)

Where the actual changes happen. Every parameter is editable, and every edit gets context.

### Editing Parameters

- Each parameter is editable inline — tap a value, change it.
- **Smart nudges appear as you edit:**
  - **Impact preview:** "Changing your delta range from 0.15-0.25 to 0.20-0.35 would mean 4 of your last 10 trades that were flagged as deviations would now be within strategy. Is that the point — to align the strategy with your actual behavior?"
  - **Thesis impact:** "3 of your ticker theses have per-ticker delta overrides. Changing the strategy default may affect how those overrides are evaluated."
  - **Historical context:** "Your original delta range was 0.15-0.25, set during onboarding 4 months ago. You've edited it once before, narrowing it to 0.15-0.20 two months ago. This change would widen it beyond your original range."
- **Progressive education tooltips** are available on every parameter, same as during onboarding — explaining what each parameter means, the tradeoffs of different values, and how it connects to the rest of the system.

### Editing Prose

- If the strategy includes any prose sections (like stock selection philosophy or general approach), these are editable as free-form text.
- The AI chat can help here — "I want to refine my stock selection criteria. Can you help me think through it?"

### AI Discussion

- Available via the chat icon while in edit mode.
- Claude has full context: your current strategy, your trade history, your evaluation data, your deviation patterns.
- Useful prompts:
  - "My delta keeps drifting aggressive. Should I update my range or recommit to discipline?"
  - "I've been trading more frequently than my strategy says. Is that working for me?"
  - "Help me think through whether my position sizing rules still make sense."
- The AI might proactively surface observations: "Based on your last quarter, your most profitable trades were in the 0.20-0.30 delta range, even though your strategy says 0.15-0.25. Your evaluation shows consistent deviation toward that range. Updating your strategy to match your behavior might reduce deviation noise and let you focus on other alignment signals."
- As always, the AI reflects and questions — it doesn't direct.

---

## Change Summary (Before Saving)

Before any edits are saved, the user sees a clear summary of what changed.

- **Before/after comparison** for every modified parameter. Side by side, crystal clear.
- **Impact assessment:**
  - How many existing theses will be affected by this change?
  - How many past trades that were flagged as deviations would now be within strategy (or vice versa)?
  - Does this change align the strategy closer to your actual behavior, or is it moving in a new direction?
- **Two options:**
  - **Save** → changes are saved, old version is archived, new version becomes active.
  - **Discard** → nothing changes, back to read mode.

---

## Version History

Every time the strategy is saved, the previous version is archived. Nothing is ever deleted.

- **What you see:** A timeline of strategy versions, each with a date and a summary of what changed.
- **What you can do:**
  - View any past version in full
  - Compare any two versions side by side — seeing exactly what changed and when
  - This is the foundation for the v2/v3 strategy library and comparison features. The architecture supports multiple strategies from the start, even though v1 only has one active strategy with a version history.

### Why Version History Matters

- **Growth tracking:** You can see how your thinking has evolved over time. Your first strategy from onboarding versus your strategy after 6 months of trading — that delta is your growth as a trader.
- **Retrospection:** If a strategy change led to worse performance, you can see exactly when it happened and what changed.
- **Accountability:** It's harder to gaslight yourself when the history is right there. "I've always been conservative" — well, your version history shows you widened your delta range three times in four months.

---

## The Strategy Editing Cycle

Strategy editing is not random — it follows a natural cycle driven by the evaluation layer:

1. **Trade** → enter trades, log deviations with reasons
2. **Evaluate** → weekly reviews and quarterly retros surface patterns
3. **Reflect** → patterns prompt questions. Am I drifting? Is my strategy outdated? Have I grown?
4. **Edit** → update the strategy to reflect who you actually are as a trader
5. **Trade** → now your strategy is accurate, deviations are real deviations, and the evaluation layer gives you cleaner signal

This is the meta-loop of Wheelhouse. The product doesn't just track your strategy — it helps you evolve it.

---

## Design Principles for This Flow

1. **Editing is intentional, not casual.** You don't accidentally change your strategy. There's a clear edit mode, a change summary, and a save/discard decision point.

2. **Every edit gets context.** Smart nudges show the impact of changes before you commit. You know what your edit means for your theses, your past trades, and your evaluation signals.

3. **Nothing is ever deleted.** Every version is archived. The history is sacred — it's the record of your growth as a trader.

4. **The evaluation layer drives editing.** Most strategy edits should come from insights surfaced during weekly reviews or quarterly retros, not random inspiration. The flow supports this by being easily reachable from the evaluation screen.

5. **Strategy should match reality.** If your behavior has consistently diverged from your stated strategy, the right move might be to update the strategy, not to fight your instincts. The AI helps you distinguish between productive growth and undisciplined drift.

6. **Progressive education persists.** Even after onboarding, every parameter still has its tooltip. You're never left guessing what a value means or what the tradeoffs are.
